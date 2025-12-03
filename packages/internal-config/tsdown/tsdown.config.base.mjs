// @ts-check
import { defineConfig as tsdownDefineConfig } from 'tsdown';

/** @type {import('tsdown').Options} */
export const defaultConfig = {
  entry: 'src/index.ts',
  outDir: 'dist',
  external: [/^@minecraft\/(?!vanilla-data|math)[\w-\/]+$/],
  tsconfig: true,
};

/** @type {import('tsdown').Options} */
export const sourceMapConfig = {
  sourcemap: true,
  dts: {
    compilerOptions: {
      declarationMap: true,
    },
  },
};

/**
 * @param {import('tsdown').Options} options
 * @param {boolean} [emitSourceMap]
 */
export function defineConfig(options, emitSourceMap) {
  return tsdownDefineConfig((cliOptions) => ({
    ...defaultConfig,
    ...(emitSourceMap ? sourceMapConfig : {}),
    ...options,
    ...cliOptions,
  }));
}
