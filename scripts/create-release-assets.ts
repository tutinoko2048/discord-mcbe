import { exists, mkdir, rm, writeFile } from "fs/promises";
import { join } from 'path';
import { MINIMUM_LAUNCHER_VERSION } from '../packages/shared/src/constants/common';
import type { ReleaseMetadata } from "../projects/launcher/src/version";

const version = process.argv[2];
if (!version) {
  console.error("Usage: pnpm run create-release-zip <version>");
  process.exit(1);
}


const APP_ENTRY_NAME = "discord-mcbe.js";
const TARGET_DIR = join(process.cwd(), ".release-temp");
const ASSETS_DIR = join(process.cwd(), "projects", "launcher", "assets");

// clean target dir
if (await exists(TARGET_DIR)) {
  await rm(TARGET_DIR, { recursive: true, force: true });
}
await mkdir(TARGET_DIR, { recursive: true });

// update dependencies in package.json
const packageJson = {
  "name": "discord-mcbe-assets",
  "private": true,
  "dependencies": {
    "@discord-mcbe/server": version,
    "@discord-mcbe/client": version,
    "@discord-mcbe/shared": version,
  }
};

// create archive
const archive = new Bun.Archive({
  'package.json': JSON.stringify(packageJson, null, 2),
  [APP_ENTRY_NAME]: await Bun.file(join(ASSETS_DIR, APP_ENTRY_NAME)).text(), // Bun.fileをそのまま渡せるはずなのに機能しなかったため
  '.VERSION': version,
}, { compress: 'gzip' });
const archivePath = join(TARGET_DIR, '_assets.tar.gz');
await Bun.write(archivePath, archive);
console.log(`Created release assets archive at ${archivePath}`);


const metadata: ReleaseMetadata = {
  minimumLauncherVersion: MINIMUM_LAUNCHER_VERSION,
};

const versionJsonPath = join(TARGET_DIR, "_metadata.json");
await writeFile(versionJsonPath, JSON.stringify(metadata, null, 2));

console.log(`Created _metadata.json for version ${version} at ${versionJsonPath}`);
