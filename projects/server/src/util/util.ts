import * as z from 'zod';
import { envSchema, type Env } from '../types';

import type { ExtractOptional } from '@discord-mcbe/shared';

import logo from '../assets/logo.json' with { type: 'json' };

export function renderLogo() {
  const decodedLogo = Buffer.from(logo.data, 'base64').toString('utf-8');
  console.log(decodedLogo);
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
