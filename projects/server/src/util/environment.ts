import { join } from 'node:path';

const isExecutable = typeof __BUN_EXE__ !== 'undefined';

export const ROOT_DIR = isExecutable ? join(process.cwd()) : join(process.cwd(), './');

export const DATA_DIR = join(ROOT_DIR, '.discord-mcbe');
