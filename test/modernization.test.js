import { describe, it, expect, vi } from 'vitest';
import { VanguardScanner } from '../lib/services/scanner.js';
import { showAlert } from '../lib/utils/ui.js';
import chalk from 'chalk';
import path from 'path';

describe('Vanguard Modernization Suite', () => {
    const scanner = new VanguardScanner();

    describe('File Categorization (isHighRisk)', () => {
        it('should identify package.json as high risk', () => {
            expect(scanner.isHighRisk('package.json')).toBe(true);
            expect(scanner.isHighRisk('./sub/package.json')).toBe(true);
        });

        it('should identify lock files as high risk', () => {
            expect(scanner.isHighRisk('package-lock.json')).toBe(true);
            expect(scanner.isHighRisk('yarn.lock')).toBe(true);
            expect(scanner.isHighRisk('pnpm-lock.yaml')).toBe(true);
        });

        it('should identify configuration files as high risk', () => {
            expect(scanner.isHighRisk('tsconfig.json')).toBe(true);
            expect(scanner.isHighRisk('.env')).toBe(true);
        });

        it('should identify entry points as high risk', () => {
            expect(scanner.isHighRisk('index.js')).toBe(true);
            expect(scanner.isHighRisk('main.js')).toBe(true);
            expect(scanner.isHighRisk('app.js')).toBe(true);
        });

        it('should identify lifecycle scripts as high risk', () => {
            expect(scanner.isHighRisk('postinstall.js')).toBe(true);
            expect(scanner.isHighRisk('preinstall.js')).toBe(true);
        });

        it('should identify CI/CD and IDE configs as high risk', () => {
            expect(scanner.isHighRisk('.github/workflows/deploy.yml')).toBe(true);
            expect(scanner.isHighRisk('.vscode/settings.json')).toBe(true);
        });

        it('should NOT identify regular source files as high risk', () => {
            expect(scanner.isHighRisk('src/components/Button.jsx')).toBe(false);
            expect(scanner.isHighRisk('lib/utils/helper.ts')).toBe(false);
        });
    });

    describe('Binary Exclusions (shouldSkip)', () => {
        it('should skip media and binary assets', () => {
            expect(scanner.shouldSkip('favicon.ico', { size: 1024 })).toBe(true);
            expect(scanner.shouldSkip('hero.webp', { size: 1024 })).toBe(true);
            expect(scanner.shouldSkip('icon.svg', { size: 1024 })).toBe(true);
            expect(scanner.shouldSkip('font.woff2', { size: 1024 })).toBe(true);
        });

        it('should skip large files', () => {
            expect(scanner.shouldSkip('data.json', { size: 200 * 1024 })).toBe(true);
        });

        it('should skip node_modules', () => {
            expect(scanner.shouldSkip('node_modules/lodash/index.js', { size: 1024 })).toBe(true);
        });

        it('should NOT skip small code files', () => {
            expect(scanner.shouldSkip('src/index.js', { size: 1024 })).toBe(false);
        });
    });

    describe('UI Rendering Robustness (showAlert)', () => {
        it('should handle malformed threat reasons without crashing or showing [object Object]', () => {
            const consoleSpy = vi.spyOn(console, 'log');

            const analysis = {
                verdict: 'BLOCK',
                risk_score: 90,
                threats: [
                    { file: 'malicious.js', threat: 'HACK', reason: undefined }, // Missing reason
                    { file: 'unknown.js', threat: 'WEIRD' }, // Missing reason property
                    'Just a string threat' // String instead of object
                ],
                summary: { key: 'value' } // Object summary (hallucinated by AI)
            };

            // This should not throw
            showAlert(analysis);

            const combinedOutput = consoleSpy.mock.calls.map(call => call[0]).join('\n');

            // Verify no [object Object] is visible
            expect(combinedOutput).not.toContain('[object Object]');

            // Verify fallback strings are used
            expect(combinedOutput).toContain('Potential threat detected without specific details.');
            expect(combinedOutput).toContain('Just a string threat');
            expect(combinedOutput).toContain('"key": "value"'); // Object summary stringified

            consoleSpy.mockRestore();
        });
    });
});
