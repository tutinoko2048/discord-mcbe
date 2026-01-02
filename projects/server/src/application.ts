import { ExtendedEmitter, MinecraftCommandVersion } from 'socket-be';
import type { ExtractOptional } from '@discord-mcbe/shared';
import { DiscordBot } from './discord';
import { MinecraftHandler } from './minecraft';
import { MessageSyncHandler, CommandLineHandler, ScriptHandler } from './handlers';
import type { ApplicationEvents, Config } from './types';
import { Logger, PropertyManager, _t, initialize as initializeLang, loadConfig, renderLogo } from './util';
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
  public readonly messageSync: MessageSyncHandler;
  public readonly cli: CommandLineHandler;
  public readonly scripts: ScriptHandler;

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

    this.messageSync = new MessageSyncHandler(this);

    this.cli = new CommandLineHandler(this);

    this.scripts = new ScriptHandler(this);

    this.emit('startup', new StartupEvent(this));
    this.logger.debug('Application initialized');
  }

  async start() {
    await this.minecraft.start();
    await this.bot.start();

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

    // this.server.on(ServerEvent.PlayerJoin, async ev => {
    //   const { players, world, world: { lastPlayers, maxPlayers } } = ev;

    //   world.logger.log(_t('console.join', players.join(', '), lastPlayers.length, maxPlayers));

    //   const embed = embeds.join(
    //     _t('discord.join', players.join(', '), lastPlayers.length, maxPlayers),
    //     this.server.getWorlds().length > 1 ? world.name : null
    //   );
    //   await this.sendDiscord({ embeds: [ embed ] });

    //   this.updateActivity();
    // });

    // this.server.on(ServerEvent.PlayerLeave, async ev => {
    //   const { players, world, world: { lastPlayers, maxPlayers } } = ev;

    //   world.logger.log(_t('console.leave', players.join(', '), lastPlayers.length, maxPlayers));

    //   const embed = embeds.leave(
    //     _t('discord.leave', players.join(', '), lastPlayers.length, maxPlayers),
    //     this.server.getWorlds().length > 1 ? world.name : null
    //   );
    //   await this.sendDiscord({ embeds: [ embed ] });

    //   this.updateActivity();
    // });

    // this.server.on(ServerEvent.PlayerChat, async ev => {
    //   handleChat(this, ev).catch(e => this.logger.error(e));
    // });

    // await this.scripts.load();

    this.on('playerJoin', (ev) => {
      const { player, world } = ev;
      this.logger.info(`[PlayerJoin] ${player.name} joined ${world.name}`);
    });

    this.on('playerLeave', (ev) => {
      const { player, world } = ev;
      this.logger.info(`[PlayerLeave] ${player.name} left ${world.name}`);
    });

    this.on('minecraftMessage', (ev) => {
      this.logger.info(`[${ev.world.name}] ${ev.sender.name}: ${ev.message}`);
      // Handle chat event here (e.g., send to Discord)
      this.bot.sendMessage(`[${ev.world.name}] ${ev.sender.name}: ${ev.message}`);

      for (const world of this.minecraft.getWorlds()) {
        if (world === ev.world) continue;
        world.sendMessage(`[${ev.world.name}] ${ev.sender.name}: ${ev.message}`);
      }
    });

    this.logger.debug('Application started');
  }
}
