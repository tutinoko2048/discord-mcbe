import { defineConfig } from '@discord-mcbe/internal-config/vite';

const isDev = process.env.CI !== 'true';

export default defineConfig(
  {
    pack: {
      entry: './src/index.ts',
      format: ['esm'],
      exports: {
        devExports: 'dev',
      },
    },
    fmt: {
      ignorePatterns: [
        'src/types/lang.generated.ts',
        'schema.config.json',
        'src/types/config.ts',
        'src/types/env.ts',
      ],
    },
  },
  isDev,
);
