import { Command } from 'commander';
import packageJson from '../package.json' with { type: 'json' };
import { install } from './install';

interface Options {
  cwd?: string;
  dryRun?: boolean;
  interactive?: boolean;
}

const program = new Command();
program.version(packageJson.version, '-v, --version', 'Show version number');

program.option('--dry-run', 'Perform a dry run without making any changes');
program.option('-c, --cwd <path>', 'Set the working directory');
program.option('-i, --interactive', 'Run in interactive mode');

program.parse();

const options: Options = program.opts();

try {
  await install(options);
} catch (error) {
  console.error("An error occurred during installation:", error);
  process.exit(1);
}
