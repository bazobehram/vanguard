import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { createSpinner } from '../utils/spinner.js';
import { showAlert } from '../utils/ui.js';
import { VanguardScanner } from '../services/scanner.js';
import { IntelligenceEngine } from '../services/intelligence.js';
import { CacheManager } from '../utils/cache.js';
import { walkProject } from '../utils/walker.js';
import {
    fetchUpstream,
    getUpstreamDiff,
    mergeUpstream,
    createSandboxClone,
    finalizeClone,
    cleanupSandbox,
} from '../services/git.js';

export async function handlePull(cmdOptions, programOptions) {
    if (programOptions.clearCache) CacheManager.clear();

    const intel = new IntelligenceEngine(programOptions.verbose);
    const spinner = createSpinner('🚀 Syncing intelligence & probing connections...').start();

    const pkgContent = await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8').catch(() => null);
    const context = await intel.sync(pkgContent);

    spinner.text = '🔍 Auditing diff for supply chain threats...';
    await fetchUpstream();
    const diff = await getUpstreamDiff();

    if (!diff || diff.trim() === '') {
        spinner.succeed('✅ No upstream changes to audit.');
        await mergeUpstream();
        return;
    }

    const scanner = new VanguardScanner(programOptions.model, context);
    let analysis;
    try {
        analysis = await scanner.scan('git_diff', diff, spinner);
    } catch (err) {
        if (err.message === 'CRITICAL_AUTH_FAILURE') {
            process.exitCode = 1;
            return;
        }
        let msg = err.message;
        if (msg.includes('[GoogleGenerativeAI Error]')) {
            msg = msg.split('[')[0].trim();
            if (msg.includes('400')) msg = 'Invalid API Request (400). Check configuration.';
            else if (msg.length > 100) msg = 'AI Service Error (Check connection/quota)';
        }
        spinner.fail(`AI Audit Failed: ${msg}`);
        console.log(chalk.yellow('\n💡 Tip: You might be rate-limited. Try again in 60s or run "vanguard config" to switch to local Ollama.'));
        return;
    }
    spinner.stop();

    showAlert(analysis);

    if (analysis.verdict === 'SAFE') {
        console.log('✅ Integrity verified. Merging changes.');
        await mergeUpstream();
    } else {
        const { force } = cmdOptions.force
            ? { force: true }
            : await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'force',
                    message: '⚠️ BLOCK VERDICT. Force override merge?',
                    default: false,
                },
            ]);
        if (force) {
            await mergeUpstream();
            console.log('🎉 Forced merge completed.');
        } else {
            console.log('❌ Operation aborted to protect your codebase.');
        }
    }
}

export async function handleClone(url, directory, programOptions) {
    const targetPath = directory || path.basename(url, '.git');

    const intel = new IntelligenceEngine(programOptions.verbose);
    const spinner = createSpinner('⬇️  Isolating repository in sandbox...').start();

    const tempPath = await createSandboxClone(url);
    spinner.text = '🔄 Building intelligence & dependency map...';

    const pkgContent = await fs.readFile(path.join(tempPath, 'package.json'), 'utf-8').catch(() => null);
    const context = await intel.sync(pkgContent);

    const files = await walkProject(tempPath);
    spinner.stop();

    console.log(chalk.cyan(`\n📑 Batch Audit: ${files.length} files identified.`));

    const scanner = new VanguardScanner(programOptions.model, context);
    let finalVerdict = 'SAFE';
    let allThreats = [];
    let cachedCount = 0;
    let skippedCount = 0;

    const scanSpinner = createSpinner(`🧠 Auditing ${files.length} files...`).start();

    for (const file of files) {
        const stats = await fs.stat(file);

        // Enterprise Filtering
        if (scanner.shouldSkip(file, stats)) {
            skippedCount++;
            continue;
        }

        const content = await fs.readFile(file, 'utf-8').catch(() => '');
        const cached = CacheManager.check(file, content);

        if (cached) {
            cachedCount++;
            continue;
        }

        try {
            const result = await scanner.scan(file, content, scanSpinner);
            if (result.verdict === 'BLOCK') {
                finalVerdict = 'BLOCK';
                allThreats.push(
                    ...result.threats.map((t) => ({ ...t, file: path.relative(tempPath, file) }))
                );
            } else {
                CacheManager.save(file, content, 'SAFE');
            }
        } catch (err) {
            if (err.message === 'CRITICAL_AUTH_FAILURE') {
                await cleanupSandbox(tempPath);
                process.exitCode = 1;
                return;
            }
            let msg = err.message;
            // Clean up Google's noisy JSON error if it slipped through
            if (msg.includes('[GoogleGenerativeAI Error]')) {
                msg = msg.split('[')[0].trim(); // Take the first part or default to simple text
                if (msg.includes('400')) msg = 'Invalid API Request (400). Check configuration.';
                else if (msg.length > 100) msg = 'AI Service Error (Check connection/quota)';
            }

            scanSpinner.fail(`Audit Interrupted: ${msg}`);
            console.log(chalk.yellow('\n⚠️  Service Error. Part of the codebase remains unverified.'));
            await cleanupSandbox(tempPath);
            return;
        }
    }

    scanSpinner.succeed(`Audit Complete: ${files.length} identified (${cachedCount} cached, ${skippedCount} skipped).`);

    if (finalVerdict === 'BLOCK') {
        showAlert({
            verdict: 'BLOCK',
            risk_score: 99,
            threats: allThreats,
            summary: 'Enterprise Deep Audit identified multiple high-risk vectors.',
        });
        await cleanupSandbox(tempPath);
        console.log(chalk.red.bold('\n🛡️ Malware Detected! Clone aborted. Your disk is safe.'));
    } else {
        console.log(chalk.green(`\n✅ Deep Audit Passed. Finalizing clone to ${targetPath}...`));
        await finalizeClone(tempPath, targetPath);
    }
}
