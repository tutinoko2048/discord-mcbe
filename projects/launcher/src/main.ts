import { Command } from 'commander';
import packageJson from '../package.json' with { type: 'json' };
import { install, InstallOptions } from './install';

const program = new Command();
program.version(packageJson.version, '-v, --version', 'Show version number');

program.option('--dry-run', 'Perform a dry run without making any changes');
program.option('-c, --cwd <path>', 'Set the working directory');
program.option('-i, --interactive', 'Run in interactive mode');
program.option('-t, --tag <version>', 'Install a specific version (e.g. "1.2.3" or "beta")');

program.parse();

const options = program.opts<InstallOptions>();

try {
  await install(options);
} catch (error) {
  console.error('An error occurred during installation:', error);
  process.exit(1);
}
