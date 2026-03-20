import { resolve } from 'node:path';
import { SingleBar } from 'cli-progress';
import { askVersion, resolveVersion } from './version';

import packageJson from '../assets/package.json' with { type: 'json' };

export interface InstallOptions {
  cwd?: string;
  dryRun?: boolean;
  interactive?: boolean;
  /** latest, beta, specific versions are accepted */
  tag?: string;
}

export async function install(options: InstallOptions) {
  const cwd = options.cwd ?? process.cwd();
  console.debug('install', options);

  const resolved = options.interactive ? await askVersion() : await resolveVersion(options.tag ?? 'latest');
  console.log(`Installing version ${resolved.version} from ${resolved.asset_url}`);

  const downloadedData = await downloadFile(resolved.asset_url);
  console.log('Download complete.');

  await extractArchive(downloadedData, resolve(cwd, 'app'), options.dryRun);

  // init package.json
  const packageJsonPath = resolve(cwd, 'app', 'package.json');
  if (options.dryRun) {
    console.log(`Dry run enabled, skipping writing package.json to ${packageJsonPath}`);
  } else {
    await Bun.write(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`Initialized package.json at ${packageJsonPath}`);
  }

  // install discord-mcbe packages
  const packages = ['@discord-mcbe/server', '@discord-mcbe/shared'];
  await Bun.$`../updater add -E ${packages.map((p) => `${p}@${resolved.version}`).join(' ')}`
    .env({ BUN_BE_BUN: '1' })
    .cwd(resolve(cwd, 'app'));

  await Bun.write(resolve(cwd, 'app', '.VERSION'), resolved.version);
}

async function downloadFile(url: string): Promise<Uint8Array> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download installer: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('No response body available for download stream');
  }

  const totalBytes = Number(response.headers.get('content-length')) || 0;

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
      for await (const chunk of response.body) {
        buffer.set(chunk, downloadedBytes);
        downloadedBytes += chunk.byteLength;
        bar.update(downloadedBytes);
      }
    } else {
      for await (const chunk of response.body) {
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
