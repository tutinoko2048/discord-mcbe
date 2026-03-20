import { $ } from 'bun';
import { join } from 'path';
import { packages } from './_packages';

const type = process.argv[2] as 'app' | 'launcher' | undefined;
const publishArgs = process.argv.slice(3);
if (!type || !['app', 'launcher'].includes(type)) {
  console.error('Usage:\npnpm run publish <app|launcher> [tag]');
  process.exit(1);
}

for (const pkg of packages[type]) {
  await $`pnpm publish ${publishArgs.join(' ')}`.cwd(join(__dirname, pkg));
}
