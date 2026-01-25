import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { createSpinner } from '../utils/spinner.js';

// We use raw strings for templates to avoid JS interpolation issues
const BASH_ZSH_TEMPLATE = [
    '# --- VANGUARD PROTECTION START ---',
    '# Universal Interceptor for Bash/Zsh',
    'git() {',
    '  if [ "$1" = "clone" ] && [ -z "$VANGUARD_INTERNAL" ]; then',
    '    export VANGUARD_INTERNAL=1',
    '    vanguard clone "${@:2}"',
    '    unset VANGUARD_INTERNAL',
    '  else',
    '    command git "$@"',
    '  fi',
    '}',
    '# --- VANGUARD PROTECTION END ---'
].join('\n');

const POWERSHELL_TEMPLATE = [
    '# --- VANGUARD PROTECTION START ---',
    '# Universal Interceptor for PowerShell',
    'function git {',
    '    if ($args[0] -eq "clone" -and !$env:VANGUARD_INTERNAL) {',
    '        $env:VANGUARD_INTERNAL = "1"',
    '        try {',
    '            vanguard clone @(if ($args.Length -gt 1) { $args[1..($args.Length-1)] })',
    '        } finally {',
    '            $env:VANGUARD_INTERNAL = $null',
    '        }',
    '    } else {',
    '        & (Get-Command git -CommandType Application) @args',
    '    }',
    '}',
    '# --- VANGUARD PROTECTION END ---'
].join('\n');

const FISH_TEMPLATE = [
    '# --- VANGUARD PROTECTION START ---',
    '# Universal Interceptor for Fish',
    'function git',
    '  if test "$argv[1]" = "clone"; and test -z "$VANGUARD_INTERNAL"',
    '    set -gx VANGUARD_INTERNAL 1',
    '    vanguard clone $argv[2..-1]',
    '    set -e VANGUARD_INTERNAL',
    '  else',
    '    command git $argv',
    '  end',
    'end',
    '# --- VANGUARD PROTECTION END ---'
].join('\n');

export async function runIntegrate() {
    console.log(chalk.bold('🐚 Vanguard Shell Integrator (Universal Edition)\n'));
    const spinner = createSpinner('🔍 Probing environment for shell profiles...').start();

    const home = os.homedir();
    const isWin = os.platform() === 'win32';
    let detected = [];

    // 1. Detect Unix-based Shells (Linux/macOS)
    const unixShells = [
        { name: 'zsh', file: '.zshrc', template: BASH_ZSH_TEMPLATE },
        { name: 'bash', file: '.bashrc', template: BASH_ZSH_TEMPLATE },
        { name: 'bash_profile', file: '.bash_profile', template: BASH_ZSH_TEMPLATE },
        { name: 'fish', file: '.config/fish/config.fish', template: FISH_TEMPLATE }
    ];

    for (const shell of unixShells) {
        const p = path.join(home, shell.file);
        if (await fs.pathExists(p)) {
            detected.push({ ...shell, path: p });
        }
    }

    // 2. Detect PowerShell Profiles
    const psFolders = [
        path.join(home, 'Documents', 'PowerShell'),
        path.join(home, 'Documents', 'WindowsPowerShell'),
        path.join(home, 'OneDrive', 'Documents', 'PowerShell'),
        path.join(home, 'OneDrive', 'Documents', 'WindowsPowerShell'),
        path.join(home, 'OneDrive', 'Belgeler', 'PowerShell'),
        path.join(home, 'OneDrive', 'Belgeler', 'WindowsPowerShell'),
        path.join(home, '.config', 'powershell')
    ];

    for (const folder of psFolders) {
        const p = path.join(folder, 'Microsoft.PowerShell_profile.ps1');
        if (await fs.pathExists(p)) {
            detected.push({ name: 'powershell', path: p, template: POWERSHELL_TEMPLATE });
        }
    }

    if (isWin && !detected.some(sh => sh.name === 'powershell')) {
        const p = path.join(home, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1');
        detected.push({ name: 'powershell', path: p, template: POWERSHELL_TEMPLATE });
    }

    if (detected.length === 0) {
        spinner.fail('No shell profiles found.');
        return;
    }

    spinner.succeed(`Identified ${detected.length} active Shell targets.`);

    for (const shell of detected) {
        try {
            const profileContent = await fs.readFile(shell.path, 'utf-8').catch(() => '');

            if (profileContent) {
                await fs.copy(shell.path, `${shell.path}.vanguard_backup`);
            } else {
                await fs.ensureDir(path.dirname(shell.path));
            }

            if (profileContent.includes('VANGUARD PROTECTION START')) {
                console.log(chalk.dim(`  ⏩ ${shell.name} already protected. Synchronizing logic...`));
                const newContent = profileContent.replace(
                    /# --- VANGUARD PROTECTION START ---[\s\S]*?# --- VANGUARD PROTECTION END ---/g,
                    shell.template.trim()
                );
                await fs.writeFile(shell.path, newContent);
            } else {
                await fs.appendFile(shell.path, `\n${shell.template}\n`);
                console.log(chalk.green(`  ✅ ${shell.name} protection INJECTED!`));
            }
        } catch (e) {
            console.log(chalk.red(`  ❌ Error securing ${shell.name}: ${e.message}`));
        }
    }

    console.log(chalk.bold('\n🛡️  Invisible Protection is now armed across your system.'));
    console.log(chalk.cyan('👉  ACTION REQUIRED: Fully restart your terminal application to activate the shield.\n'));
}
