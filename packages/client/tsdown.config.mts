import { defineConfig } from '@discord-mcbe/internal-config/tsdown';

const isDev = process.env.CI !== 'true';

export default defineConfig(
  {
    entry: {
      bds: 'src/bds.ts',
      local: 'src/local.ts',
    },
    define: {
      __DEV__: String(isDev),
    },
    exports: true,
  },
  isDev,
);
