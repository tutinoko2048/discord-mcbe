import path from 'node:path';
import { Client, codeBlock, GatewayIntentBits, Message, MessageCreateOptions } from 'discord.js';
import { DiscordInteractions } from '@akki256/discord-interaction';

import type { App } from '../main';
import { PanelHandler } from './panel';

import { _t, Logger } from '../util';
import * as embeds from '../embeds';


export class DiscordHandler {
  private readonly logger: Logger;
  public readonly client: Client;
  public readonly interactions: DiscordInteractions;
  public readonly panels: PanelHandler;

  constructor(
    private readonly app: App,
  ) {
    this.logger = new Logger('Discord', this.app.config);
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ],
      allowedMentions: { repliedUser: false }
    });

    this.interactions = new DiscordInteractions(this.client);
    this.interactions.loadRegistries(path.resolve(__dirname, './interactions'));

    this.panels = new PanelHandler(this.app);
  }

  start() {
    this.client.login(this.app.config.discord_token);
    
    this.client.once('ready', this.onReady.bind(this));
    
    this.client.on('messageCreate', message => {
      if (message.author.bot || message.channel.id !== this.app.config.channel_id) return;
      this.onMessageCreate(message);
    });
    
    this.client.on('interactionCreate', interaction => {
      this.interactions.run(interaction).catch(e => {
        this.logger.error(e);
        const embed = embeds.error(codeBlock(String(e)))
          .setAuthor({ name: _t('command.error.catch') });
        if (interaction.channel?.isSendable()) interaction.channel.send({ embeds: [embed] });
      });
    });

    this.client.on('error', this.onError.bind(this));
  }

  async sendMessage(options: string | MessageCreateOptions) {
    const channel = this.client.channels.cache.get(this.app.config.channel_id);
    if (!channel?.isSendable()) return;

    await channel.send(options);
  }

  updateActivity() {
    const worlds = this.app.server.getWorlds();
    
    let info;
    if (worlds.length > 1) {
      const sum = worlds.map(w => w.players.size).reduce((a, b) => a + b);
      info = `Players(total): ${sum} | Worlds: ${worlds.length}`;
    } else if (worlds.length === 1) {
      info = `Players: ${worlds[0].players.size}/${worlds[0].maxPlayers}`;
    } else {
      info = 'Players: OFFLINE';
    }
    
    this.client.user?.setPresence({
      activities: [{ name: `${info} | /help` }]
    });
  }

  private onError(error: Error) {
    this.logger.error(error);
  }

  private onReady() {
    this.interactions.registerCommands(this.app.config.guild_id);
    this.logger.info(_t('console.login', this.client.user!.tag));
    
    const embed = embeds.ready().setFooter({ text: _t('discord.ready') });
    if (this.app.config.ready_message) this.sendMessage({ embeds: [ embed ] });
    
    void this.updateActivity();
    setInterval(() => this.updateActivity(), 20_000);
    
    this.panels.startInterval();
  }

  private onMessageCreate(message: Message) {}
}