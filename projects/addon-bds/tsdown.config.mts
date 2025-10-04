import { defineConfig } from '@discord-mcbe/internal-config/tsdown';

export default defineConfig({
  entry: 'src/main.ts',
  outDir: 'scripts',
  format: 'esm',
  sourcemap: true,
  noExternal: ['@discord-mcbe/client-bds'],
});
