#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { runConfigWizard } from '../lib/commands/config.js';
import { runIntegrate } from '../lib/commands/integrate.js';
import { handlePull, handleClone } from '../lib/commands/scan.js';
import { showBanner, showFooter } from '../lib/utils/ui.js';
import config from '../lib/utils/config.js';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const program = new Command();

async function handleAction(actionName, logicFn) {
    const isConfigured =
        (config.get('AI_PROVIDER') === 'gemini' && config.get('GEMINI_KEY')) ||
        (config.get('AI_PROVIDER') === 'ollama' && config.get('OLLAMA_MODEL'));

    if (!isConfigured) {
        // showBanner();
        console.log(chalk.yellow(`🛡️ Vanguard V3 is not fully configured. Starting setup...\n`));
        await runConfigWizard();
        // After wizard, check again
        if (!config.get('GEMINI_KEY') && config.get('AI_PROVIDER') === 'gemini') {
            console.log(chalk.red('\n❌ Configuration incomplete. Please provide a Gemini API key.'));
            return;
        }
    }

    // showBanner();
    const options = program.opts();
    config.set('VERBOSE', !!options.verbose);

    const { proceed } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'proceed',
            message: `🛡️ Vanguard Enterprise Edition detected a ${actionName}. Activate Hybrid Intelligence?`,
            default: true,
        },
    ]);

    if (!proceed) {
        console.log(chalk.yellow('⚠️  Skipping protection. Proceeding at your own risk.'));

        // If the user skips Vanguard, we must execute the original git command
        if (actionName === 'CLONE') {
            // Reconstruct arguments
            const args = process.argv.slice(3); // Remove node, bin, clone
            // This is a simplified fallback. In a real integration, we'd want to execSync/spawn 
            // "git clone ..." but since we are inside a node process wrapping git, 
            // we can suggest the user run usage logic or attempt spawn.

            // However, for the 'integrate' shell function, if 'vanguard' exits with 0 and no output,
            // the shell function expects to be done.
            // The Shell Integration logic:
            // if [ "$1" = "clone" ] ... vanguard clone ... else git clone ...

            // If we return here, Vanguard finishes. The shell wrapper won't run `git clone` because 
            // it delegated the job to `vanguard clone`.

            // SO: We must actually perform the git clone ourselves now, or exit with a specific code 
            // that tells the shell wrapper to fallback (complex).

            // Easiest path: Spawn 'git' directly here.
            const { spawn } = await import('child_process');
            const gitArgs = [actionName.toLowerCase(), ...process.argv.slice(3)];

            const child = spawn('git', gitArgs, { stdio: 'inherit', shell: true });
            child.on('close', (code) => {
                process.exit(code);
            });
            // We return promise to await exit
            return new Promise(() => { });
        }
        return;
    }

    await logicFn();
    showFooter();
}

program
    .name('vanguard')
    .description('Enterprise-Grade AI Supply Chain Firewall')
    .version(pkg.version)
    .option('-m, --model <name>', 'Override AI model')
    .option('-v, --verbose', 'Show verbose connection logs')
    .option('--clear-cache', 'Flush local audit cache');

program.command('config').description('Configure AI providers').action(runConfigWizard);
program.command('integrate').description('Install "Invisible Protection" shell wrapper').action(runIntegrate);

program
    .command('status')
    .description('Check firewall protection status')
    .action(() => {
        // showBanner();
        const isInternal = process.env.VANGUARD_INTERNAL === '1';
        console.log(chalk.bold('🔥 Firewall Status:'));
        if (isInternal) {
            console.log(chalk.green('  ✅ ACTIVE (Intercepted Session)'));
        } else {
            console.log(chalk.yellow('  ⚠️  OFFLINE (Direct CLI Access)'));
            console.log(chalk.dim('\nTo activate Invisible Protection, run: vanguard integrate'));
        }
        showFooter();
    });


program
    .command('pull')
    .description('Audit and pull upstream changes')
    .option('-f, --force', 'Force merge even if threats are detected')
    .action(async (cmdOptions) => {
        await handleAction('PULL', () => handlePull(cmdOptions, program.opts()));
    });

program
    .command('clone')
    .description('Deep audit a repository during clone')
    .argument('<url>', 'Git URL')
    .argument('[directory]', 'Target directory')
    .action(async (url, directory) => {
        await handleAction('CLONE', () => handleClone(url, directory, program.opts()));
    });

showBanner(pkg.version);
program.parse(process.argv);

// Default action: if no command provided, check config
if (!process.argv.slice(2).length) {
    const isConfigured =
        (config.get('AI_PROVIDER') === 'gemini' && config.get('GEMINI_KEY')) ||
        (config.get('AI_PROVIDER') === 'ollama' && config.get('OLLAMA_MODEL'));

    if (!isConfigured) {
        // showBanner();
        console.log(chalk.yellow(`🛡️ Vanguard V3 is not fully configured. Starting setup...\n`));
        await runConfigWizard();
    } else {
        program.help();
    }
}
