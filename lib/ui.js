import figlet from 'figlet';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';

export function showBanner() {
    console.log(chalk.cyan(figlet.textSync('VANGUARD', { horizontalLayout: 'full' })));
    console.log(chalk.dim('🛡️  Software Supply Chain Firewall | AI-Powered Security 🛡️\n'));
}

export function showAlert(analysis) {
    const color = analysis.verdict === 'BLOCK' ? 'red' : 'green';
    const title = analysis.verdict === 'BLOCK' ? '⚠️ HIGH RISK DETECTED' : '✅ SAFE';

    const content = [
        chalk.bold(`Verdict: ${analysis.verdict}`),
        chalk.bold(`Risk Score: ${analysis.risk_score}/100`),
        '',
        chalk.bold('Threats:'),
        ...(analysis.threats.length > 0 ? analysis.threats.map(t => `• ${t}`) : ['• None']),
        '',
        chalk.bold('Summary:'),
        analysis.summary
    ].join('\n');

    console.log(boxen(content, {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: color,
        title: title,
        titleAlignment: 'center'
    }));
}

export function createSpinner(text) {
    return ora({
        text: text,
        color: 'yellow',
        spinner: 'dots'
    });
}

export function showFooter() {
    console.log(chalk.dim('\n----------------------------------------------------------------------'));
    console.log(chalk.cyan('☕ Support the project: ') + chalk.underline('https://www.buymeacoffee.com/bazobehram'));
    console.log(chalk.dim('----------------------------------------------------------------------\n'));
}
