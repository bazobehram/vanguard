#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import { runConfigWizard } from '../lib/commands/config.js';
import { handlePull, handleClone } from '../lib/commands/scan.js';
import { showBanner, showFooter } from '../lib/utils/ui.js';
import config from '../lib/utils/config.js';

const program = new Command();

async function handleAction(actionName, logicFn) {
    showBanner();
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
        console.log('⚠️  Skipping protection. Proceeding at your own risk.');
        return;
    }

    if (config.get('AI_PROVIDER') === 'gemini' && !config.get('GEMINI_KEY')) {
        console.log('❌ Gemini not configured.');
        await runConfigWizard();
    }

    await logicFn();
    showFooter();
}

program
    .name('vanguard')
    .description('Enterprise-Grade AI Supply Chain Firewall')
    .version('3.0.0-enterprise')
    .option('-m, --model <name>', 'Override AI model')
    .option('-v, --verbose', 'Show verbose connection logs')
    .option('--clear-cache', 'Flush local audit cache');

program.command('config').description('Configure AI providers').action(runConfigWizard);

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

program.parse(process.argv);
