import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { createSpinner } from '../utils/spinner.js';

const BASH_ZSH_TEMPLATE = `
# --- VANGUARD PROTECTION START ---
git() {
  if [ "$1" = "clone" ] && [ -z "$VANGUARD_INTERNAL" ]; then
    export VANGUARD_INTERNAL=1
    vanguard clone "\${@:2}"
    unset VANGUARD_INTERNAL
  else
    command git "$@"
  fi
}
# --- VANGUARD PROTECTION END ---
`;

const FISH_TEMPLATE = `
# --- VANGUARD PROTECTION START ---
function git
  if test "$argv[1]" = "clone"
    vanguard clone $argv[2..-1]
  else
    command git $argv
  end
end
# --- VANGUARD PROTECTION END ---
`;

const POWERSHELL_TEMPLATE = `
# --- VANGUARD PROTECTION START ---
function git {
    if ($args[0] -eq "clone" -and !$env:VANGUARD_INTERNAL) {
        $env:VANGUARD_INTERNAL = "1"
        try {
            vanguard clone @(if ($args.Length -gt 1) { $args[1..($args.Length-1)] })
        } finally {
            $env:VANGUARD_INTERNAL = $null
        }
    } else {
        & (Get-Command git -CommandType Application) @args
    }
}
# --- VANGUARD PROTECTION END ---
`;

const SCRIPTS = {
    bash: { file: '.bashrc', template: BASH_ZSH_TEMPLATE },
    zsh: { file: '.zshrc', template: BASH_ZSH_TEMPLATE },
    fish: { file: '.config/fish/config.fish', template: FISH_TEMPLATE },
    powershell: { file: 'Documents/PowerShell/Microsoft.PowerShell_profile.ps1', template: POWERSHELL_TEMPLATE }
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
            detected.push({ name: shell, path: profilePath, template: info.template });
        }
    }

    // Check PowerShell with robust detection
    const psProfiles = [];
    if (os.platform() === 'win32') {
        const documentsPath = path.join(home, 'Documents');
        const oneDriveDocumentsPath = path.join(home, 'OneDrive', 'Documents');
        const oneDriveBelgelerPath = path.join(home, 'OneDrive', 'Belgeler'); // User specific Turkish path

        const possibleRoots = [documentsPath, oneDriveDocumentsPath, oneDriveBelgelerPath, home];
        const psFolders = ['PowerShell', 'WindowsPowerShell'];

        for (const root of possibleRoots) {
            for (const folder of psFolders) {
                const profile = path.join(root, folder, 'Microsoft.PowerShell_profile.ps1');
                psProfiles.push(profile);
            }
        }
    } else {
        psProfiles.push(path.join(home, SCRIPTS.powershell.file));
    }

    for (const profilePath of psProfiles) {
        if (await fs.pathExists(profilePath) || (os.platform() === 'win32' && profilePath.includes('PowerShell'))) {
            if (!detected.some(d => d.path === profilePath)) {
                detected.push({ name: 'powershell', path: profilePath, template: POWERSHELL_TEMPLATE });
            }
        }
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
                // Update existing integration if template differs significantly
                console.log(chalk.yellow(`⏩ ${shell.name} already integrated. Updating wrapper...`));
                const stripped = content.replace(/# --- VANGUARD PROTECTION START ---[\s\S]*?# --- VANGUARD PROTECTION END ---/g, '').trim();
                await fs.writeFile(profilePath, stripped + '\n' + shell.template);
            } else {
                await fs.appendFile(profilePath, '\n' + shell.template);
            }
            console.log(chalk.green(`✅ Integrated with ${shell.name} (${profilePath})`));
        } catch (err) {
            console.log(chalk.red(`❌ Failed to integrate with ${shell.name}: ${err.message}`));
        }
    }

    console.log(chalk.bold('\n✨ Invisible Protection Active! Restart your terminal to apply. 🛡️'));
}
