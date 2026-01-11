import {
  Client,
  Events,
  GatewayIntentBits,
  Interaction,
  type Message,
  type MessageCreateOptions,
} from 'discord.js';
// import { DiscordInteractions } from '@akki256/discord-interaction';
import type { Application } from '../application';

// import { PanelHandler } from './panel';

import { _t, Logger } from '../util';
import { DiscordMessageEvent, DiscordReadyEvent } from '../events';

export class DiscordBot<READY extends boolean = false> {
  private readonly logger: Logger;
  public readonly client: Client<READY>;
  // public readonly interactions: DiscordInteractions;
  // public readonly panels: PanelHandler;

  constructor(private readonly app: Application) {
    this.logger = new Logger('Discord', this.app.config);
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
      allowedMentions: { repliedUser: false },
    });

    // this.interactions = new DiscordInteractions(this.client);
    // this.interactions.loadRegistries(path.resolve(__dirname, './interactions'));

    // this.panels = new PanelHandler(this.app);

    this.logger.debug('Initialized');
  }

  isReady(): this is DiscordBot<true> {
    return this.client.isReady();
  }

  awaitReady(timeout = 20_000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isReady()) return resolve();

      const timer = setTimeout(() => {
        this.client.off(Events.ClientReady, onReady);
        reject(new Error('Discord client ready timeout'));
      }, timeout);

      const onReady = () => {
        clearTimeout(timer);
        resolve();
      };
      this.client.once(Events.ClientReady, onReady);
    });
  }

  async start() {
    this.client.once(Events.ClientReady, this.onReady.bind(this));
    this.client.on(Events.MessageCreate, this.onMessageCreate.bind(this));
    this.client.on(Events.InteractionCreate, this.onInteractionCreate.bind(this));

    // this.client.on('interactionCreate', interaction => {
    //   this.interactions.run(interaction).catch(e => {
    //     this.logger.error(e);
    //     const embed = embeds.error(codeBlock(String(e)))
    //       .setAuthor({ name: _t('command.error.catch') });
    //     if (interaction.channel?.isSendable()) interaction.channel.send({ embeds: [embed] });
    //   });
    // });

    this.client.on(Events.Error, this.onError.bind(this));

    await this.client.login(this.app.config.discord_token);
  }

  async stop() {
    await this.client.destroy();
  }

  async sendMessage(options: string | MessageCreateOptions) {
    const channel = this.client.channels.cache.get(this.app.config.channel_id);
    if (!channel?.isSendable()) return;

    await channel.send(options);
  }

  // updateActivity() {
  //   const worlds = this.app.server.getWorlds();

  //   let info;
  //   if (worlds.length > 1) {
  //     const sum = worlds.map(w => w.players.size).reduce((a, b) => a + b);
  //     info = `Players(total): ${sum} | Worlds: ${worlds.length}`;
  //   } else if (worlds.length === 1) {
  //     info = `Players: ${worlds[0].players.size}/${worlds[0].maxPlayers}`;
  //   } else {
  //     info = 'Players: OFFLINE';
  //   }

  //   this.client.user?.setPresence({
  //     activities: [{ name: `${info} | /help` }]
  //   });
  // }

  private onError(error: Error) {
    this.logger.error(error);
  }

  private onReady(client: Client<true>) {
    this.logger.info(_t('console.login', client.user.tag));

    this.validateChannel();
    // this.interactions.registerCommands(this.app.config.guild_id);

    // // void this.updateActivity();
    // // setInterval(() => this.updateActivity(), 20_000);

    // this.panels.startInterval();
    new DiscordReadyEvent(this.app, client).emit();
  }

  private onMessageCreate(message: Message) {
    if (message.author.bot) return;

    // this.logger.debug('messageCreate', message.content, message.author.tag);

    if (message.channel.id === this.app.config.channel_id) {
      if (!message.inGuild()) {
        return this.logger.warn(`Received a message from invalid channel (ID: ${message.channel.id})`);
      }

      new DiscordMessageEvent(this.app, message).emit();
    }
  }

  private onInteractionCreate(interaction: Interaction) {
    this.logger.debug('interactionCreate', interaction.user.tag);
  }

  private validateChannel() {
    const channel = this.client.channels.cache.get(this.app.config.channel_id);
    if (!channel) {
      throw new Error(`Failed to find the channel (ID: ${this.app.config.channel_id})`);
    }

    if (!channel.isTextBased()) {
      throw new Error(`Channel '${channel.name}' (ID: ${channel.id}) is not a text channel`);
    }
  }
}
