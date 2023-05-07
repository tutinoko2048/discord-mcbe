// @ts-check

const path = require('path');
const fs = require('fs');
const { Client, GatewayIntentBits, codeBlock, EmbedBuilder, RESTJSONErrorCodes } = require('discord.js');
const { DiscordInteractions } = require('@akki256/discord-interaction');
const { Server, Logger } = require('socket-be');
const readline = require('readline');
const { validateConfig, getConfig } = require('./util/util');
const Translate = require('./util/Translate');
const embeds = require('./embeds');
const { handleMessage } = require('./handlers/MessageHandler');
const { handleChat } = require('./handlers/ChatHandler');
const { PanelHandler } = require('./handlers/PanelHandler');
const { ScriptHandler } = require('./handlers/ScriptHandler');
const logo = require('./util/logo');
const { version: VERSION } = require('../package.json');

if (!fs.existsSync('data')) fs.mkdirSync('data');

class Main {
  constructor() {
    console.log(logo);
    console.log(`discord-mcbe v${VERSION}`);
    
    this.config = getConfig();
    
    this.logger = new Logger('Discord', {
      timezone: this.config.timezone,
      debug: this.config.debug
    });
    
    this.lang = new Translate(this.config.language);
    
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ],
      allowedMentions: { repliedUser: false }
    });
    validateConfig(this.config, this.client);
    
    this.interactions = new DiscordInteractions(this.client);
    this.interactions.loadRegistries(path.resolve(__dirname, './interactions'));
    
    this.server = new Server({
      port: this.config.port,
      timezone: this.config.timezone,
      commandVersion: this.config.command_version,
      debug: this.config.debug
    });
    
    this.panels = new PanelHandler(this);
    
    this.scripts = new ScriptHandler(this);
    
    this.client.once('ready', async () => {
      this.interactions.registerCommands(this.config.guild_id);
      this.logger.info(this.lang.run('console.login', [ this.client.user?.tag ]));
      
      const embed = embeds.ready().setFooter({ text: this.lang.run('discord.ready') });
      if (this.config.ready_message) this.sendDiscord({ embeds: [ embed ] });
      
      this.updateActivity();
      setInterval(() => this.updateActivity(), 20*1000);
      
      const panel = await this.panels.fetch()
        .catch((e) => this.logger.error(`[PanelHandler] failed to fetch panel | code: ${e.code}`));
      if (panel) {
        this.logger.info('[PanelHandler] successfully fetched the panel');
        this.panels.update();
      }
      setInterval(() => this.panels.message && this.panels.update(), 10*1000);
    });
    
    this.client.on('messageCreate', async message => {
      if (message.author.bot) return;
      handleMessage(this, message).catch(e => this.logger.error(e));
    });
    
    this.client.on('interactionCreate', interaction => {
      // @ts-ignore
      this.interactions.run(interaction).catch(e => {
        this.logger.error(e);
        const embed = embeds.error(codeBlock(String(e)))
          .setAuthor({ name: this.lang.run('command.error.catch') });
        if (interaction.isCommand()) interaction.channel.send({ embeds: [embed] });
      });
    });
    
    this.server.events.on('serverOpen', () => {
      this.logger.info(this.lang.run('console.listening', [ `${this.server.ip}:${this.config.port}` ]));
    });
    
    this.server.events.on('worldAdd', async ({ world }) => {
      const host = await world.getLocalPlayer();
      
      this.server.logger.info(this.lang.run('console.connect', [ world.name, host ]));
      const embed = embeds.connect(this.lang.run('discord.connect', [ host ]), world.name);
      
      this.sendDiscord({ embeds: [ embed ] });
      world.sendMessage(this.lang.run('minecraft.connect', [ world.name ]));
      
      this.updateActivity();
    });
    
    this.server.events.on('worldRemove', async ({ world }) => {
      this.server.logger.info(this.lang.run('console.disconnect', [ world.name ]));
      const embed = embeds.disconnect(this.lang.run('discord.disconnect'), world.name);
      
      this.sendDiscord({ embeds: [ embed ] });
      
      this.updateActivity();
    });
    
    this.server.events.on('playerJoin', async ev => {
      const { players, world, world: { lastPlayers, maxPlayers } } = ev;
      
      world.logger.log(this.lang.run('console.join', [ players.join(', '), lastPlayers.length, maxPlayers ]));
      
      const embed = embeds.join(
        this.lang.run('discord.join', [ players.join(', '), lastPlayers.length, maxPlayers ]),
        this.server.getWorlds().length > 1 ? world.name : null
      );
      await this.sendDiscord({ embeds: [ embed ] });
      
      this.updateActivity();
    });
    
    this.server.events.on('playerLeave', async ev => {
      const { players, world, world: { lastPlayers, maxPlayers } } = ev;
      
      world.logger.log(this.lang.run('console.leave', [ players.join(', '), lastPlayers.length, maxPlayers ]));
      
      const embed = embeds.leave(
        this.lang.run('discord.leave', [ players.join(', '), lastPlayers.length, maxPlayers ]),
        this.server.getWorlds().length > 1 ? world.name : null
      );
      await this.sendDiscord({ embeds: [ embed ] });
      
      this.updateActivity();
    });
    
    this.server.events.on('playerChat', async ev => {
      handleChat(this, ev).catch(e => this.logger.error(e));
    });
    
    const reader = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    reader.on('line', (line) => {
      if (line.startsWith('/')) {
        this.server.runCommand(line).then(console.log);
      } else {
        try {
          const res = eval(line);
          console.log('<', res);
        } catch (e) {
          console.error('<', e);
        }
      }
    });
    
    this.server.events.on('error', console.error);
    this.client.on('error', console.error);
    
    this.client.login(this.config.discord_token);
  }
  
  /**
   * @param {string|import('discord.js').MessageCreateOptions} message
   * @param {import('discord.js').Snowflake} [channelId]
   * @returns {Promise<import('discord.js').Message|undefined>}
   */
  async sendDiscord(message, channelId = this.config.channel_id) {
    if (!message) return;
    const channel = this.client.channels.cache.get(channelId);
    if (!channel) throw Error('Failed to get channel');
    
    if (channel.isTextBased()) return await channel.send(message);
  }
  
  async updateActivity() {
    const worlds = this.server.getWorlds();
    
    let info;
    if (worlds.length > 1) {
      const sum = worlds.map(w => w.lastPlayers.length).reduce((a, b) => a + b);
      info = `Players(total): ${sum} | Worlds: ${worlds.length}`;
    } else if (worlds.length === 1) {
      info = `Players: ${worlds[0].lastPlayers.length}/${worlds[0].maxPlayers}`;
    } else {
      info = 'Players: OFFLINE';
    }
    
    this.client.user.setPresence({
      activities: [{ name: `${info} | /help` }]
    });
  }
}

const main = new Main();
module.exports = main;

main.scripts.load();

process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection:', err);
});