import { defineConfig as tsdownDefineConfig, type Options } from 'tsdown';

export const defaultConfig: Options = {
  entry: 'src/index.ts',
  outDir: 'dist',
  external: [/^@minecraft\/(?!vanilla-data|math)[\w-\/]+$/],
  tsconfig: true,
};

export const sourceMapConfig: Options = {
  sourcemap: true,
  dts: {
    compilerOptions: {
      declarationMap: true,
    },
  },
};

export function defineConfig(options: Options, emitSourceMap?: boolean) {
  return tsdownDefineConfig((cliOptions) => ({
    ...defaultConfig,
    ...(emitSourceMap ? sourceMapConfig : {}),
    ...options,
    ...cliOptions,
  }));
}
