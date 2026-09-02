import { Command } from 'commander';
import packageJson from '../package.json' with { type: 'json' };
import { install, InstallOptions, rollback } from './install';

async function main() {
  const program = new Command();
  program.name('updater');
  program.version(packageJson.version, '-v, --version', 'Show version number');

  program.argument(
    '[version]',
    'Version to install (e.g. "1.2.3", "stable", or "beta"), or "rollback". Defaults to stable in non-interactive mode.',
  );
  program.option('--dry-run', 'Perform a dry run without making any changes');
  program.option('-c, --cwd <path>', 'Set the working directory');
  program.option('--no-interactive', 'Run in non-interactive mode');
  program.option('-f, --force', 'Install even when the target is not a newer version');

  program.parse();

  const options = program.opts<InstallOptions>();
  options.version = program.args[0];

  try {
    console.log(`discord-mcbe updater v${packageJson.version}`);
    if (options.version === 'rollback') {
      await rollback(options);
    } else {
      await install(options);
    }
  } catch (error) {
    console.error('An error occurred during installation:', error);
    process.exit(1);
  }
}

void main();
