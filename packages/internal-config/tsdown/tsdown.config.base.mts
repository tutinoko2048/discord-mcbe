import { defineConfig as tsdownDefineConfig, type DepsConfig, type UserConfig } from 'tsdown';
import { deepMerge } from '../utils.mts';

const defaultDepsConfig: DepsConfig = {
  neverBundle: /^@minecraft\/(?!vanilla-data|math)[\w-/]+$/,
};

export const defaultConfig: UserConfig = {
  entry: 'src/index.ts',
  outDir: 'dist',
  tsconfig: true,
  dts: true,
};

export const sourceMapConfig: UserConfig = {
  sourcemap: true,
  dts: {
    compilerOptions: {
      declarationMap: true,
    },
  },
};

export function defineConfig(options: UserConfig, emitSourceMap?: boolean) {
  return tsdownDefineConfig((cliOptions) => ({
    ...defaultConfig,
    ...(emitSourceMap && sourceMapConfig),
    ...options,
    ...cliOptions,
    deps: deepMerge(defaultDepsConfig, { ...options.deps, ...cliOptions.deps }),
  }));
}
