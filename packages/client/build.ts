import { build, type Options } from 'tsdown';
import { defaultConfig, sourceMapConfig } from '@discord-mcbe/internal-config/tsdown';

const isDev = process.env.CI !== "true";
const isWatch = process.argv.includes('--watch');

const config: Options = {
  ...defaultConfig,
  ...(isDev ? sourceMapConfig : {}),
}


await build({
  ...config,
  entry: 'src/bds.ts',
  clean: true,
  watch: isWatch,
});

await build({
  ...config,
  entry: 'src/local.ts',
  clean: false, // do not clean to preserve BDS Client build
  watch: isWatch,
});
