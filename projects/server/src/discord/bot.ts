import {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  type Channel,
  type Interaction,
  type TextChannel,
  type Message,
  type MessageCreateOptions,
} from 'discord.js';
import { InteractionManager } from './interaction';
import { StatusPanel } from './panel';
import { _t, Logger } from '../util';
import { DiscordMessageEvent, DiscordReadyEvent, DiscordSendEvent } from '../events';

import type { Application } from '../application';

export class DiscordBot<READY extends boolean = false> {
  private readonly logger: Logger;

  public readonly client: Client<READY>;
  private readonly interactions: InteractionManager;
  public readonly panels: StatusPanel;

  constructor(private readonly app: Application) {
    this.logger = new Logger('Discord', this.app.config);
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
      allowedMentions: { repliedUser: false },
    });

    this.interactions = new InteractionManager(this.app);

    this.panels = new StatusPanel(this.app);

    this.logger.debug('Initialized');
  }

  getMainChannel(): TextChannel {
    const channel = this.client.channels.cache.get(this.app.env.CHANNEL_ID);
    this.validateChannel(channel);
    return channel;
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

    await this.client.login(this.app.env.DISCORD_TOKEN);
  }

  async stop() {
    await this.client.destroy();
  }

  async sendMessage(options: string | MessageCreateOptions) {
    const channel = this.getMainChannel();

    const signal = new DiscordSendEvent(
      this.app,
      this.client as Client<true>,
      channel,
      typeof options === 'string' ? { content: options } : options,
    );

    if (!signal.emit()) return;

    await signal.channel.send(signal.message);
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

  private async onReady(client: Client<true>) {
    this.logger.info(_t('console.login', client.user.tag));

    const channel = client.channels.cache.get(this.app.env.CHANNEL_ID);
    this.validateChannel(channel);

    await this.interactions.register(client);

    // // void this.updateActivity();
    // // setInterval(() => this.updateActivity(), 20_000);

    this.panels.startInterval();

    new DiscordReadyEvent(this.app, client).emit();
  }

  private onMessageCreate(message: Message) {
    if (message.author.bot) return;

    if (message.channel.id === this.app.env.CHANNEL_ID) {
      if (!message.inGuild()) {
        return this.logger.warn(`Received a message from invalid channel (ID: ${message.channel.id})`);
      }

      new DiscordMessageEvent(this.app, message).emit();
    }
  }

  private async onInteractionCreate(interaction: Interaction) {
    if (!interaction.inCachedGuild()) {
      this.logger.warn('Received interaction in uncached guild, ignoring.');
      return;
    }

    try {
      await this.interactions.onInteractionCreate(interaction);
    } catch (error) {
      this.logger.error(`Failed to handle interaction:`, error);
    }
  }

  private validateChannel(channel?: Channel): asserts channel is TextChannel {
    if (!channel) {
      throw new Error(`Failed to find the channel (ID: ${this.app.env.CHANNEL_ID})`);
    }

    if (channel.type !== ChannelType.GuildText) {
      throw new Error(`The channel (ID: ${this.app.env.CHANNEL_ID}) is not a text channel`);
    }
  }
}
