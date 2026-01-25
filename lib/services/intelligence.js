import fetch from 'node-fetch';
import chalk from 'chalk';
import Table from 'cli-table3';

const THREAT_DB_URL = 'https://raw.githubusercontent.com/bazobehram/vanguard-db/main/threats.json';

export class IntelligenceEngine {
  constructor(verbose = false) {
    this.verbose = verbose;
    this.curatedRules = [];
    this.vulnerabilities = [];
  }

  async sync(pkgJson = null) {
    await Promise.allSettled([this.fetchCuratedRules(), this.queryOSV(pkgJson)]);

    return this.generateContext();
  }

  async fetchCuratedRules() {
    try {
      if (this.verbose) console.log(chalk.dim(`📡 Fetching threat DB from: ${THREAT_DB_URL}`));
      const res = await fetch(THREAT_DB_URL, { timeout: 5000 });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      this.curatedRules = data.ai_instructions || [];

      console.log(
        chalk.green(
          `  ✔ Threat DB Sync: ${this.curatedRules.length} rules loaded (Version: ${data.version || 'v1'})`
        )
      );
    } catch {
      console.log(chalk.yellow('  ⚠️  Using Local Rules Only (Offline Fallback)'));
    }
  }

  async queryOSV(pkgJson) {
    if (!pkgJson) return;
    try {
      const pkg = JSON.parse(pkgJson);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const queries = Object.entries(deps).map(([name, version]) => ({
        package: { name, ecosystem: 'npm' },
        version: version.replace(/[\^~]/g, ''),
      }));

      if (queries.length === 0) return;

      const res = await fetch('https://api.osv.dev/v1/querybatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: queries.slice(0, 50) }),
      });

      const data = await res.json();

      const table = new Table({
        head: [chalk.cyan('Dependency'), chalk.cyan('Status'), chalk.cyan('Vulnerabilities')],
        colWidths: [20, 10, 20],
      });

      data.results.forEach((r, i) => {
        const depName = queries[i].package.name;
        table.push([depName, res.status, r.vulns ? chalk.red(r.vulns.length) : chalk.green('0')]);
        if (r.vulns) this.vulnerabilities.push(...r.vulns);
      });

      console.log(chalk.bold('\n📦 OSV.dev Dependency Audit:'));
      console.log(table.toString());
    } catch (e) {
      if (this.verbose) console.log(chalk.red(`  ✘ OSV Audit Failed: ${e.message}`));
    }
  }

  generateContext() {
    let ctx = '\n### 🚨 LIVE THREAT INTELLIGENCE:\n';
    if (this.curatedRules.length > 0) {
      ctx += 'Curated Rules:\n' + this.curatedRules.map((r) => `- ${r}`).join('\n') + '\n';
    }
    if (this.vulnerabilities.length > 0) {
      ctx +=
        'Known Vulnerabilities in dependencies:\n' +
        this.vulnerabilities.map((v) => `- ${v.id}: ${v.summary}`).join('\n');
    }
    return ctx;
  }
}
