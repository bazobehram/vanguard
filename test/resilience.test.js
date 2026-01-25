import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VanguardScanner } from '../lib/services/scanner.js';
import * as scannerModule from '../lib/services/scanner.js';

describe('VanguardScanner Resilience', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('should retry on 429 errors with cooldown', async () => {
        const scanner = new VanguardScanner();
        const mockScan = vi.spyOn(scanner, 'scanWithGemini');

        // Mock a 429 failure then success
        mockScan
            .mockRejectedValueOnce(new Error('[429] Too Many Requests'))
            .mockResolvedValueOnce({ verdict: 'SAFE', risk_score: 0, threats: [], summary: 'Fixed!' });

        // Pass a dummy spinner to trigger the cooldown logging logic
        const dummySpinner = { text: '' };

        const scanPromise = scanner.scanWithRetry('test.js', 'content', dummySpinner);

        // Fast-forward through the 30s cooldown
        // The loop calls sleep(1000) thirty times
        for (let i = 0; i < 35; i++) {
            await vi.advanceTimersByTimeAsync(1000);
        }

        const result = await scanPromise;

        expect(mockScan).toHaveBeenCalledTimes(2);
        expect(result.verdict).toBe('SAFE');
    });

    it('should retry on Quota exceeded errors', async () => {
        const scanner = new VanguardScanner();
        const mockScan = vi.spyOn(scanner, 'scanWithGemini');

        mockScan
            .mockRejectedValueOnce(new Error('Quota exceeded for metric...'))
            .mockResolvedValueOnce({ verdict: 'SAFE', risk_score: 0, threats: [], summary: 'Fixed!' });

        const scanPromise = scanner.scanWithRetry('test.js', 'content', null);

        // Fast-forward 30s
        await vi.advanceTimersByTimeAsync(31000);

        const result = await scanPromise;

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
