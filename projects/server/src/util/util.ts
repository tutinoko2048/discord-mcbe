import * as fs from 'node:fs';
import * as path from 'node:path';
import { jsonc } from 'jsonc';
import { Config, configSchema } from '../types';

const MAIN_DIR = path.join(__dirname, '../../../../');
const DATA_DIR = '.discord-mcbe';
const DATA_PATH = path.join(MAIN_DIR, DATA_DIR, 'data.json');
const CONFIG_FILE = path.join(MAIN_DIR, 'config.jsonc');

export function loadConfig(): Config {
  const parsed: Config = jsonc.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));

  // inject DISCORD_TOKEN from env if exists
  if ('DISCORD_TOKEN' in process.env) parsed['discord_token'] ||= process.env.DISCORD_TOKEN!;
  
  try {
    return configSchema.parse(parsed);
  } catch (e) {
    console.error('Failed to load config.jsonc');
    console.error(e);
    process.exit(1);
  }
}

function fetchData(): Record<string, any> {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const file = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(file);
  } catch {
    return {};
  }
}

export function getData<T>(key: string): T {
  return fetchData()[key];
}

export function setData<T>(key: string, value: T): void {
  const data = fetchData();
  data[key] = value;

  return fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}