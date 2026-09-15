import { Command } from 'commander';
import packageJson from '../package.json' with { type: 'json' };
import { LauncherError } from './errors';
import { install, InstallOptions, rollback } from './install';
import { cleanupOldLauncher, upgradeLauncher } from './upgrade';

async function main() {
  await cleanupOldLauncher();

  const program = new Command();
  program.name('updater');
  program.version(packageJson.version, '-v, --version', 'Show version number');

  program.argument(
    '[version]',
    'Version to install (e.g. "1.2.3", "stable", or "beta"), "upgrade", or "rollback". Defaults to stable in non-interactive mode.',
  );
  program.argument('[upgrade-version]', 'Exact launcher version to install with "upgrade".');
  program.option('--dry-run', 'Perform a dry run without making any changes');
  program.option('-c, --cwd <path>', 'Set the working directory');
  program.option('--no-interactive', 'Run in non-interactive mode');
  program.option('-f, --force', 'Install even when the target is not a newer version');

  program.parse();

  const options = program.opts<InstallOptions>();
  options.version = program.args[0];

  console.log(`discord-mcbe updater v${packageJson.version}`);
  if (options.version === 'rollback') {
    await rollback(options);
  } else if (options.version === 'upgrade') {
    await upgradeLauncher({ ...options, version: program.args[1] });
  } else {
    await install(options);
  }
}

try {
  await main();
} catch (error) {
  if (error instanceof LauncherError) {
    console.error(`[ERROR] ${error.message}`);
    process.exit(1);
  }
  throw error;
}
