import { ExtendedEmitter } from 'socket-be';
import { VERSION, type ExtractOptional } from '@discord-mcbe/shared';
import { DiscordBot } from './discord';
import { MinecraftHandler } from './minecraft';
import { EventHandler, CommandLineHandler, ScriptHandler } from './handlers';
import { Logger, PropertyManager, loadConfig, initialize as initializeLang, loadEnv } from './util';
import { StartupEvent } from './events';

import type { ApplicationEvents, Config, Env } from './types';

const defaultEnv: ExtractOptional<Env> = {
  SOCKET_PORT: 3063,
  BRIDGE_PORT: 23191,
  BRIDGE_TRANSPORT: 'websocket',
};

const defaultConfig: Config = {
  config_version: 1,
  language: 'ja',
  timezone_offset: 0,
  bot: {
    reply_preview_max_length: 9,
    strip_color_prefix: true,
    panel_update_interval: 10000,
    discord_message_filter: [],
  },
  bridge: {
    disable_encryption: false,
  },
  script: {
    entry: 'scripts/main.js',
  },
  translationOverrides: {},
  debug: false,
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

    initializeLang(this.config.language, this.config.translationOverrides as Record<string, string>);

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
