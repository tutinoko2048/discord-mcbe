import { join } from 'node:path';

export const ROOT_DIR = process.cwd();

export const DATA_DIR = join(ROOT_DIR, '.discord-mcbe');

const launcherVersion = process.env.LAUNCHER_VERSION;
const parsedLauncherVersion = Number(launcherVersion);
export const LAUNCHER_VERSION =
  launcherVersion?.trim() && Number.isSafeInteger(parsedLauncherVersion) && parsedLauncherVersion >= 0
    ? parsedLauncherVersion
    : undefined;
