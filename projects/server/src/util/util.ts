import * as fs from 'node:fs';
import * as path from 'node:path';
import { jsonc } from 'jsonc';
import { ROOT_DIR } from './environment';
import { configSchema, envSchema, type Config, type Env } from '../types';

import logo from '../assets/logo.json' with { type: 'json' };
import type { ExtractOptional } from '@discord-mcbe/shared';

export function renderLogo() {
  const decodedLogo = Buffer.from(logo.data, 'base64').toString('utf-8');
  console.log(decodedLogo);
}

export const CONFIG_FILE = path.join(ROOT_DIR, 'config.jsonc');

export function loadConfig(defaultConfig: ExtractOptional<Config>): Required<Config> {
  const configData: Config = jsonc.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));

  const parsedConfig = configSchema.safeParse(configData);
  if (!parsedConfig.success) {
    console.error('Invalid config.jsonc:');
    console.error(parsedConfig.error.format());
    process.exit(1);
  }

  return Object.assign(defaultConfig, parsedConfig.data);
}

export function loadEnv(defaultEnv: ExtractOptional<Env>): Required<Env> {
  const parsedEnv = envSchema.safeParse(process.env);
  if (!parsedEnv.success) {
    console.error('Invalid environment variables:');
    console.error(parsedEnv.error.format());
    process.exit(1);
  }

  return Object.assign(defaultEnv, parsedEnv.data);
}
