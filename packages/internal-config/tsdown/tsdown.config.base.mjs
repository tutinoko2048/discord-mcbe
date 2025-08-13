// @ts-check
import { defineConfig as tsdownDefineConfig } from 'tsdown';

/** @type {import('tsdown').Options} */
export const defaultConfig = {
  entry: "src/index.ts",
  outDir: "dist",
  external: [
    /^@minecraft\/(?!vanilla-data|math)[\w-\/]+$/
  ],
}

/**
 * @param {import('tsdown').Options} options 
 */
export function defineConfig(options) {
  return tsdownDefineConfig((cliOptions) => ({
    ...defaultConfig,
    ...options,
    ...cliOptions,
  }))
}