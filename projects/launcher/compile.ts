import * as fs from 'node:fs/promises';
import { join, basename } from 'node:path';
// import packageJson from './package.json' with { type: 'json' };

const windowsOption: Bun.CompileBuildOptions['windows'] = {
  // adding metadata causes: "error: Failed to set Windows metadata: FailedToCommit"
  // icon: 'assets/discord-mcbe.ico',
  // title: 'discord-mcbe updater',
  // version: packageJson.version,
};

const platforms = [
  { name: 'windows', run: 'assets/run.bat', ext: '.exe', targets: ['windows-x64'] },
  {
    name: 'linux',
    run: 'assets/run.sh',
    ext: '',
    targets: ['linux-x64', 'linux-arm64', 'darwin-x64', 'darwin-arm64'],
  },
] as const;

for (const platform of platforms) {
  for (const target of platform.targets) {
    console.log(`[${target}] Building...`);

    const targetDir = join('build', target);
    await fs.mkdir(targetDir, { recursive: true });

    // copy run script
    await fs.copyFile(platform.run, join(targetDir, basename(platform.run)));

    // compile with bun
    const startAt = Date.now();
    await Bun.build({
      entrypoints: ['src/main.ts'],
      compile: {
        target: `bun-${target}`,
        outfile: join(targetDir, `updater${platform.ext}`),
        windows: windowsOption,
      },
      define: {
        __COMPILED__: 'true',
      },
    });

    console.log(`[${target}] Build complete in ${Date.now() - startAt}ms.`);
  }
}
