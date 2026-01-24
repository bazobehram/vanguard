import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import nock from 'nock';
import { VanguardScanner } from '../lib/services/scanner.js';
import { IntelligenceEngine } from '../lib/services/intelligence.js';
import config from '../lib/utils/config.js';

describe('VanguardScanner - Hybrid Intelligence Audit', () => {
  let scanner;
  const maliciousCode = '// Vulnerable code\nprocess.env.AWS_SECRET';
  const cleanCode = 'console.log("Hello World");';

  beforeAll(() => {
    config.set('AI_PROVIDER', 'gemini');
    config.set('GEMINI_KEY', 'test-key');
  });

  beforeEach(() => {
    scanner = new VanguardScanner();
    nock.cleanAll();
  });

  it('should detect and BLOCK malicious code patterns', async () => {
    // 1. Mock GitHub Threat DB fetch
    nock('https://raw.githubusercontent.com')
      .get('/bazob/vanguard-db/main/latest_threats.json')
      .reply(200, { ai_instructions: ['Look for variable exfiltration'] });

    // 2. Mock Gemini API response
    nock('https://generativelanguage.googleapis.com')
      .post((uri) => uri.includes('generateContent'))
      .reply(200, {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    verdict: 'BLOCK',
                    risk_score: 95,
                    threats: [
                      {
                        file: 'test.js',
                        threat: 'Secret Exfiltration',
                        reason: 'Hardcoded secret',
                      },
                    ],
                    summary: 'Malicious pattern found during audit.',
                  }),
                },
              ],
            },
          },
        ],
      });

    const result = await scanner.scan('test.js', maliciousCode);

    expect(result.verdict).toBe('BLOCK');
    expect(result.risk_score).toBe(95);
    expect(result.threats[0].threat).toBe('Secret Exfiltration');
  });

  it('should treat clean code as SAFE', async () => {
    nock('https://raw.githubusercontent.com')
      .get(/vanguard-db/)
      .reply(200, { ai_instructions: [] });

    nock('https://generativelanguage.googleapis.com')
      .post((uri) => uri.includes('generateContent'))
      .reply(200, {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    verdict: 'SAFE',
                    risk_score: 0,
                    threats: [],
                    summary: 'No threats found.',
                  }),
                },
              ],
            },
          },
        ],
      });

    const result = await scanner.scan('clean.js', cleanCode);
    expect(result.verdict).toBe('SAFE');
    expect(result.risk_score).toBe(0);
  });

  it('should degrade gracefully if GitHub rules are offline', async () => {
    // Mock 404 for GitHub
    nock('https://raw.githubusercontent.com')
      .get(/vanguard-db/)
      .reply(404);

    nock('https://generativelanguage.googleapis.com')
      .post((uri) => uri.includes('generateContent'))
      .reply(200, {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({ verdict: 'SAFE', risk_score: 0 }),
                },
              ],
            },
          },
        ],
      });

    // Should not throw
    const result = await scanner.scan('clean.js', cleanCode);
    expect(result).toBeDefined();
    expect(result.verdict).toBe('SAFE');
  });

  it('should integrate OSV.dev results into the audit', async () => {
    const pkgJson = JSON.stringify({ dependencies: { 'vulnerable-pkg': '1.0.0' } });

    // Mock OSV
    nock('https://api.osv.dev')
      .post('/v1/querybatch')
      .reply(200, {
        results: [
          {
            vulns: [{ id: 'CVE-123', summary: 'Critical RCE' }],
          },
        ],
      });

    // Mock GitHub rules
    nock('https://raw.githubusercontent.com')
      .get(/vanguard-db/)
      .reply(200, { ai_instructions: [] });

    const intel = new IntelligenceEngine();
    const context = await intel.sync(pkgJson);

    expect(context).toContain('CVE-123');

    const scannerWithIntel = new VanguardScanner(null, context);

    // Mock AI
    nock('https://generativelanguage.googleapis.com')
      .post((uri) => uri.includes('generateContent'))
      .reply(200, {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    verdict: 'BLOCK',
                    risk_score: 100,
                    summary: 'Dependency has critical vulnerability CVE-123',
                  }),
                },
              ],
            },
          },
        ],
      });

    const result = await scannerWithIntel.scan('clean.js', cleanCode);
    expect(result.verdict).toBe('BLOCK');
    expect(result.summary).toContain('CVE-123');
  });
});
