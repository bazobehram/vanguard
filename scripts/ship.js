import { execSync } from 'child_process';
import inquirer from 'inquirer';
import chalk from 'chalk';

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
                { name: 'Patch (3.1.x) - Bug fixes', value: 'patch' },
                { name: 'Minor (3.x.0) - New features', value: 'minor' },
                { name: 'Major (X.0.0) - Breaking changes', value: 'major' },
            ],
        },
    ]);

    // 3. Automation via release-it
    try {
        console.log(chalk.blue(`\n🚀 Orchestrating synchronized ${bump} release...`));
        console.log(chalk.dim('We are using your local NPM session for publishing.'));

        /**
         * Note: We removed --ci to allow the terminal to handle your 
         * existing login/passkey flow exactly like a normal 'npm publish'.
         */
        execSync(`npx release-it ${bump}`, { stdio: 'inherit' });

        console.log(chalk.bold.green('\n✨ MISSION ACCOMPLISHED: Vanguard V3 is live on GitHub and NPM! 🛡️🚀'));
    } catch (e) {
        console.log(chalk.red('\n❌ Release failed. Check the logs above.'));
        console.log(chalk.yellow('\n💡 Troubleshooting:'));
        console.log('1. Ensure your git working directory is clean.');
        console.log('2. Try running "npm whoami" to confirm your session.');
    }
}

ship();
