import * as fs from 'node:fs';
import * as readline from 'node:readline';
import { ExtendedEmitter, MinecraftCommandVersion, Server as SocketBEServer, ServerEvent } from 'socket-be';

import { DiscordHandler, ScriptHandler } from './handlers';
import { Config, ExtractOptional } from './types';
import { Logger, _t, loadConfig, logo } from './util';
import { StartupEvent } from './events';

import * as embeds from './embeds';
import { version as VERSION } from '../../../package.json';


// const { handleMessage } = require('./handlers/MessageHandler');
// const { handleChat } = require('./handlers/ChatHandler');

const defaultConfig: ExtractOptional<Config> = {
  port: 8000,
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
}

interface AppEvents {
  'startup': [StartupEvent];
}

export class App extends ExtendedEmitter<AppEvents> {
  public readonly config: Required<Config>;
  public readonly version: string;
  public readonly logger: Logger;
  
  public readonly discord: DiscordHandler;
  public readonly server: SocketBEServer;
  public readonly scripts: ScriptHandler;

  constructor() {
    super();
    
    console.log(logo);
    console.log(`discord-mcbe v${VERSION}`);
    
    this.version = VERSION;
    
    this.config = Object.assign(defaultConfig, loadConfig());
    
    this.logger = new Logger('App', this.config);
    
    this.discord = new DiscordHandler(this);
    
    this.server = new SocketBEServer({
      port: this.config.port,
      commandVersion: this.config.command_version,
      debug: this.config.debug
    });
    
    this.scripts = new ScriptHandler(this);
    
    this.emit('startup', new StartupEvent(this));
  }

  async start() {
    this.discord.start();

    this.server.on(ServerEvent.Open, () => {
      this.logger.info(this.lang.run('console.listening', [ `${this.server.ip}:${this.config.port}` ]));
    });
    
    this.server.on(ServerEvent.WorldInitialize, async ({ world }) => {
      const host = await world.getLocalPlayer();
      
      this.server.logger.info(this.lang.run('console.connect', [ world.name, host ]));
      const embed = embeds.connect(this.lang.run('discord.connect', [ host ]), world.name);
      
      this.sendDiscord({ embeds: [ embed ] });
      world.sendMessage(this.lang.run('minecraft.connect', [ world.name ]));
      
      this.updateActivity();
    });
    
    this.server.on(ServerEvent.WorldRemove, async ({ world }) => {
      this.server.logger.info(this.lang.run('console.disconnect', [ world.name ]));
      const embed = embeds.disconnect(this.lang.run('discord.disconnect'), world.name);
      
      this.sendDiscord({ embeds: [ embed ] });
      
      this.updateActivity();
    });
    
    this.server.on(ServerEvent.PlayerJoin, async ev => {
      const { players, world, world: { lastPlayers, maxPlayers } } = ev;
      
      world.logger.log(this.lang.run('console.join', [ players.join(', '), lastPlayers.length, maxPlayers ]));
      
      const embed = embeds.join(
        this.lang.run('discord.join', [ players.join(', '), lastPlayers.length, maxPlayers ]),
        this.server.getWorlds().length > 1 ? world.name : null
      );
      await this.sendDiscord({ embeds: [ embed ] });
      
      this.updateActivity();
    });
    
    this.server.on(ServerEvent.PlayerLeave, async ev => {
      const { players, world, world: { lastPlayers, maxPlayers } } = ev;
      
      world.logger.log(this.lang.run('console.leave', [ players.join(', '), lastPlayers.length, maxPlayers ]));
      
      const embed = embeds.leave(
        this.lang.run('discord.leave', [ players.join(', '), lastPlayers.length, maxPlayers ]),
        this.server.getWorlds().length > 1 ? world.name : null
      );
      await this.sendDiscord({ embeds: [ embed ] });
      
      this.updateActivity();
    });
    
    this.server.on(ServerEvent.PlayerChat, async ev => {
      handleChat(this, ev).catch(e => this.logger.error(e));
    });
    
    const reader = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    reader.on('line', (line) => {
      if (line.startsWith('.')) {
        try {
          const res = eval(line.slice(1));
          console.log('<', res);
        } catch (e) {
          console.error('<', e);
        }
      } else {
        const command = line.replace(/^\/*/, '');
        this.server.broadcastCommand(command).then(res => console.log(res));
      }
    });
    
    this.discord.on('error', console.error);
    
    this.discord.login(this.config.discord_token);

    await this.scripts.load();
  }
}

new App();

process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection:', err);
});