import { defineConfig } from '@discord-mcbe/internal-config/vite';

const isDev = process.env.CI !== 'true';

export default defineConfig(
  {
    pack: {
      format: ['esm', 'cjs'],
      exports: true,
    },
    fmt: {
      ignorePatterns: [],
    },
  },
  isDev,
);
