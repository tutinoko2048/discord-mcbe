import { defineConfig, type Options } from 'tsdown';
import defaultConfig from '@discord-mcbe/internal-config/tsdown';

export default defineConfig((options: Options) => ({
  ...defaultConfig,

  entry: 'src/main.ts',
  outDir: 'scripts',
  format: ['esm'],
  sourcemap: true,

  ...options,
}));
