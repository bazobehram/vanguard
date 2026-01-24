import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../utils/config.js';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import pLimit from 'p-limit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THREATS_PATH = path.join(__dirname, '../threats.json');

const limit = pLimit(3); // Enterprise concurrency limit: 3 files at a time

export class VanguardScanner {
  constructor(modelOverride, intelligenceContext = '') {
    this.provider = config.get('AI_PROVIDER');
    this.modelOverride = modelOverride;
    this.intelligenceContext = intelligenceContext;
  }

  /**
   * Enterprise Filtering Logic: Skip binaries, images, and massive files.
   */
  shouldSkip(filePath, stats) {
    const ext = path.extname(filePath).toLowerCase();
    const binaryExtensions = [
      '.exe',
      '.dll',
      '.so',
      '.bin',
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.pdf',
      '.zip',
      '.gz',
    ];

    if (binaryExtensions.includes(ext)) return true;
    if (stats.size > 100 * 1024) return true; // 100KB limit
    if (filePath.includes('node_modules')) return true;

    return false;
  }

  async getSystemInstruction() {
    const threatsData = await fs.readFile(THREATS_PATH, 'utf-8');
    const threats = JSON.parse(threatsData);

    const categoriesListing = threats
      .map((t, i) => `${i + 1}. **${t.name}:** ${t.description}`)
      .join('\n');

    return `
You are a Senior Security Architect & Auditor. YOUR MISSION: Prevent Supply Chain Attacks.
Analyze the provided code/diff with extreme scrutiny.

YOU MUST BLOCK IF YOU DETECT ANY OF THESE CATEGORIES:
${categoriesListing}

${this.intelligenceContext}

TASK: Combine the code analysis with the latest intelligence and vulnerability data above.
If OSV reports a critical vulnerability or the remote rules flag a new pattern, YOU MUST VERDICT: BLOCK.

JSON OUTPUT RULES:
- risk_score: 0-100 (Be aggressive).
- verdict: "BLOCK" (if risk found) or "SAFE".
- threats: Array of objects: { "file": "filename", "line": number, "threat": "category", "reason": "why" }
- summary: Clear high-level explanation for a developer.

RESPONSE FORMAT (JSON ONLY):
{ "risk_score": 95, "verdict": "BLOCK", "threats": [{ "file": "lib/utils.js", "line": 42, "threat": "Secret Exfiltration", "reason": "Accesses .env and sends to remote server." }], "summary": "Critical vulnerability found." }
`;
  }

  async scan(filePath, content) {
    return limit(() => this.scanWithRetry(filePath, content));
  }

  async scanWithRetry(filePath, content, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        if (this.provider === 'gemini') {
          return await this.scanWithGemini(content);
        } else {
          return await this.scanWithOllama(content);
        }
      } catch (error) {
        const isRateLimit =
          error.message.includes('429') || error.message.includes('Too Many Requests');
        if (isRateLimit && i < retries - 1) {
          const delay = Math.pow(2, i) * 1000;
          if (config.get('VERBOSE'))
            console.log(chalk.yellow(`  ⚠ Rate limited. Retrying in ${delay}ms...`));
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }
        throw error;
      }
    }
  }

  async scanWithGemini(content) {
    const apiKey = config.get('GEMINI_KEY');
    if (!apiKey) throw new Error('Gemini API Key missing. Run "vanguard config"');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const instruction = await this.getSystemInstruction();

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `${instruction}\n\nFILE CONTENT:\n${content}` }] },
      ],
    });

    const response = await result.response;
    return this.parseResponse(response.text());
  }

  async scanWithOllama(content) {
    const model = this.modelOverride || config.get('OLLAMA_MODEL');
    const url = `${config.get('OLLAMA_URL')}/api/generate`;
    const instruction = await this.getSystemInstruction();

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: `${instruction}\n\nFILE CONTENT:\n${content}`,
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
    const data = await response.json();
    return this.parseResponse(data.response);
  }

  parseResponse(text) {
    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('No JSON object found');
      return JSON.parse(text.substring(start, end + 1));
    } catch (e) {
      throw new Error(`Invalid AI JSON format: ${e.message}`);
    }
  }
}
