import { $ } from 'bun';
import { join, resolve } from 'node:path';
import { SingleBar } from 'cli-progress';
import { askVersion, resolveVersion } from './version';
import { isCompiled } from './env';

export interface InstallOptions {
  cwd?: string;
  dryRun?: boolean;
  interactive?: boolean;
  tag?: string;
}

export async function install(options: InstallOptions) {
  const cwd = options.cwd ? resolve(options.cwd) : process.cwd();
  console.debug('cwd:', cwd);
  console.debug('install options', options);

  const appDir = join(cwd, 'app');

  const resolved = options.interactive ? await askVersion() : await resolveVersion(options.tag ?? 'latest');

  console.log(`Downloading version ${resolved.version} from ${resolved.assetFileUrl}`);
  const downloadedData = await downloadAssetFile(resolved.assetFileUrl);
  console.log('Download complete.');

  console.log('Installing...');
  await extractArchive(downloadedData, appDir, options.dryRun);
  console.log(`Installation complete. Application is extracted to ${appDir}`);

  // install discord-mcbe packages
  if (options.dryRun) {
    console.log('Dry run enabled, skipping package installation.');
  } else {
    if (isCompiled) {
      await $`../updater install`
        .env({ BUN_BE_BUN: '1' })
        .cwd(appDir);
    } else {
      await $`bun install`.cwd(appDir);
    }
  }

  console.log(`Successfully installed discord-mcbe v${resolved.version}!`);
}

async function downloadAssetFile(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download installer: ${res.status} ${res.statusText}`);
  }

  if (!res.body) {
    throw new Error('No response body available for download stream');
  }

  const totalBytes = Number(res.headers.get('content-length')) || 0;

  const buffer = totalBytes > 0 ? new Uint8Array(totalBytes) : null;
  const chunks: Uint8Array[] = buffer ? [] : [];
  let downloadedBytes = 0;

  const bar = new SingleBar({
    format: 'Downloading [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} bytes',
  });

  bar.start(totalBytes > 0 ? totalBytes : 1, 0);

  try {
    if (buffer) {
      // content-lengthがある場合
      for await (const chunk of res.body) {
        buffer.set(chunk, downloadedBytes);
        downloadedBytes += chunk.byteLength;
        bar.update(downloadedBytes);
      }
    } else {
      for await (const chunk of res.body) {
        chunks.push(chunk);
        downloadedBytes += chunk.byteLength;
        bar.setTotal(downloadedBytes);
        bar.update(downloadedBytes);
      }
    }
  } finally {
    bar.stop();
  }

  // If we had a content-length, we filled the buffer directly
  if (buffer) return buffer;

  const result = new Uint8Array(downloadedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
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
