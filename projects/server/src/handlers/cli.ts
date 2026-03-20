import * as readline from 'node:readline';
import type { Application } from '../application';
import { Logger } from '../util';

export class CommandLineHandler {
  private readonly app: Application;

  private readonly logger: Logger;

  private readonly reader: readline.Interface;

  constructor(app: Application) {
    this.app = app;
    this.logger = new Logger('CLI', this.app.config);
    this.reader = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.logger.debug('Initialized');
  }

  start() {
    this.reader.on('line', this.handleLine.bind(this));
  }

  stop() {
    this.reader.close();
  }

  private handleLine(line: string): void {
    const command = line.replace(/^\/*/, '');
    if (command.trim() === '') return;
    this.app.minecraft.getWorlds().forEach(async (world) => {
      try {
        const result = await world.runCommand(command);
        this.logger.info(`[${world.name}]`, result);
      } catch (err) {
        this.logger.error(`[${world.name}]`, err);
      }
    });
  }
}
