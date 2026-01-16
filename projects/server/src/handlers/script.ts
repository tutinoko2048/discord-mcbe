import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Application } from '../application';
import { Logger, ROOT_DIR } from '../util';

export class ScriptHandler {
  private readonly logger: Logger;

  constructor(private readonly app: Application) {
    this.logger = new Logger('Script', this.app.config);

    this.logger.debug('Initialized');
  }

  async start() {
    const entry = this.app.config.scripts_entry;
    if (!entry) return;
    const entryPath = path.resolve(ROOT_DIR, entry);
    this.logger.debug(`Loading script from "${entryPath}"...`);

    const exists = fs.existsSync(entryPath);
    if (!exists) {
      this.logger.error(`Failed to load script:\nEntrypoint "${entry}" not found.`);
      return;
    }

    // biome-ignore lint/suspicious/noExplicitAny: this is any
    let script: any;
    try {
      //TODO - tsならトランスパイルしてから実行する
      script = await import(`file://${entryPath}`);
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
