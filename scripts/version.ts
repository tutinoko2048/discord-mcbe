import { $ } from 'bun';
import { join } from 'path';
import { packages } from './_packages';

const type = process.argv[2] as 'app' | 'launcher' | undefined;
const version = process.argv[3];
if (!type || !version || !['app', 'launcher'].includes(type)) {
  console.error('Usage:\npnpm run bump-version <app|launcher> <major|minor|patch|pre>\npnpm run bump-version <app|launcher> <version>');
  process.exit(1);
}

const isSpecified = /^\d+\.\d+\.\d+(-\w+\.\d+)?$/.test(version.trim());

const addons = ['../projects/addon-bds', '../projects/addon-local'];

let updatedVersion: string;

if (isSpecified) {
  console.log(`Setting version to ${version}...`);

  for (const pkg of packages[type]) {
    await runPnpmVersion(join(__dirname, pkg));
  }

  updatedVersion = version.trim();
} else {
  console.log(`Bumping ${version} version...`);

  for (const pkg of packages[type]) {
    await runPnpmVersion(join(__dirname, pkg));
  }

  updatedVersion = await readCurrentVersion();
}

if (type === 'app') {
  await updateAddonVersion(updatedVersion);
}

console.log(`Version updated to ${updatedVersion} successfully!`);


async function runPnpmVersion(cwd: string) {
  try {
    await $`pnpm version ${version} --no-git-tag-version`.cwd(cwd).quiet();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.log(`- updated package.json: ${cwd}`);
}

async function readCurrentVersion() {
  const packageJsonFile = Bun.file(join(__dirname, '../projects/server/package.json'));
  const packageJson = await packageJsonFile.json();
  return packageJson.version;
}

async function updateAddonVersion(version: string) {
  await Promise.all(addons.map(async (addonRelativePath) => {
    const addonDir = join(__dirname, addonRelativePath);
    const manifestPath = join(addonDir, 'manifest.json');
    const manifestFile = Bun.file(manifestPath);

    const manifest = await manifestFile.json();
    manifest.header.version = version;
    await manifestFile.write(JSON.stringify(manifest, null, 2));

    await $`vp fmt 'manifest.json'`.cwd(addonDir).quiet();

    console.log(`- updated manifest.json: ${addonDir}`);
  }));
}

