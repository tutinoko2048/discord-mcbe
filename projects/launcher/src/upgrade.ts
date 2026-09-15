import { chmod, rename, rm, writeFile } from 'node:fs/promises';
import confirm from '@inquirer/confirm';
import { SingleBar } from 'cli-progress';
import pc from 'picocolors';
import { isCompiled } from './env';
import { LauncherError } from './errors';
import { fetchWithRetry } from './fetch';
import { withSpinner } from './spinner';
import { findLauncherUpgrade } from './version';

const CHECK_TIMEOUT_MS = 15_000;

interface UpgradeOptions {
  dryRun?: boolean;
  interactive?: boolean;
  version?: string;
}

export async function upgradeLauncher(options: UpgradeOptions = {}): Promise<boolean> {
  const target = typeof LAUNCHER_TARGET === 'string' ? LAUNCHER_TARGET : inferLauncherTarget();
  const version = parseLauncherVersion(options.version);
  const release = await withSpinner('Checking for launcher updates...', () =>
    findLauncherUpgrade(target, version, AbortSignal.timeout(CHECK_TIMEOUT_MS)),
  );

  if (!release) {
    console.log(pc.dim(`[upgrade] discord-mcbe launcher is up to date.`));
    return false;
  }

  if (options.interactive && !options.dryRun && !(await confirmUpgrade(release.version))) return false;

  const updaterData = await downloadLauncher(release.assetUrl, release.size);
  verifyLauncherChecksum(updaterData, release.digest);
  if (options.dryRun) {
    console.log(
      `[upgrade] Dry run complete. discord-mcbe launcher v${release.version} was downloaded and verified.`,
    );
    return false;
  }
  if (!isCompiled) throw new LauncherError('Launcher self-update is only available in a compiled launcher.');

  const current = process.execPath;
  const next = `${current}.new`;
  const previous = `${current}.old`;
  await rm(next, { force: true });
  await writeFile(next, updaterData);
  if (process.platform !== 'win32') await chmod(next, 0o755);

  try {
    await replaceLauncher(current, next, previous);
  } catch (error) {
    await rm(next, { force: true }).catch(() => {});
    throw error;
  }

  console.log(
    `[upgrade] Successfully updated discord-mcbe launcher to v${release.version}. Restart the launcher.`,
  );
  return true;
}

export async function downloadLauncher(url: string, size: number): Promise<Uint8Array> {
  const response = await fetchWithRetry(url);
  if (!response.ok) {
    throw new LauncherError(`Failed to download launcher: ${response.status} ${response.statusText}`);
  }
  if (!response.body) throw new LauncherError('Launcher download has no response body.');

  const data = new Uint8Array(size);
  let downloaded = 0;
  const progress = process.stdout.isTTY
    ? new SingleBar({ format: 'Downloading [{bar}] {percentage}% | {value}/{total} bytes' })
    : undefined;
  progress?.start(size, 0);
  try {
    for await (const chunk of response.body) {
      if (downloaded + chunk.byteLength > size)
        throw new LauncherError('Launcher download exceeds its expected size.');
      data.set(chunk, downloaded);
      downloaded += chunk.byteLength;
      progress?.update(downloaded);
    }
  } finally {
    progress?.stop();
  }

  if (downloaded !== size)
    throw new LauncherError(`Launcher download is incomplete: ${downloaded}/${size} bytes.`);
  return data;
}

export async function cleanupOldLauncher(): Promise<void> {
  if (isCompiled) {
    await rm(`${process.execPath}.old`, { force: true }).catch(() => {});
  }
}

export async function replaceLauncher(current: string, next: string, previous: string): Promise<void> {
  await rm(previous, { force: true });
  await rename(current, previous);

  try {
    await rename(next, current);
  } catch (error) {
    // rollback
    try {
      await rename(previous, current);
    } catch (rollbackError) {
      throw new LauncherError(
        `Failed to install launcher: ${getErrorMessage(error)}\n` +
          `Failed to rollback launcher: ${getErrorMessage(rollbackError)}`,
      );
    }

    throw new LauncherError(
      `Failed to install launcher: ${getErrorMessage(error)}\n` +
        `The previous launcher was restored from "${previous}".`,
    );
  }
}

function getErrorMessage(error: unknown): string {
  if (Error.isError(error)) return error.message;
  return String(error);
}

export function verifyLauncherChecksum(data: Uint8Array, digest: string): void {
  const expected = /^sha256:([a-f\d]{64})$/i.exec(digest)?.[1]?.toLowerCase();
  if (!expected) throw new LauncherError('Invalid launcher digest.');

  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(data);
  if (hasher.digest('hex') !== expected) throw new LauncherError('Launcher checksum does not match.');
}

function inferLauncherTarget(): string {
  let platform: string | undefined;
  if (process.platform === 'win32') platform = 'windows';
  if (process.platform === 'linux') platform = 'linux';
  if (process.platform === 'darwin') platform = 'darwin';
  if (!platform || (process.arch !== 'x64' && process.arch !== 'arm64')) {
    throw new LauncherError(`Launcher self-update is not supported on ${process.platform}-${process.arch}.`);
  }
  return `${platform}-${process.arch}`;
}

function parseLauncherVersion(value?: string): number | undefined {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new LauncherError(`Invalid launcher version: ${value}`);
  }
  return Number(value);
}

async function confirmUpgrade(version: number): Promise<boolean> {
  try {
    return await confirm({
      message: `Launcher v${version} is available. Upgrade now?`,
      default: true,
    });
  } catch (error) {
    if (!Error.isError(error) || error.name !== 'ExitPromptError') throw error;
    process.exit(1);
  }
}
