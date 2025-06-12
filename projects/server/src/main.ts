import { ExtendedEmitter, MinecraftCommandVersion } from 'socket-be';

import { CommandLineHandler, MinecraftHandler, ScriptHandler } from './handlers';
import { Config, ExtractOptional } from './types';
import { Logger, _t, loadConfig, logo } from './util';
import { StartupEvent } from './events';

import { version as VERSION } from '../package.json';
import { DiscordBot } from './discord';


// const { handleMessage } = require('./handlers/MessageHandler');
// const { handleChat } = require('./handlers/ChatHandler');

const defaultConfig: ExtractOptional<Config> = {
  port: 8000,
  bridge_port: 23191,
  language: 'en_US',
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
}

interface ApplicationEvents {
  'startup': [StartupEvent];
}

export class Application extends ExtendedEmitter<ApplicationEvents> {
  public readonly config: Required<Config>;
  public readonly version: string;
  public readonly logger: Logger;
  
  public readonly bot: DiscordBot;
  public readonly minecraft: MinecraftHandler;
  public readonly cli: CommandLineHandler;
  public readonly scripts: ScriptHandler;

  public readonly initializedAt: number = Date.now();

  constructor() {
    super();
    
    console.log(logo);
    console.log(`discord-mcbe v${VERSION}`);
    
    this.version = VERSION;
    
    this.config = Object.assign(defaultConfig, loadConfig());
    
    this.logger = new Logger('App', this.config);
    
    this.bot = new DiscordBot(this);
    
    this.minecraft = new MinecraftHandler(this);

    this.cli = new CommandLineHandler(this);
    
    this.scripts = new ScriptHandler(this);
    
    this.emit('startup', new StartupEvent(this));
    this.logger.debug('Application initialized');

    this.start().catch(e => this.logger.error('Failed to start application\n', e));
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
    this.logger.debug('Application started');
  }
}

new Application();

process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection:', err);
});