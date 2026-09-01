import { defineConfig } from '@discord-mcbe/internal-config/vite';

export default defineConfig({
  pack: {
    entry: 'src/main.ts',
    outDir: 'scripts',
    format: 'esm',
    platform: 'neutral',
    dts: false,
    sourcemap: true,
    deps: {
      alwaysBundle: ['@discord-mcbe/client/bds'],
      onlyBundle: false,
    },
  },
  fmt: {
    ignorePatterns: [],
  },
});
