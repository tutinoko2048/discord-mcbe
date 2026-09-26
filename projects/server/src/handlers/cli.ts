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
    const input = line.trim();
    if (input === '') return;

    if (input.startsWith('.')) {
      this.handleInternalCommand(input);
      return;
    }

    const command = input.replace(/^\/*/, '');
    if (command.trim() === '') return;
    this.app.minecraft.getWorlds().forEach(async (world) => {
      try {
        const result = world.isLocal()
          ? await world.session.world.runCommand(command)
          : await world.runCommand(command);
        this.logger.info(`[${world.name}]`, result);
      } catch (err) {
        const message = Error.isError(err) ? err.message : String(err);
        this.logger.error(`[${world.name}]`, message);
      }
    });
  }

  private handleInternalCommand(input: string): void {
    const [name] = input.slice(1).split(/\s+/);

    switch (name) {
      case 'q':
      case 'quit':
      case 'exit':
      case 'stop':
        void this.app.stop().finally(() => process.exit(0));
        return;
      case 'h':
      case '?':
      case 'help':
        this.logger.info('Internal commands: .help, .list, .exit');
        return;
      case 'ls':
      case 'list': {
        this.logger.info('=== World List ===');
        const worlds = this.app.minecraft.getWorlds();
        if (worlds.length === 0) {
          this.logger.info('- No connected worlds.');
          return;
        }
        for (const world of worlds) {
          const { current, max } = world.getPlayerList();
          this.logger.info(
            `- ${world.name} (${world.isLocal() ? 'Local' : 'BDS'}): ${world.averagePing.toFixed(1)} ms, ${current}${max === undefined ? '' : `/${max}`} players`,
          );
        }
        return;
      }
      default:
        this.logger.warn(`Unknown internal command: ${input}`);
    }
  }
}
