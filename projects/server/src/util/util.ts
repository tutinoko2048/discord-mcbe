import * as fs from 'node:fs';
import * as path from 'node:path';
import { jsonc } from 'jsonc';
import { dim } from 'colorette';
import * as z from 'zod';
import { ROOT_DIR } from './environment';
import { configSchema, envSchema, type Config, type Env } from '../types';

import type { ExtractOptional } from '@discord-mcbe/shared';

import logo from '../assets/logo.json' with { type: 'json' };
import configJson from '../assets/config.json' with { type: 'json' };

export function renderLogo() {
  const decodedLogo = Buffer.from(logo.data, 'base64').toString('utf-8');
  console.log(decodedLogo);
}

export const CONFIG_FILE = path.join(ROOT_DIR, 'config.json');

export type MergedConfig = {
  [K in keyof Config]-?: ExtractOptional<Config[K]>;
};

type DefaultConfig = MergedConfig;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function setMerged<K extends keyof Config>(
  merged: MergedConfig,
  key: K,
  value: Config[K],
  defaultValue: DefaultConfig[K]
): void {
  if (isPlainObject(value) && isPlainObject(defaultValue)) {
    const valueObj = value as Record<string, unknown>;
    const defaultObj = defaultValue as Record<string, unknown>;
    merged[key] = { ...defaultObj, ...valueObj } as MergedConfig[K];
    return;
  }

  merged[key] = value as MergedConfig[K];
}

export function mergeConfig(defaultConfig: DefaultConfig, parsedConfig: Config): MergedConfig {
  const merged: MergedConfig = { ...defaultConfig };
  for (const key of Object.keys(parsedConfig) as Array<keyof Config>) {
    const value = parsedConfig[key];
    if (value === undefined) continue;

    const defaultValue = defaultConfig[key];
    setMerged(merged, key, value, defaultValue);
  }
  return merged;
}

export function loadConfig(defaultConfig: DefaultConfig): MergedConfig {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.info(dim('[!] config.json not found. Creating default config.json...'));
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configJson, null, 2), 'utf-8');
  }

  const configData: Config = jsonc.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));

  const parsedConfig = configSchema.safeParse(configData);
  if (!parsedConfig.success) {
    console.error('-'.repeat(24));
    console.error('Invalid config.json:');
    console.error(z.prettifyError(parsedConfig.error));
    console.error('-'.repeat(24));
    process.exit(1);
  }

  return mergeConfig(defaultConfig, parsedConfig.data);
}

export function loadEnv(defaultEnv: ExtractOptional<Env>): Required<Env> {
  const parsedEnv = envSchema.safeParse(process.env);
  if (!parsedEnv.success) {
    console.error('-'.repeat(24));
    console.error('Invalid environment variables:');
    console.error(z.prettifyError(parsedEnv.error));
    console.error('-'.repeat(24));
    process.exit(1);
  }

  return Object.assign(defaultEnv, parsedEnv.data);
}
