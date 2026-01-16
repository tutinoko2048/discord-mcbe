import * as fs from 'node:fs';
import * as path from 'node:path';
import { jsonc } from 'jsonc';
import { ROOT_DIR } from './environment';
import { type Config, configSchema } from '../types';

import logo from '../assets/logo.json' with { type: 'json' };

export function renderLogo() {
  const decodedLogo = Buffer.from(logo.data, 'base64').toString('utf-8');
  console.log(decodedLogo);
}

export const CONFIG_FILE = path.join(ROOT_DIR, 'config.jsonc');

export function loadConfig(): Config {
  const parsed: Config = jsonc.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));

  try {
    return configSchema.parse(parsed);
  } catch (e) {
    console.error('Failed to load config.jsonc');
    console.error(e);
    process.exit(1);
  }
}
