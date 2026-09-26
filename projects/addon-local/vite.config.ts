import { defineConfig } from '@discord-mcbe/internal-config/vite';

export default defineConfig({
  pack: {
    entry: 'src/main.ts',
    outDir: 'scripts',
    format: 'esm',
    dts: false,
    sourcemap: true,
    platform: 'neutral',
    deps: {
      alwaysBundle: ['@discord-mcbe/client/local', 'mcbe-ipc'],
      onlyBundle: false,
    },
  },
  fmt: {
    ignorePatterns: [],
  },
});
