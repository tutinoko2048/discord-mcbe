import { Options, UserConfigFn } from 'tsdown';

declare const defaultConfig: Options;

declare function defineConfig(options: Options): UserConfigFn;
