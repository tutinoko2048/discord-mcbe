import { Options, UserConfigFn } from 'tsdown';

declare const defaultConfig: Options;

declare const sourceMapConfig: Options;

declare function defineConfig(options: Options, emitSourceMap?: boolean): UserConfigFn;
