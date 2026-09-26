import { type UserConfig, mergeConfig } from 'vite-plus';

export function defineConfig(config: UserConfig, emitSourceMap = false) {
  return mergeConfig(
    {
      ...(config.pack && {
        pack: {
          tsconfig: true,
          dts: true,
          deps: {
            neverBundle: /^@minecraft\/(?!vanilla-data|math)[\w-/]+$/,
          },
          ...(emitSourceMap && {
            sourcemap: true,
            dts: {
              compilerOptions: {
                declarationMap: true,
              },
            },
          }),
        },
      }),
      fmt: {
        ignorePatterns: ['dist/**'],
        singleQuote: true,
        printWidth: 110,
        endOfLine: 'lf',
      },
      lint: {
        ignorePatterns: ['dist/**'],
        options: {
          typeAware: true,
          typeCheck: true,
        },
      },
    },
    config,
  );
}

// predefined config for vscode settings
export default defineConfig({});
