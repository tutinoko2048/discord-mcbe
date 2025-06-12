import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: "src/main.ts",
  outDir: "scripts",
  format: ['esm'],
  external: /^@minecraft\/(?!vanilla-data$|math$)[^/]+$/,
  noExternal: /.*/,
  sourcemap: true,
});
