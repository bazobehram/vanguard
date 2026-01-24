import chalk from 'chalk';

const VERBOSE = process.env.VANGUARD_VERBOSE === 'true';

export const logger = {
  info: (msg) => console.log(chalk.blue(`ℹ ${msg}`)),
  success: (msg) => console.log(chalk.green(`✔ ${msg}`)),
  warn: (msg) => console.log(chalk.yellow(`⚠ ${msg}`)),
  error: (msg) => console.log(chalk.red(`✘ ${msg}`)),
  debug: (msg) => {
    if (VERBOSE) console.log(chalk.dim(`DEBUG: ${msg}`));
  },
};
