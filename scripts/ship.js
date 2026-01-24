import { execSync } from 'child_process';
import inquirer from 'inquirer';
import chalk from 'chalk';

async function ship() {
    console.log(chalk.bold.bgCyan.black('\n 🚢 VANGUARD ENTERPRISE SHIPPER \n'));

    // 1. Check for GITHUB_TOKEN
    if (!process.env.GITHUB_TOKEN) {
        console.log(chalk.yellow('⚠ Warning: GITHUB_TOKEN not found in environment.'));
        console.log(chalk.dim('GitHub Release will be created via browser fallback instead of automated API.\n'));
    }

    // 2. Run Tests
    try {
        console.log(chalk.blue('🧪 Safety Check: Running unit tests...'));
        execSync('npm test', { stdio: 'inherit' });
        console.log(chalk.green('✔ Tests passed. Safety verified.'));
    } catch (e) {
        console.log(chalk.red('\n🛑 Ship aborted: Tests failed. Fix your code before publishing!'));
        process.exit(1);
    }

    // 3. Decide Version Bump
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

    // 4. Handle 2FA for NPM
    const { useOtp } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'useOtp',
            message: 'Does your NPM account require 2FA (OTP)?',
            default: true,
        }
    ]);

    let otpField = '';
    if (useOtp) {
        const { otp } = await inquirer.prompt([
            {
                type: 'input',
                name: 'otp',
                message: 'Enter your NPM 6-digit OTP code:',
                validate: (input) => /^\d{6}$/.test(input) || 'Must be exactly 6 digits',
            }
        ]);
        otpField = `--npm.otp=${otp}`;
    }

    // 5. Automation via release-it
    try {
        console.log(chalk.blue(`\n🚀 Orchestrating synchronized ${bump} release...`));

        // We remove --ci to allow some interaction if needed, but pass the OTP directly
        execSync(`npx release-it ${bump} ${otpField} --ci`, { stdio: 'inherit' });

        console.log(chalk.bold.green('\n✨ MISSION ACCOMPLISHED: Vanguard V3 is live on GitHub and NPM! 🛡️🚀'));
    } catch (e) {
        console.log(chalk.red(`\n❌ Release failed: ${e.message}`));
        console.log(chalk.yellow('\n💡 Troubleshooting:'));
        console.log('1. Is your OTP correct? (They expire in 30s)');
        console.log('2. Do you have a clean working directory (git status)?');
        console.log('3. Are you logged in to NPM (npm whoami)?');
    }
}

ship();
