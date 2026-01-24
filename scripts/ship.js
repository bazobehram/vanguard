import { execSync } from 'child_process';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs/promises';

async function ship() {
    console.log(chalk.bold.bgCyan.black('\n 🚢 VANGUARD ENTERPRISE SHIPPER \n'));

    // 1. Run Tests
    try {
        console.log(chalk.blue('🧪 Safety Check: Running unit tests...'));
        execSync('npm test', { stdio: 'inherit' });
        console.log(chalk.green('✔ Tests passed. Safety verified.'));
    } catch (e) {
        console.log(chalk.red('\n🛑 Ship aborted: Tests failed. Fix your code before publishing!'));
        process.exit(1);
    }

    // 2. Decide Version Bump
    const { bump } = await inquirer.prompt([
        {
            type: 'list',
            name: 'bump',
            message: 'Select Release Type:',
            choices: [
                { name: 'Patch (3.x.X) - Bug fixes', value: 'patch' },
                { name: 'Minor (3.X.0) - New features', value: 'minor' },
                { name: 'Major (X.0.0) - Breaking changes', value: 'major' },
            ],
        },
    ]);

    // 3. Automation via release-it
    try {
        console.log(chalk.blue(`\n🚀 Orchestrating synchronized ${bump} release...`));
        console.log(chalk.dim('This will commit, tag, push to GitHub, and publish to NPM.'));

        // We execute release-it with the specific bump type
        execSync(`npx release-it ${bump} --ci`, { stdio: 'inherit' });

        console.log(chalk.bold.green('\n✨ MISSION ACCOMPLISHED: Vanguard V3 is live on GitHub and NPM! 🛡️🚀'));
    } catch (e) {
        console.log(chalk.red(`\n❌ Release failed: ${e.message}`));
        console.log(chalk.yellow('Tip: Ensure your GITHUB_TOKEN is set and you have NPM login permissions.'));
    }
}

ship();
