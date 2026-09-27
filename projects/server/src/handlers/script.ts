import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Application } from '../application';
import { Logger, ROOT_DIR } from '../util';

function exposeBundledPackages() {
  const sourceDir = path.join(ROOT_DIR, 'app', 'node_modules', '@discord-mcbe');
  if (!fs.existsSync(sourceDir)) return;

  const targetDir = path.join(ROOT_DIR, 'node_modules', '@discord-mcbe');
  fs.mkdirSync(targetDir, { recursive: true });

  for (const packageName of ['server', 'shared']) {
    const source = path.join(sourceDir, packageName);
    if (!fs.existsSync(source)) continue;
    const target = path.join(targetDir, packageName);
    if (fs.existsSync(target)) {
      if (fs.realpathSync(target) !== fs.realpathSync(source)) {
        throw new Error(`Conflicting package found at "${target}".`);
      }
      continue;
    }
    fs.symlinkSync(source, target, process.platform === 'win32' ? 'junction' : 'dir');
  }
}

export class ScriptHandler {
  private readonly logger: Logger;

  constructor(private readonly app: Application) {
    this.logger = new Logger('Script', this.app.config);

    this.logger.debug('Initialized');
  }

  async start() {
    const scriptConfig = this.app.config.script;
    if (!scriptConfig) return;
    const entryPath = path.resolve(ROOT_DIR, scriptConfig.entry);
    this.logger.debug(`Loading script from "${entryPath}"...`);

    const exists = fs.existsSync(entryPath);
    if (!exists) {
      this.logger.error(`Failed to load script:\nEntrypoint "${scriptConfig.entry}" not found.`);
      return;
    }

    let script: any;
    try {
      exposeBundledPackages();
      script = await import(pathToFileURL(entryPath).href);
    } catch (e) {
      this.logger.error('Failed to load script:');
      console.error(e);
      return;
    }

    if (typeof script.default !== 'function') {
      this.logger.error('Entrypoint must export default function');
      return;
    }

    await Promise.try(script.default, this.app);
  }
}
