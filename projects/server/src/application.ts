import { ExtendedEmitter } from 'socket-be';
import { VERSION, type ExtractOptional } from '@discord-mcbe/shared';
import { DiscordBot } from './discord';
import { MinecraftHandler } from './minecraft';
import { EventHandler, CommandLineHandler, ScriptHandler } from './handlers';
import {
  Logger,
  PropertyManager,
  LAUNCHER_VERSION,
  _t,
  loadConfig,
  initialize as initializeLang,
  loadEnv,
} from './util';
import { checkForUpdates } from './util/version-check';
import { StartupEvent } from './events';
import { defaultConfig } from './assets/default-config';

import type { ApplicationEvents, Config, Env } from './types';

const defaultEnv: ExtractOptional<Env> = {
  DISCORD_WEBHOOK_URL: '',
  SOCKET_PORT: 3063,
  BRIDGE_PORT: 23191,
};

export class Application extends ExtendedEmitter<ApplicationEvents> {
  public readonly version: string;
  public readonly env: Required<Env>;
  public readonly config: Config;
  public readonly logger: Logger;
  public readonly properties: PropertyManager;
  public readonly bot: DiscordBot;
  public readonly minecraft: MinecraftHandler;
  private readonly cli: CommandLineHandler;
  private readonly scripts: ScriptHandler;
  private readonly events: EventHandler;

  public readonly initializedAt: number = Date.now();

  constructor() {
    super();

    console.log(`Starting discord-mcbe v${VERSION}...`);

    this.version = VERSION;

    this.env = loadEnv(defaultEnv);

    this.properties = new PropertyManager();

    this.config = loadConfig(defaultConfig);

    initializeLang(this.config.language, this.config.translation_overrides as Record<string, string>);

    this.logger = new Logger('App', this.config);

    this.bot = new DiscordBot(this);

    this.minecraft = new MinecraftHandler(this);

    this.cli = new CommandLineHandler(this);

    this.scripts = new ScriptHandler(this);

    this.events = new EventHandler(this);

    this.logger.debug('Application initialized');
  }

  async start() {
    if (this.config.check_for_updates) {
      void checkForUpdates(this.version, LAUNCHER_VERSION)
        .then((updates) => {
          for (const update of updates) {
            this.logger.warn(
              _t('console.update.available', update.name, update.currentVersion, update.latestVersion),
            );
            this.logger.warn(update.url);
          }
        })
        .catch((error) => this.logger.debug('Failed to check for updates', error));
    }

    this.events.start();
    await this.bot.start();
    await this.scripts.start();
    await this.minecraft.start();
    this.cli.start();

    new StartupEvent(this).emit();

    this.logger.debug('Application started');
  }

  async stop() {
    this.cli.stop();
    await this.minecraft.stop();
    await this.bot.stop();
    this.logger.debug('Application stopped');
  }
}
