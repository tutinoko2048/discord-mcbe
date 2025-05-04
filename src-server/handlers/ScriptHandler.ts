import * as fs from 'node:fs';
import * as path from 'node:path';
import { App } from '../main';
import { Logger } from '../util';

export class ScriptHandler {
  private readonly logger: Logger;

  constructor(private readonly app: App) {
    this.logger = new Logger('Script', this.app.config);
  }
  
  async load() {
    const entry = this.app.config.scripts_entry;
    if (!entry) return;
    const exists = fs.existsSync(path.resolve(__dirname, `../../${entry}`));
    if (!exists) {
      this.logger.error(`Failed to load script:\nEntrypoint "${entry}" not found.`);
      return;
    }

    try {
      //TODO - tsならトランスパイルしてから実行する
      
      const script = await import(`../../${entry}`);
      if (typeof script.default !== 'function') {
        this.logger.error(`Failed to load script:\nEntrypoint must export default function`);
        return;
      }

      await script.default(this.app);

      this.logger.info('Loaded!');
    } catch (e) {
      this.logger.error(e);
    }
  }
}
