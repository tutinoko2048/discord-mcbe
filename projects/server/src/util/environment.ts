import { join } from 'node:path';

export const ROOT_DIR = process.cwd();

export const DATA_DIR = join(ROOT_DIR, '.discord-mcbe');

export const LAUNCHER_VERSION = 'LAUNCHER_VERSION' in process.env ? Number(process.env.LAUNCHER_VERSION) : 1;
