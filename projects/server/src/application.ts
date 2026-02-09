import { ExtendedEmitter } from 'socket-be';
import { DiscordBot } from './discord';
import { MinecraftHandler } from './minecraft';
import { EventHandler, CommandLineHandler, ScriptHandler } from './handlers';
import { Logger, PropertyManager, loadConfig, initialize as initializeLang, loadEnv } from './util';
import { StartupEvent } from './events';

import type { ExtractOptional } from '@discord-mcbe/shared';
import type { ApplicationEvents, Env } from './types';
import type { MergedConfig } from './util';

import { version as VERSION } from '../package.json';

const defaultEnv: ExtractOptional<Env> = {
  SOCKET_PORT: 8000,
  BRIDGE_PORT: 23191,
}

const defaultConfig: MergedConfig = {
  app: {
    language: 'en_US',
    timezone_offset: 0,
    scripts_entry: '',
  },
  bot: {
    command_role_id: [],
    send_ready: true,
    strip_color_prefix: false,
    panel_update_interval: 10000,
  },
  bridge: {
    disable_encryption: false,
  },
  debug: false,
};

export class Application extends ExtendedEmitter<ApplicationEvents> {
  public readonly version: string;
  public readonly env: Required<Env>;
  public readonly config: MergedConfig;
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

    console.log(`Loading discord-mcbe v${VERSION}...`);

    this.version = VERSION;

    this.env = loadEnv(defaultEnv);

    this.properties = new PropertyManager();

    this.config = loadConfig(defaultConfig);

    initializeLang(this.config.app.language);

    this.logger = new Logger('App', this.config);

    this.bot = new DiscordBot(this);

    this.minecraft = new MinecraftHandler(this);

    this.cli = new CommandLineHandler(this);

    this.scripts = new ScriptHandler(this);

    this.events = new EventHandler(this);

    this.logger.debug('Application initialized');
  }

  async start() {
    this.events.start();
    await this.bot.start();
    await this.minecraft.start();
    this.cli.start();
    await this.scripts.start();

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
