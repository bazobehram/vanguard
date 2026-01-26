#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { runConfigWizard } from '../lib/commands/config.js';
import { runIntegrate } from '../lib/commands/integrate.js';
import { handlePull, handleClone } from '../lib/commands/scan.js';
import { showBanner, showFooter } from '../lib/utils/ui.js';
import config from '../lib/utils/config.js';
import { checkForUpdates } from '../lib/utils/update.js';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('../package.json');

// Check for updates in the background
checkForUpdates(pkg.version);

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

    const { mode } = await inquirer.prompt([
        {
            type: 'list',
            name: 'mode',
            message: `🛡️ Vanguard Enterprise Edition detected a ${actionName}. Select protection level:`,
            choices: [
                { name: chalk.green('⚡ Quick Audit ') + chalk.dim('(Config & Entry Files)'), value: 'quick' },
                { name: chalk.cyan('🛡️  Deep Audit  ') + chalk.dim('(Full behavioral scanning)'), value: 'deep' },
                { name: chalk.yellow('⚠️  Skip        ') + chalk.dim('(Direct execution - RISKY)'), value: 'skip' },
            ],
            default: 'quick',
        },
    ]);

    if (mode === 'skip') {
        console.log(chalk.yellow('\n⚠️  Skipping protection. Proceeding at your own risk.'));

        if (actionName === 'CLONE') {
            const { spawn } = await import('child_process');
            const gitArgs = [actionName.toLowerCase(), ...process.argv.slice(3)];

            const child = spawn('git', gitArgs, { stdio: 'inherit', shell: true });
            child.on('close', (code) => {
                process.exit(code);
            });
            return new Promise(() => { });
        }
        return;
    }

    await logicFn(mode);
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
        await handleAction('PULL', (mode) => handlePull(cmdOptions, program.opts(), mode));
    });

program
    .command('clone')
    .description('Deep audit a repository during clone')
    .argument('<url>', 'Git URL')
    .argument('[directory]', 'Target directory')
    .action(async (url, directory) => {
        await handleAction('CLONE', (mode) => handleClone(url, directory, program.opts(), mode));
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
