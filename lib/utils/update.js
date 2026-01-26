import fetch from 'node-fetch';
import chalk from 'chalk';
import boxen from 'boxen';

export async function checkForUpdates(currentVersion) {
    try {
        // We use a short timeout to prevent hanging the CLI if the network is slow
        const response = await fetch('https://registry.npmjs.org/vanguard-cli/latest', {
            timeout: 1500,
        });

        if (!response.ok) return;

        const data = await response.json();
        const latestVersion = data.version;

        const isNewer = (latest, current) => {
            const l = latest.split('.').map(Number);
            const c = current.split('.').map(Number);
            for (let i = 0; i < 3; i++) {
                if (l[i] > c[i]) return true;
                if (l[i] < c[i]) return false;
            }
            return false;
        };

        if (latestVersion && isNewer(latestVersion, currentVersion)) {
            const message = [
                chalk.bold(`Update Available!`),
                `${chalk.dim('Current:')} ${chalk.red(currentVersion)}`,
                `${chalk.dim('Latest: ')} ${chalk.green(latestVersion)}`,
                '',
                chalk.cyan('Run the following to upgrade:'),
                chalk.white.bgBlack(` npm install -g vanguard-cli@latest `),
            ].join('\n');

            console.log(
                boxen(message, {
                    padding: 1,
                    margin: 1,
                    borderStyle: 'round',
                    borderColor: 'yellow',
                    title: '🚀 Vanguard Upgrade',
                    titleAlignment: 'center',
                })
            );
        }
    } catch (error) {
        // Silently ignore update check failures to maintain UX
    }
}
