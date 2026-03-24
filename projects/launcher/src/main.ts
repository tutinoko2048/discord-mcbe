import { Command } from 'commander';
import packageJson from '../package.json' with { type: 'json' };
import { install, InstallOptions } from './install';

const program = new Command();
program.version(packageJson.version, '-v, --version', 'Show version number');

program.argument('[version]', 'Version to install (e.g. "1.2.3" or "beta"). If not specified, the latest version will be installed.');
program.option('--dry-run', 'Perform a dry run without making any changes');
program.option('-c, --cwd <path>', 'Set the working directory');
program.option('--no-interactive', 'Run in non-interactive mode');
program.option('-f, --force', 'Force installation even if the current version is up to date');

program.parse();

const options = program.opts<InstallOptions>();
options.version = program.args[0];

try {
  await install(options);
} catch (error) {
  console.error('An error occurred during installation:', error);
  process.exit(1);
}
