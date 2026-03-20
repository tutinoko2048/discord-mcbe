import { defineConfig as defineVitePlusConfig, type UserConfig } from 'vite-plus';
import { deepMerge } from '../utils.mts';

type FormatConfig = NonNullable<UserConfig['fmt']>;
const defaultFormatConfig: FormatConfig = {
  ignorePatterns: ['dist/**'],
  singleQuote: true,
  printWidth: 110,
  endOfLine: 'lf',
};

type LintConfig = NonNullable<UserConfig['lint']>;
const defaultLintConfig: LintConfig = {
  ignorePatterns: ['dist/**'],
  options: {
    typeAware: true,
    typeCheck: true,
  },
};

export function defineConfig(config: UserConfig) {
  return defineVitePlusConfig({
    ...config,
    fmt: deepMerge({ ...defaultFormatConfig }, config.fmt ?? {}),
    lint: deepMerge({ ...defaultLintConfig }, config.lint ?? {}),
  });
}

// predefined config for vscode settings
export default defineConfig({});
