import { defineConfig } from '@discord-mcbe/internal-config/tsdown';

export default defineConfig({
  entry: './src/main.ts',
  format: ['esm'],
  noExternal: ['@script-bridge/protocol'], // 実行時のエラー回避のため
  sourcemap: true,
});
