import * as fs from 'node:fs';
import * as path from 'node:path';
import { jsonc } from 'jsonc';
import { dim } from 'colorette';
import * as z from 'zod';
import { ROOT_DIR } from './environment';
import { configSchema, type Config } from '../types';

export const CONFIG_FILE = path.join(ROOT_DIR, 'config.json');

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function deepMergeValue(
  defaultValue: unknown,
  userValue: unknown,
  pathSegments: string[],
  unknownKeys: string[],
): unknown {
  if (userValue === undefined) {
    return cloneValue(defaultValue);
  }

  if (isPlainObject(defaultValue)) {
    if (!isPlainObject(userValue)) {
      return userValue;
    }

    const defaultObj = defaultValue as Record<string, unknown>;
    const userObj = userValue as Record<string, unknown>;
    const defaultKeys = Object.keys(defaultObj);

    if (defaultKeys.length === 0) {
      return cloneValue(userObj);
    }

    const mergedObj: Record<string, unknown> = {};
    for (const key of defaultKeys) {
      mergedObj[key] = deepMergeValue(defaultObj[key], userObj[key], [...pathSegments, key], unknownKeys);
    }

    for (const key of Object.keys(userObj)) {
      if (!(key in defaultObj)) {
        unknownKeys.push([...pathSegments, key].join('.'));
      }
    }

    return mergedObj;
  }

  if (Array.isArray(defaultValue)) {
    return Array.isArray(userValue) ? cloneValue(userValue) : userValue;
  }

  return userValue;
}

export function mergeConfig(defaultConfig: Config, rawConfig: unknown): Config {
  if (!isPlainObject(rawConfig)) {
    return cloneValue(defaultConfig);
  }

  const unknownKeys: string[] = [];
  const merged = deepMergeValue(defaultConfig, rawConfig, [], unknownKeys);

  if (unknownKeys.length > 0) {
    console.warn(dim(`[!] Unknown config keys were ignored: ${unknownKeys.join(', ')}`));
  }

  const parsedConfig = configSchema.safeParse(merged);
  if (!parsedConfig.success) {
    console.error('-'.repeat(24));
    console.error('Invalid config.json:');
    console.error(z.prettifyError(parsedConfig.error));
    console.error('-'.repeat(24));
    process.exit(1);
  }

  return parsedConfig.data;
}

export function loadConfig(defaultConfig: Config): Config {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.info(dim('[!] config.json not found. Creating default config.json...'));
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  }

  const configData: unknown = jsonc.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));

  return mergeConfig(defaultConfig, configData);
}
