import { $ } from 'bun';
import { join } from 'path';

const packages = {
  app: ['../projects/server', '../packages/client', '../packages/shared'],
  launcher: ['../projects/launcher'],
};

const validVersionTypes = ['major', 'minor', 'patch', 'premajor', 'preminor', 'prepatch', 'prerelease'];

const type = process.argv[2] as 'app' | 'launcher' | undefined;
const version = process.argv[3];
if (!type || !version || !['app', 'launcher'].includes(type)) {
  printUsage();
  process.exit(1);
}

const addons = ['../projects/addon-bds', '../projects/addon-local'];

if (type === 'launcher') {
  if (version !== 'increment') {
    printUsage();
    process.exit(1);
  }

  const packageJsonPath = join(__dirname, '../projects/launcher/package.json');
  const packageJson = await Bun.file(packageJsonPath).json();
  const currentVersion = Number(packageJson.version);
  if (!Number.isSafeInteger(currentVersion) || currentVersion < 0) {
    throw new Error(`Invalid launcher version: ${packageJson.version}`);
  }

  const updatedVersion = currentVersion + 1;
  packageJson.version = String(updatedVersion);
  await Bun.write(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  console.log(`Launcher version incremented from ${currentVersion} to ${updatedVersion}.`);
  console.log(`See 'docs/releasing.md' to create release.`);
} else {
  const isSpecified = /^\d+\.\d+\.\d+(-\w+\.\d+)?$/.test(version.trim());
  if (isSpecified) {
    console.log(`Setting app version to ${version}...`);
  } else if (validVersionTypes.includes(version)) {
    console.log(`Bumping app ${version} version...`);
  } else {
    printUsage();
    process.exit(1);
  }

  await Promise.all(packages.app.map((pkg) => runPnpmVersion(join(__dirname, pkg))));

  const updatedVersion = await readCurrentAppVersion();
  await updateAddonVersion(updatedVersion);
  console.log(`App version updated to ${updatedVersion} successfully!`);
  console.log(`See 'docs/releasing.md' to create release.`);
}

async function runPnpmVersion(cwd: string) {
  try {
    await $`pnpm version ${version} --no-git-tag-version --no-git-checks`.cwd(cwd).quiet();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  console.log(`- updated package.json: ${cwd}`);
}

async function readCurrentAppVersion() {
  const packageJsonFile = Bun.file(join(__dirname, '../projects/server/package.json'));
  const packageJson = await packageJsonFile.json();
  return packageJson.version;
}

function printUsage() {
  console.error(
    [
      'Usage:',
      `  pnpm run bump-version app <${validVersionTypes.join('|')}>`,
      '  pnpm run bump-version app x.y.z',
      '  pnpm run bump-version launcher increment',
    ].join('\n'),
  );
}

async function updateAddonVersion(version: string) {
  await Promise.all(
    addons.map(async (addonRelativePath) => {
      const addonDir = join(__dirname, addonRelativePath);
      const manifestPath = join(addonDir, 'manifest.json');
      const manifestFile = Bun.file(manifestPath);

      const manifest = await manifestFile.json();
      manifest.header.version = version;
      await manifestFile.write(JSON.stringify(manifest, null, 2));

      await $`vp fmt 'manifest.json'`.cwd(addonDir).quiet();

      console.log(`- updated manifest.json: ${addonDir}`);
    }),
  );
}
