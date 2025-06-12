import * as readline from 'node:readline';
import { Application } from '../main';
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
      output: process.stdout
    });
    this.reader.on('line', this.handleLine.bind(this));

    this.logger.debug('Initialized');
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
      this.app.minecraft.broadcastCommand(command).then(res => console.log(res));
    }
  }
}