import { defineConfig } from '@discord-mcbe/internal-config/vite';

const isDev = process.env.CI !== 'true';

export default defineConfig(
  {
    pack: {
      entry: {
        bds: 'src/bds.ts',
        local: 'src/local.ts',
      },
      define: {
        __DEV__: String(isDev),
      },
      exports: true,
    },
    fmt: {
      ignorePatterns: [],
    },
  },
  isDev,
);
