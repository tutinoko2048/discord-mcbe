import * as moment from 'moment-timezone';
import { Application } from '../main';
import * as util from '../util/util';
import { Client, EmbedBuilder, RESTJSONErrorCodes, Message, TextBasedChannel } from 'discord.js';
import { colors } from './embeds';
import { Config } from '../types';
import { _t, Logger } from '../util';
import { PlayerList, RequestTimeoutError, World } from 'socket-be';
import { ScriptWorld } from '../bridge';

interface PanelData {
  channelId: string;
  messageId: string;
}

const panelEmbed = new EmbedBuilder()
  .setAuthor({ name: 'Status Panel' })
  .setColor(colors.leave)
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
    const panel = await this.fetchMessage()
      .catch((e: any) => this.logger.error(`failed to fetch panel | code: ${e.code}`));
    if (panel) {
      this.logger.info('successfully fetched the panel');
      this.update();
    }
    setInterval(
      () => this.update(),
      this.app.config.panel_update_interval || 30000 // デフォルト値を設定
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
      
    } catch (e: any) {
      if (e.code === RESTJSONErrorCodes.UnknownMessage) this.clearPanel();
      else throw e;
    }
  }
  
  async create(channelId: string): Promise<Message> {
    const channel = await this.client.channels.fetch(channelId);
    if (!channel?.isSendable()) throw new Error('Channel not found or is not a sendable channel');
    
    await this.delete().catch((e: any) => this.logger.error(`Failed to delete old panel | code: ${e.code}`));
    
    const panel = await channel.send({ embeds: [panelEmbed] });
    this.message = panel;
    this.setData(channelId, panel.id);
    
    return panel;
  }
  
  async delete(): Promise<void> {
    const panel = this.message ?? await this.fetchMessage();
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
    const info = await Promise.all(worlds.map(async (w) => {
      const isBDS = w instanceof ScriptWorld;
      let list: PlayerList | undefined;
      try {
        if (isBDS) {
          const players = w.getPlayers();
          list = { current: players.length, max: -1, players: players.map(p => p.name) };
        } else {
          list = await w.getPlayerList()
        }
      } catch (e) {
        if (!(e instanceof RequestTimeoutError)) throw e;
        return;
      }
      if (!list) return;
      const connectAt = `<t:${String(w.connectedAt).slice(0, 10)}:T>`;
      return [
        `\n**${w.name} - ${list.current}/${list.max}**`,
        `**  |  **Host: \`${isBDS ? 'Bedrock Server' : w.localPlayer ?? '-'}\``,
        `**  |  **Ping: ${w.averagePing} ms`,
        `**  |  **Connected: ${connectAt}`,
        '**  |  **Players:',
        `**  |  **${list.players.sort().join(', ')}`
      ].join('\n');
    }));
    const filteredInfo = info.filter((item): item is string => Boolean(item));
    
    const messages = [
      '**Server**',
      `**  |  **Ping: ${this.client.ws.ping} ms`,
      `**  |  **Uptime: ${uptime}`
    ];
    if (worlds.length === 0) messages.push(`\n${_t('command.list.offline')}`);
  
    panelEmbed.setTimestamp(Date.now());
    panelEmbed.setDescription(
      [...messages, ...filteredInfo].join('\n')
    );
    panelEmbed.setColor(worlds.length > 0 ? colors.join : colors.leave);
    panelEmbed.setFooter({ text: `discord-mcbe v${this.app.version}` });
    
    try {
      await this.message.edit({ embeds: [panelEmbed] });
    } catch (e: any) {
      if (e.code === RESTJSONErrorCodes.UnknownMessage) this.clearPanel();
        else throw e;
    }
  }

  clearPanel(): void {
    util.setData('panel_channel', null);
    util.setData('panel_message', null);
    this.message = null;
  }

  getData(): PanelData | undefined {
    const channelId = util.getData<string>('panel_channel');
    const messageId = util.getData<string>('panel_message');
    if (!channelId || !messageId) return undefined;
    return { channelId, messageId };
  }

  setData(channelId: string, messageId: string): void {
    util.setData('panel_channel', channelId);
    util.setData('panel_message', messageId);
  }
}

function getDuration(t1: number, t2: number): [number, number, number] {
  const duration = moment.duration(t2 - t1);
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  const seconds = duration.seconds();
  
  return [hours, minutes, seconds];
}