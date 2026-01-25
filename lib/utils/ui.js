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

  const threats = analysis.threats || [];
  const riskScore = analysis.risk_score ?? analysis.riskScore ?? 0;
  const verdict = analysis.verdict || 'UNKNOWN';
  const summary = analysis.summary || 'No summary provided.';

  const content = [
    chalk.bold(`Verdict: ${verdict}`),
    chalk.bold(`Risk Score: ${riskScore}/100`),
    '',
    chalk.bold('🚨 Detailed Threat Audit:'),
    ...(threats.length > 0
      ? threats.map((t) => {
        const loc = t.file ? chalk.yellow(`[${t.file}${t.line ? `:${t.line}` : ''}] `) : '';
        const tag = t.threat ? chalk.red(`(${t.threat})`) : '';
        return `• ${loc}${tag}\n  ${chalk.dim(t.reason || t)}`;
      })
      : [chalk.dim('• No targeted threats identified.')]),
    '',
    chalk.bold('📝 Auditor Summary:'),
    summary,
  ].join('\n');

  console.log(
    boxen(content, {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: color,
      title: title,
      titleAlignment: 'center',
    })
  );
}



export function showFooter() {
  console.log(chalk.dim('\n──────────────────────────────────────────────────────────────────────'));
  console.log(
    chalk.green('🤝  Contribute: ') + chalk.underline('https://github.com/bazobehram/vanguard')
  );
  console.log(
    chalk.cyan('☕  Support:    ') + chalk.underline('https://www.buymeacoffee.com/bazobehram')
  );
  console.log(chalk.dim('──────────────────────────────────────────────────────────────────────\n'));
}
