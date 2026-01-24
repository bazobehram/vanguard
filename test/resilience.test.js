import { describe, it, expect, vi } from 'vitest';
import { VanguardScanner, sleep } from '../lib/services/scanner.js';

// Global mock for sleep to speed up tests
vi.mock('../lib/services/scanner.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        sleep: vi.fn(() => Promise.resolve()),
    };
});

describe('VanguardScanner Resilience', () => {
    it('should retry on 429 errors with cooldown', async () => {
        const scanner = new VanguardScanner();
        // Force mock the internal sleep for this instance
        vi.spyOn(global, 'setTimeout').mockImplementation((fn) => fn());

        const mockScan = vi.spyOn(scanner, 'scanWithGemini');

        mockScan
            .mockRejectedValueOnce(new Error('[429] Too Many Requests'))
            .mockResolvedValueOnce({ verdict: 'SAFE', risk_score: 0, threats: [], summary: 'Fixed!' });

        const result = await scanner.scanWithRetry('test.js', 'content', null);

        expect(mockScan).toHaveBeenCalledTimes(2);
        expect(result.verdict).toBe('SAFE');
    });

    it('should retry immediately on 500/503 errors', async () => {
        const scanner = new VanguardScanner();
        const mockScan = vi.spyOn(scanner, 'scanWithGemini');

        mockScan
            .mockRejectedValueOnce(new Error('Internal Server Error (500)'))
            .mockResolvedValueOnce({ verdict: 'SAFE', risk_score: 0, threats: [], summary: 'Fixed!' });

        const result = await scanner.scanWithRetry('test.js', 'content', null);

        expect(mockScan).toHaveBeenCalledTimes(2);
        expect(result.verdict).toBe('SAFE');
    });
});
