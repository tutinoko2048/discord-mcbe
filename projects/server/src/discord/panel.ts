import * as moment from 'moment-timezone';
import type { Application } from '../application';
import { type Client, EmbedBuilder, RESTJSONErrorCodes, type Message, time, DiscordAPIError } from 'discord.js';
import { Palette } from './embeds';
import { _t, Logger } from '../util';
import { type PlayerList, RequestTimeoutError } from 'socket-be';

interface PanelData {
  channelId: string;
  messageId: string;
}

const panelEmbed = new EmbedBuilder()
  .setAuthor({ name: 'Status Panel' })
  .setColor(Palette.Discord)
  .setDescription('Awaiting update...');

export class PanelHandler {
  private readonly logger: Logger;
  private client: Client;

  private message: Message | null = null;

  constructor(private readonly app: Application) {
    this.logger = new Logger('PanelHandler', this.app.config);
    this.client = app.bot.client;
  }

  async startInterval(): Promise<void> {
    const panel = await this.fetchMessage().catch((err) =>
      this.logger.error(`failed to fetch panel | code: ${err.code}`),
    );
    if (panel) {
      this.logger.info('successfully fetched the panel');
      this.update();
    }
    setInterval(
      () => this.update(),
      this.app.config.bot.panel_update_interval || 30000, // デフォルト値を設定
    );
  }

  async fetchMessage(): Promise<Message | undefined> {
    const data = this.getData();
    if (!data) return undefined;

    try {
      const channel = await this.client.channels.fetch(data.channelId);

      if (!channel?.isSendable()) return undefined;
      const message = await channel.messages.fetch(data.messageId);
      this.message = message;
      return message;
    } catch (err) {
      if (err instanceof DiscordAPIError && err.code === RESTJSONErrorCodes.UnknownMessage) this.clearPanel();
      else throw err;
    }
  }

  async create(channelId: string): Promise<Message> {
    const channel = await this.client.channels.fetch(channelId);
    if (!channel?.isSendable()) throw new Error('Channel not found or is not a sendable channel');

    await this.delete().catch((err) => this.logger.error(`Failed to delete old panel | code: ${err.code}`));

    const panel = await channel.send({ embeds: [panelEmbed] });
    this.message = panel;
    this.setData(channelId, panel.id);

    return panel;
  }

  async delete(): Promise<void> {
    const panel = this.message ?? (await this.fetchMessage());
    if (panel) {
      await panel.delete();
      this.clearPanel();
    }
  }

  async update(): Promise<void> {
    if (!this.message) {
      const fetchedMessage = await this.fetchMessage();
      if (!fetchedMessage) {
        console.error('Failed to update panel: panel not found');
        return;
      }
      this.message = fetchedMessage;
    }

    const uptime = _t('util.duration', ...getDuration(this.app.initializedAt, Date.now()));

    const worlds = this.app.minecraft.getWorlds();
    const info = await Promise.all(
      worlds.map(async (w) => {
        let list: PlayerList | undefined;
        let host: string | undefined;
        if (w.isServer()) {
          host = 'Bedrock Server';
          const players = w.getPlayers();
          list = { current: players.length, max: -1, players: players.map((p) => p.name) };
        } else if (w.isLocal()) {
          host = w.session.world.localPlayer?.name;
          try {
            list = await w.session.world.getPlayerList();
          } catch (e) {
            if (!(e instanceof RequestTimeoutError)) throw e;
          }
        }
        if (!list) return;

        const connectAt = time(new Date(w.connectedAt), 'T');

        return [
          `\n**${w.name} - ${list.current}/${list.max}**`,
          `**  |  **Host: \`${host ?? '-'}\``,
          `**  |  **Ping: ${w.averagePing} ms`,
          `**  |  **Connected: ${connectAt}`,
          '**  |  **Players:',
          `**  |  **${list.players.sort().join(', ')}`,
        ].join('\n');
      }),
    );
    const filteredInfo = info.filter((item): item is string => Boolean(item));

    const messages = ['**Server**', `**  |  **Ping: ${this.client.ws.ping} ms`, `**  |  **Uptime: ${uptime}`];
    if (worlds.length === 0) messages.push(`\n${_t('command.list.offline')}`);

    panelEmbed.setTimestamp(Date.now());
    panelEmbed.setDescription([...messages, ...filteredInfo].join('\n'));
    panelEmbed.setColor(worlds.length > 0 ? Palette.Join : Palette.Leave);
    panelEmbed.setFooter({ text: `discord-mcbe v${this.app.version}` });

    try {
      await this.message.edit({ embeds: [panelEmbed] });
    } catch (err) {
      if (err instanceof DiscordAPIError && err.code === RESTJSONErrorCodes.UnknownMessage) this.clearPanel();
      else throw err;
    }
  }

  clearPanel(): void {
    this.app.properties.delete('panel');
    this.message = null;
  }

  getData(): PanelData | undefined {
    const panel = this.app.properties.get<PanelData>('panel');
    if (!panel?.channelId || !panel?.messageId) return undefined;
    return panel;
  }

  setData(channelId: string, messageId: string): void {
    this.app.properties.set<PanelData>('panel', { channelId, messageId });
  }
}

function getDuration(t1: number, t2: number): [number, number, number] {
  const duration = moment.duration(t2 - t1);
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  const seconds = duration.seconds();

  return [hours, minutes, seconds];
}
