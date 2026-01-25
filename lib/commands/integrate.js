import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { createSpinner } from '../utils/spinner.js';

const SCRIPTS = {
    bash: {
        file: '.bashrc',
        template: `
# --- VANGUARD PROTECTION START ---
git() {
  if [ "$1" = "clone" ]; then
    vanguard clone "$@"
  else
    command git "$@"
  fi
}
# --- VANGUARD PROTECTION END ---
`
    },
    zsh: {
        file: '.zshrc',
        template: `
# --- VANGUARD PROTECTION START ---
git() {
  if [ "$1" = "clone" ]; then
    vanguard clone "$@"
  else
    command git "$@"
  fi
}
# --- VANGUARD PROTECTION END ---
`
    },
    fish: {
        file: '.config/fish/config.fish',
        template: `
# --- VANGUARD PROTECTION START ---
function git
  if test "$argv[1]" = "clone"
    vanguard clone $argv[2..-1]
  else
    command git $argv
  end
end
# --- VANGUARD PROTECTION END ---
`
    },
    powershell: {
        file: 'Documents/PowerShell/Microsoft.PowerShell_profile.ps1',
        template: `
# --- VANGUARD PROTECTION START ---
function git {
    if ($args[0] -eq "clone") {
        vanguard clone @(if ($args.Length -gt 1) { $args[1..($args.Length-1)] })
    } else {
        & (Get-Command git -CommandType Application) @args
    }
}
# --- VANGUARD PROTECTION END ---
`
    }
};

export async function runIntegrate() {
    console.log(chalk.bold('🐚 Vanguard Shell Integrator\n'));
    const spinner = createSpinner('🔍 Detecting shells and profiles...').start();

    const home = os.homedir();
    let detected = [];

    // Check Unix shells
    for (const [shell, info] of Object.entries(SCRIPTS)) {
        if (shell === 'powershell') continue;
        const profilePath = path.join(home, info.file);
        if (await fs.pathExists(profilePath)) {
            detected.push({ name: shell, path: profilePath, info });
        }
    }

    // Check PowerShell
    const psProfile = path.join(home, SCRIPTS.powershell.file);
    if (await fs.pathExists(psProfile) || os.platform() === 'win32') {
        detected.push({ name: 'powershell', path: psProfile, info: SCRIPTS.powershell });
    }

    if (detected.length === 0) {
        spinner.fail('No supported shell profiles detected.');
        return;
    }

    spinner.succeed(`Detected ${detected.length} shell profiles.`);

    for (const shell of detected) {
        const profilePath = shell.path;
        const backupPath = `${profilePath}.backup`;

        try {
            // Backup
            if (await fs.pathExists(profilePath)) {
                await fs.copy(profilePath, backupPath);
                console.log(chalk.dim(`💾 Backup created: ${backupPath}`));
            } else {
                await fs.ensureDir(path.dirname(profilePath));
                await fs.writeFile(profilePath, '');
            }

            const content = await fs.readFile(profilePath, 'utf-8');
            if (content.includes('VANGUARD PROTECTION START')) {
                console.log(chalk.yellow(`⏩ ${shell.name} already integrated. Skipping.`));
                continue;
            }

            await fs.appendFile(profilePath, shell.info.template);
            console.log(chalk.green(`✅ Integrated with ${shell.name} (${profilePath})`));
        } catch (err) {
            console.log(chalk.red(`❌ Failed to integrate with ${shell.name}: ${err.message}`));
        }
    }

    console.log(chalk.bold('\n✨ Invisible Protection Active! Restart your terminal to apply. 🛡️'));
}
