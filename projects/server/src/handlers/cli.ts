import * as readline from 'node:readline';
import type { Application } from '../application';
import { Logger } from '../util';

export class CommandLineHandler {
  private readonly app: Application;

  private readonly logger: Logger;

  private readonly reader: readline.Interface;

  constructor(app: Application) {
    this.app = app;
    this.logger = new Logger('CommandLine', this.app.config);
    this.reader = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.logger.debug('Initialized');
  }

  start() {
    this.reader.on('line', this.handleLine.bind(this));
  }

  private handleLine(line: string): void {
    if (line.startsWith('.')) {
      try {
        const res = eval(line.slice(1));
        console.log('<', res);
      } catch (e) {
        console.error('<', e);
      }
    } else {
      const command = line.replace(/^\/*/, '');
      if (command.trim() === '') return;
      this.app.minecraft.getWorlds().map(async (world) => {
        try {
          const result = await world.runCommand(command);
          console.log(`[${world.name}]`, result);
        } catch (err: any) {
          console.error(`[${world.name}] Error: ${err.message}`);
        }
      });
    }
  }
}
