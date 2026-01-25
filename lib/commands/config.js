import inquirer from 'inquirer';
import chalk from 'chalk';
import config from '../utils/config.js';
import { createSpinner } from '../utils/spinner.js';
import { showBanner } from '../utils/ui.js';

export async function runConfigWizard() {
    showBanner();
    console.log('🛰️  Vanguard Configuration Wizard');
    console.log(chalk.dim(`📂 Config Path: ${config.path}\n`));

    const { providerSelection } = await inquirer.prompt([
        {
            type: 'list',
            name: 'providerSelection',
            message: 'Select AI Provider:',
            choices: [
                { name: 'Google Gemini (Cloud - Reliable & Smart)', value: 'gemini' },
                { name: 'Local Ollama (Private - Offline)', value: 'ollama' },
            ],
        },
    ]);

    config.set('AI_PROVIDER', providerSelection);

    if (providerSelection === 'gemini') {
        const { apiKey } = await inquirer.prompt([
            {
                type: 'password',
                name: 'apiKey',
                message: 'Enter your Gemini API Key:',
                default: config.get('GEMINI_KEY'),
                validate: (val) => {
                    if (val.length === 0) return 'Key is required';
                    if (val.startsWith('sk-')) return '⚠️ That looks like an OpenAI key. Gemini keys usually start with "AIza"';
                    return true;
                },
            },
        ]);
        config.set('GEMINI_KEY', apiKey.trim());
        console.log('✅ Gemini configured and saved.');
    } else {
        const spinner = createSpinner('🔍 Detecting local Ollama models...').start();
        try {
            const res = await fetch(`${config.get('OLLAMA_URL')}/api/tags`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            spinner.stop();

            const models = data.models.map((m) => m.name);
            if (models.length === 0) {
                console.log('❌ No local models found. Run "ollama pull qwen2.5-coder" first.');
                return;
            }

            console.log(
                chalk.blue('\n💡 Tip: For security auditing, we recommend models with strong coding logic.')
            );
            console.log(chalk.dim('   Recommended: qwen2.5-coder (7b+), codellama, llama3.1 (8b+)\n'));

            const choices = models.map((name) => {
                const isRecommended = ['qwen', 'llama3', 'coder', 'deepseek'].some((kw) =>
                    name.toLowerCase().includes(kw)
                );
                return {
                    name: isRecommended ? `${name} ${chalk.green.bold('(Recommended)')}` : name,
                    value: name,
                };
            });

            const { model } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'model',
                    message: 'Select your preferred local model:',
                    choices: choices,
                    default: config.get('OLLAMA_MODEL'),
                },
            ]);
            config.set('OLLAMA_MODEL', model);
            console.log(`✅ Ollama configured with model: ${model}`);
        } catch {
            spinner.fail('❌ Ollama not detected. Run "ollama serve" first.');
        }
    }
}
