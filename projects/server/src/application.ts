import { ExtendedEmitter, MinecraftCommandVersion } from 'socket-be';
import type { ExtractOptional } from '@discord-mcbe/shared';
import { DiscordBot } from './discord';
import { MinecraftHandler } from './minecraft';
import { EventHandler, CommandLineHandler, ScriptHandler } from './handlers';
import type { ApplicationEvents, Config } from './types';
import { Logger, PropertyManager, _t, initialize as initializeLang, loadConfig } from './util';
import { StartupEvent } from './events';

import { version as VERSION } from '../package.json';

const defaultConfig: ExtractOptional<Config> = {
  socket_port: 8000,
  bridge_port: 23191,
  language: 'ja_JP',
  timezoneOffset: 0,
  command_role_id: [],
  ready_message: true,
  strip_color_prefix: false,
  panel_update_interval: 10000,
  styles_tnac: true,
  scripts_entry: '',
  command_version: MinecraftCommandVersion.Latest,
  debug: false,
  disable_encryption: false,
};

export class Application extends ExtendedEmitter<ApplicationEvents> {
  public readonly config: Required<Config>;
  public readonly version: string;
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

    this.properties = new PropertyManager();

    this.config = Object.assign(defaultConfig, loadConfig());

    initializeLang(this.config.language);

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
    await this.minecraft.start();
    await this.bot.start();
    this.cli.start();
    await this.scripts.start();

    // this.server.on(ServerEvent.Open, () => {
    //   this.logger.info(_t('console.listening', `${this.server.ip}:${this.config.port}`));
    // });

    // this.server.on(ServerEvent.WorldInitialize, async ({ world }) => {
    //   const host = await world.getLocalPlayer();

    //   this.logger.info(_t('console.connect', world.name, host.name));
    //   const embed = embeds.connect(_t('discord.connect', host.name), world.name);

    //   this.sendDiscord({ embeds: [ embed ] });
    //   world.sendMessage(_t('minecraft.connect', world.name));

    //   this.updateActivity();
    // });

    // this.server.on(ServerEvent.WorldRemove, async ({ world }) => {
    //   this.logger.info(_t('console.disconnect', world.name));
    //   const embed = embeds.disconnect(_t('discord.disconnect'), world.name);

    //   this.sendDiscord({ embeds: [ embed ] });

    //   this.updateActivity();
    // });

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
