import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: "src/index.ts",
  format: ['esm'],
  external: [
    /^@minecraft\/(?!vanilla-data|math)[\w-\/]+$/
  ],
});
