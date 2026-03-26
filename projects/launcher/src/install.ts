import { $, semver } from 'bun';
import { join, resolve } from 'node:path';
import { exists } from 'fs/promises';
import confirm from '@inquirer/confirm';
// import { SingleBar } from 'cli-progress';
import { askVersion, resolveVersion } from './version';
import { isCompiled } from './env';

const VERSION_FILE_NAME = '.VERSION';

export interface InstallOptions {
  cwd?: string;
  dryRun?: boolean;
  interactive?: boolean;
  version?: string;
  force?: boolean;
}

export async function install(options: InstallOptions) {
  const cwd = options.cwd ? resolve(options.cwd) : process.cwd();

  const appDir = join(cwd, 'app');
  const versionFilePath = join(appDir, VERSION_FILE_NAME);

  let currentVersion = '0.0.0';
  if (await exists(versionFilePath)) {
    currentVersion = (await Bun.file(versionFilePath).text()).trim();
  }

  const resolved =
    options.interactive && !options.version
      ? await askVersion()
      : await resolveVersion(options.version ?? 'latest');

  if (!shouldUpdate(currentVersion, resolved.version)) {
    console.log(`Current version (${currentVersion}) is up to date. No update needed.`);

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

  await extractArchive(downloadedData, appDir, options.dryRun);
  console.log(`Application is extracted to ${appDir}`);

  // install discord-mcbe packages
  if (options.dryRun) {
    console.log('Dry run enabled, skipping package installation.');
  } else {
    if (isCompiled) {
      await $`../updater install`.env({ BUN_BE_BUN: '1' }).cwd(appDir);
    } else {
      await $`bun install`.cwd(appDir);
    }
  }

  console.log(`Successfully installed discord-mcbe v${resolved.version}!`);
}

async function downloadAssetFile(url: string) {
  const res = await fetch(url);
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

async function extractArchive(data: Uint8Array, destination: string, dryRun?: boolean) {
  const archive = new Bun.Archive(data);
  try {
    if (dryRun) {
      const files = await archive.files();
      console.log('Dry run enabled, skipping extraction.');
      console.log(`${files.keys().toArray().length} files will be extracted.`);
    } else {
      process.stdout.write('Extracting archive...');
      await archive.extract(destination);
      console.log(' done');
    }
  } catch (error) {
    console.error('Failed to extract archive:', error);
    throw error;
  }
}

export function shouldUpdate(current: string, target: string): boolean {
  if (current === '0.0.0') return true;

  // プレリリース同士、または安定版同士のみ更新判定を行う
  const currentIsPrerelease = current.split('+', 1)[0]!.includes('-');
  const targetIsPrerelease = target.split('+', 1)[0]!.includes('-');
  if (currentIsPrerelease !== targetIsPrerelease) {
    return false;
  }

  return semver.order(current, target) < 0;
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
