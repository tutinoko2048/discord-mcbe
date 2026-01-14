import * as path from 'node:path';

export const ROOT_DIR =
  typeof __BUN_EXE__ === 'undefined' ? path.join(process.cwd(), '../../') : path.join(process.cwd());
