#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs/promises';
import fetch from 'node-fetch';
import { showBanner, showAlert, createSpinner, showFooter } from '../lib/ui.js';
import { VanguardScanner } from '../lib/scanner.js';
import { fetchUpstream, getUpstreamDiff, mergeUpstream, createSandboxClone, finalizeClone, cleanupSandbox } from '../lib/git.js';
import config from '../lib/config.js';

const program = new Command();

async function runConfigWizard() {
    showBanner();
    console.log('🛰️  Vanguard Configuration Wizard\n');

    const { providerSelection } = await inquirer.prompt([{
        type: 'list',
        name: 'providerSelection',
        message: 'Select AI Provider:',
        choices: [
            { name: 'Google Gemini 2.0 (Cloud - Fast & Smart)', value: 'gemini' },
            { name: 'Local Ollama (Private - Offline)', value: 'ollama' }
        ]
    }]);

    config.set('AI_PROVIDER', providerSelection);

    if (providerSelection === 'gemini') {
        const { apiKey } = await inquirer.prompt([{
            type: 'password',
            name: 'apiKey',
            message: 'Enter your Gemini API Key:',
            default: config.get('GEMINI_KEY'),
            validate: (val) => val.length > 0 || 'Key is required'
        }]);
        config.set('GEMINI_KEY', apiKey);
        console.log('✅ Gemini 2.0 configured and saved.');
    } else {
        const spinner = createSpinner('🔍 Detecting local Ollama models...').start();
        try {
            const res = await fetch(`${config.get('OLLAMA_URL')}/api/tags`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            spinner.stop();

            const models = data.models.map(m => m.name);
            if (models.length === 0) {
                console.log('❌ No local models found. Run "ollama pull qwen2.5-coder" first.');
                return;
            }

            const { model } = await inquirer.prompt([{
                type: 'list',
                name: 'model',
                message: 'Select your preferred local model:',
                choices: models,
                default: config.get('OLLAMA_MODEL')
            }]);
            config.set('OLLAMA_MODEL', model);
            console.log(`✅ Ollama configured with model: ${model}`);
        } catch (e) {
            spinner.fail('❌ Ollama not detected. Run "ollama serve" first.');
        }
    }
}

async function handleAction(actionName, logicFn) {
    showBanner();

    const { proceed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'proceed',
        message: `🛡️ Vanguard detected a Git ${actionName} operation. Scan for security threats?`,
        default: true
    }]);

    if (!proceed) {
        console.log('⚠️  Skipping Vanguard protection. Danger ahead!');
        return;
    }

    // Check if configured
    if (config.get('AI_PROVIDER') === 'gemini' && !config.get('GEMINI_KEY')) {
        console.log('❌ Gemini not configured.');
        await runConfigWizard();
    } else if (config.get('AI_PROVIDER') === 'ollama' && !config.get('OLLAMA_MODEL')) {
        console.log('❌ Ollama not configured.');
        await runConfigWizard();
    }

    await logicFn();
    showFooter();
}

program
    .name('vanguard')
    .description('The Ultimate AI Supply Chain Firewall for Git')
    .version('3.0.0');

program
    .command('config')
    .description('Launch the AI Configuration Wizard')
    .action(runConfigWizard);

program
    .command('pull')
    .description('Safely pull and scan changes')
    .option('-f, --force', 'Force merge even if threats are detected')
    .action(async (options) => {
        await handleAction('pull', async () => {
            const scanner = new VanguardScanner();
            const spinner = createSpinner(`🚀 ${config.get('AI_PROVIDER').toUpperCase()} is analyzing diff...`).start();

            try {
                await fetchUpstream();
                const diff = await getUpstreamDiff();

                if (!diff || diff.trim() === '') {
                    spinner.succeed('✅ Simple pull: No code changes to analyze.');
                    await mergeUpstream();
                    return;
                }

                const analysis = await scanner.scan(diff);
                spinner.stop();

                showAlert(analysis);

                if (analysis.verdict === 'SAFE') {
                    console.log('✅ Validation successful. Merging...');
                    await mergeUpstream();
                } else {
                    const { force } = options.force ? { force: true } : await inquirer.prompt([{
                        type: 'confirm',
                        name: 'force',
                        message: '⚠️ BLOCK VERDICT. Force override merge?',
                        default: false
                    }]);

                    if (force) {
                        await mergeUpstream();
                        console.log('🎉 Forced merge completed.');
                    } else {
                        console.log('❌ Operation aborted to protect your codebase.');
                    }
                }
            } catch (error) {
                spinner.fail(`❌ AI SCAN ERROR: ${error.message}`);
            }
        });
    });

program
    .command('clone')
    .description('Safely clone into sandbox and scan')
    .argument('<url>', 'Repo URL')
    .argument('[directory]', 'Target directory')
    .action(async (url, directory) => {
        await handleAction('clone', async () => {
            const scanner = new VanguardScanner();
            const targetPath = directory || path.basename(url, '.git');
            const spinner = createSpinner('⬇️  Isolating into secure sandbox...').start();
            let tempPath = '';

            try {
                tempPath = await createSandboxClone(url);

                // Scan a snapshot of the repo
                const files = await fs.readdir(tempPath);
                const pkgContent = await fs.readFile(path.join(tempPath, 'package.json'), 'utf-8').catch(() => '');
                const scanContent = `Repo: ${url}\nFiles: ${files.join(', ')}\n\nPackage.json:\n${pkgContent}`;

                spinner.text = `📡 ${config.get('AI_PROVIDER').toUpperCase()} is deep scanning files...`;
                const analysis = await scanner.scan(scanContent);
                spinner.stop();

                showAlert(analysis);

                if (analysis.verdict === 'SAFE') {
                    console.log(`✅ Safe. Finalizing clone to ${targetPath}...`);
                    await finalizeClone(tempPath, targetPath);
                } else {
                    const { proceed } = await inquirer.prompt([{
                        type: 'confirm',
                        name: 'proceed',
                        message: '⚠️ SECURITY WARNING. Proceed with clone?',
                        default: false
                    }]);

                    if (proceed) {
                        await finalizeClone(tempPath, targetPath);
                    } else {
                        await cleanupSandbox(tempPath);
                        console.log('🗑️  Sandbox destroyed. Safety first.');
                    }
                }
            } catch (error) {
                spinner.fail(`❌ FAILURE: ${error.message}`);
                if (tempPath) await cleanupSandbox(tempPath);
            }
        });
    });

program.parse(process.argv);
