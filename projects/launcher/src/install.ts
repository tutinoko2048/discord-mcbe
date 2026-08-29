import { $, semver } from 'bun';
import { access, readFile, rename, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import confirm from '@inquirer/confirm';
import { valid as isValidSemver } from 'semver';
// import { SingleBar } from 'cli-progress';
import { askVersion, resolveVersion } from './version';
import { isCompiled } from './env';
import { fetchWithRetry } from './fetch';

const VERSION_FILE_NAME = '.VERSION';
const APP_DIR_NAME = 'app';
const BACKUP_DIR_NAME = 'app.backup';
const STAGING_DIR_NAME = 'app.update';

export interface InstallOptions {
  cwd?: string;
  dryRun?: boolean;
  interactive?: boolean;
  version?: string;
  force?: boolean;
}

export async function install(options: InstallOptions) {
  const cwd = resolveLauncherRoot(options.cwd);

  const appDir = join(cwd, APP_DIR_NAME);
  const backupDir = join(cwd, BACKUP_DIR_NAME);
  const stagingDir = join(cwd, STAGING_DIR_NAME);
  const versionFilePath = join(appDir, VERSION_FILE_NAME);
  const versionFile = Bun.file(versionFilePath);

  let currentVersion = '0.0.0';
  if (await versionFile.exists()) {
    const version = (await versionFile.text()).trim();
    if (isValidSemver(version)) {
      currentVersion = version;
    } else {
      console.warn(`Invalid installed version in ${versionFilePath}. Treating it as not installed.`);
    }
  }

  const resolved =
    options.interactive && !options.version
      ? await askVersion()
      : await resolveVersion(options.version ?? 'stable');

  if (!shouldUpdate(currentVersion, resolved.version)) {
    logNonUpgradeReason(currentVersion, resolved.version);

    if (options.version && options.force) {
      console.log('Force option is enabled, proceeding with installation...');
    } else if (options.interactive) {
      const proceed = await confirmUpdate(currentVersion, resolved.version);
      if (!proceed) {
        console.log('Installation cancelled by user.');
        return;
      }
    } else {
      return;
    }
  }

  console.log(`Downloading version ${resolved.version} from ${resolved.assetsFileUrl}`);
  const downloadedData = await downloadAssetFile(resolved.assetsFileUrl);
  console.log('Download complete.');

  if (options.dryRun) {
    const archive = new Bun.Archive(downloadedData);
    const files = await archive.files();
    console.log(`${files.size} files would be extracted.`);
    console.log(`Dry run complete. discord-mcbe v${resolved.version} would be installed.`);
    return;
  }

  await rm(stagingDir, { recursive: true, force: true });
  try {
    await extractArchive(downloadedData, stagingDir);
    await validateStagedApp(stagingDir, resolved.version);
    console.log(`Application is staged in ${stagingDir}`);

    if (isCompiled) {
      await $`${process.execPath} install`.env({ BUN_BE_BUN: '1' }).cwd(stagingDir);
    } else {
      await $`bun install`.cwd(stagingDir);
    }

    await activateStagedApp(appDir, backupDir, stagingDir);
  } catch (error) {
    await rm(stagingDir, { recursive: true, force: true });
    throw error;
  }

  console.log(`Successfully installed discord-mcbe v${resolved.version}!`);
  if (await pathExists(backupDir)) {
    console.log('The previous installation is available via `updater rollback`.');
  }
}

async function downloadAssetFile(url: string) {
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`Failed to download installer: ${res.status} ${res.statusText}`);
  }

  return await res.bytes();

  // if (!res.body) {
  //   throw new Error('No response body available for download stream');
  // }

  // const totalBytes = Number(res.headers.get('content-length')) || 0;

  // const buffer = totalBytes > 0 ? new Uint8Array(totalBytes) : null;
  // const chunks: Uint8Array[] = buffer ? [] : [];
  // let downloadedBytes = 0;

  // const bar = new SingleBar({
  //   format: 'Downloading [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} bytes',
  // });

  // bar.start(totalBytes > 0 ? totalBytes : 1, 0);

  // try {
  //   if (buffer) {
  //     // content-lengthがある場合
  //     for await (const chunk of res.body) {
  //       buffer.set(chunk, downloadedBytes);
  //       downloadedBytes += chunk.byteLength;
  //       bar.update(downloadedBytes);
  //     }
  //   } else {
  //     for await (const chunk of res.body) {
  //       chunks.push(chunk);
  //       downloadedBytes += chunk.byteLength;
  //       bar.setTotal(downloadedBytes);
  //       bar.update(downloadedBytes);
  //     }
  //   }
  // } finally {
  //   bar.stop();
  // }

  // // If we had a content-length, we filled the buffer directly
  // if (buffer) return buffer;

  // const result = new Uint8Array(downloadedBytes);
  // let offset = 0;
  // for (const chunk of chunks) {
  //   result.set(chunk, offset);
  //   offset += chunk.byteLength;
  // }
  // return result;
}

async function extractArchive(data: Uint8Array, destination: string) {
  const archive = new Bun.Archive(data);
  try {
    process.stdout.write('Extracting archive...');
    await archive.extract(destination);
    console.log(' done');
  } catch (error) {
    console.error('Failed to extract archive:', error);
    throw error;
  }
}

async function validateStagedApp(stagingDir: string, expectedVersion: string): Promise<void> {
  const requiredFiles = ['discord-mcbe.js', 'package.json', VERSION_FILE_NAME];
  for (const file of requiredFiles) {
    if (!(await pathExists(join(stagingDir, file)))) {
      throw new Error(`Invalid release archive: missing ${file}`);
    }
  }

  const stagedVersion = (await readFile(join(stagingDir, VERSION_FILE_NAME), 'utf8')).trim();
  if (!isValidSemver(stagedVersion)) {
    throw new Error(`Invalid release archive version: ${stagedVersion}`);
  }
  if (stagedVersion !== expectedVersion) {
    throw new Error(
      `Release archive version mismatch: expected ${expectedVersion}, received ${stagedVersion}`,
    );
  }
}

async function activateStagedApp(appDir: string, backupDir: string, stagingDir: string): Promise<void> {
  await rm(backupDir, { recursive: true, force: true });

  const hadCurrentApp = await pathExists(appDir);
  if (hadCurrentApp) {
    await rename(appDir, backupDir);
  }

  try {
    await rename(stagingDir, appDir);
  } catch (error) {
    if (hadCurrentApp && !(await pathExists(appDir)) && (await pathExists(backupDir))) {
      await rename(backupDir, appDir);
    }
    throw error;
  }
}

export async function rollback(options: Pick<InstallOptions, 'cwd'> = {}): Promise<void> {
  const cwd = resolveLauncherRoot(options.cwd);
  const appDir = join(cwd, APP_DIR_NAME);
  const backupDir = join(cwd, BACKUP_DIR_NAME);
  const swapDir = join(cwd, 'app.rollback');

  if (!(await pathExists(backupDir))) {
    throw new Error(`No rollback installation found at ${backupDir}`);
  }

  if (!(await pathExists(appDir))) {
    await rename(backupDir, appDir);
    console.log('Rollback complete.');
    return;
  }

  if (await pathExists(swapDir)) {
    throw new Error(`Cannot rollback while ${swapDir} exists`);
  }

  await rename(appDir, swapDir);
  try {
    await rename(backupDir, appDir);
  } catch (error) {
    await rename(swapDir, appDir);
    throw error;
  }

  await rename(swapDir, backupDir);
  console.log('Rollback complete. Run `updater rollback` again to switch back.');
}

function resolveLauncherRoot(cwd?: string): string {
  if (cwd) return resolve(cwd);
  return isCompiled ? dirname(process.execPath) : process.cwd();
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (Error.isError(error) && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  }
}

function logNonUpgradeReason(current: string, target: string): void {
  if (current === target) {
    console.log(`Current version (${current}) is already installed.`);
    return;
  }

  const currentIsPrerelease = isPrerelease(current);
  const targetIsPrerelease = isPrerelease(target);
  if (currentIsPrerelease !== targetIsPrerelease) {
    console.log(`Changing release channel from ${current} to ${target}.`);
    return;
  }

  console.log(`Target version (${target}) is not newer than the current version (${current}).`);
}

export function shouldUpdate(current: string, target: string): boolean {
  if (current === '0.0.0') return true;

  // プレリリース同士、または安定版同士のみ更新判定を行う
  const currentIsPrerelease = isPrerelease(current);
  const targetIsPrerelease = isPrerelease(target);
  if (currentIsPrerelease !== targetIsPrerelease) {
    return false;
  }

  return semver.order(current, target) < 0;
}

function isPrerelease(version: string): boolean {
  return version.split('+', 1)[0]!.includes('-');
}

async function confirmUpdate(current: string, target: string): Promise<boolean> {
  try {
    let message = `Do you want to change version to ${target}?`;
    if (current === target) {
      message = 'Do you want to reinstall it?';
    }

    const proceed = await confirm({
      message,
      default: false,
    });
    return proceed;
  } catch (error) {
    if (!Error.isError(error)) throw error;
    if (error.name !== 'ExitPromptError') throw error;
    process.exit(1);
  }
}
