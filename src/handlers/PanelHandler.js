const util = require('../util/util');
const { EmbedBuilder, RESTJSONErrorCodes } = require('discord.js');
const { colors } = require('../embeds');
const moment = require('moment-timezone');

const panelEmbed = new EmbedBuilder()
  .setAuthor({ name: 'Status Panel' })
  .setColor(colors.leave)
  .setDescription('Awaiting update...')
  .setFooter({ text: 'discord-mcbe' });

class PanelHandler {
  /** @param {import('../index')} main */
  constructor(main) {
    this.main = main;
    this.client = main.client;
    
    /** @type {string} */
    this.channelId = util.getData('panel_channel');
    
    /** @type {string} */
    this.messageId = util.getData('panel_message');
    
    /** @type {import('discord.js').Message|void} */
    this.message;
  }
  
  async startInterval() {
    const panel = await this.fetch()
      .catch((e) => this.main.logger.error(`[PanelHandler] failed to fetch panel | code: ${e.code}`));
    if (panel) {
      this.main.logger.info('[PanelHandler] successfully fetched the panel');
      this.update();
    }
    setInterval(() => this.message && this.update(), this.main.config.panel_update_interval);
  }
  
  /**
   * @returns {Promise<import('discord.js').Message|void>}
   */
  async fetch() {
    const channelId = util.getData('panel_channel');
    const messageId = util.getData('panel_message');
    if (!channelId || !messageId) return;
    
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel?.isTextBased()) return;
      const message = await channel.messages.fetch(messageId);
      this.message = message;
      return message;
      
    } catch (e) {
      if (e.code === RESTJSONErrorCodes.UnknownMessage) this.clear();
        else throw e;
    }
  }
  
  /** @param {string} channelId */
  async create(channelId) {
    const channel = await this.client.channels.fetch(channelId);
    if (!channel?.isTextBased()) throw Error('Channel not found or is not a TextBased channel');
    
    await this.delete().catch(e => console.error(`[PanelHandler] failed to delete old panel | code: ${e.code}`));
    
    const panel = await channel.send({ embeds: [panelEmbed] });
    this.message = panel;
    this.channelId = channelId;
    this.messageId = panel.id;
    util.setData('panel_channel', channelId);
    util.setData('panel_message', panel.id);
    
    return panel;
  }
  
  async delete() {
    const panel = this.message ?? await this.fetch();
    if (panel) {
      await panel.delete();
      this.clear();
    }
  }
  
  async update() {
    this.message ??= await this.fetch();
    if (!this.message) return console.error('Failed to update panel: panel not found');
    
    const uptime = this.main.lang.run('util.duration', getDuration(this.main.server.startTime, Date.now()));
    
    const worlds = this.main.server.getWorlds();
    const info = await Promise.all(worlds.map(async w => {
      const list = await w.getPlayerList();
      const connectAt = `<t:${String(w.connectedAt).slice(0, 10)}:T>`;
      
      return [
        `\n**${w.name} - ${list.current}/${list.max}**`,
        `**  |  **Host: \`${w.localPlayer ?? '-'}\``,
        `**  |  **Ping: ${w.ping} ms`,
        `**  |  **Connected: ${connectAt}`,
        '**  |  **Players:',
        `**  |  **${list.players.sort().join(', ')}`
      ].join('\n');
    }));
    const messages = [
      '**Server**',
      `**  |  **Ping: ${this.main.client.ws.ping} ms`,
      `**  |  **Uptime: ${uptime}`
    ];
    if (worlds.length === 0) messages.push(`\n${this.main.lang.run('command.list.offline')}`);
  
    panelEmbed.setTimestamp(Date.now());
    panelEmbed.setDescription(
      [...messages, ...info].join('\n')
    );
    panelEmbed.setColor(worlds.length > 0 ? colors.join : colors.leave);
    
    try {
      await this.message.edit({ embeds: [panelEmbed] });
    } catch (e) {
      if (e.code === RESTJSONErrorCodes.UnknownMessage) this.clear();
        else throw e;
    }
  }

  clear() {
    util.setData('panel_channel', null);
    util.setData('panel_message', null);
    this.message = null;
  }
}

/** @param {number} t1 @param {number} t2 */
function getDuration(t1, t2) {
  const duration = moment.duration(t2 - t1);
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  const seconds = duration.seconds();
  
  return [ hours, minutes, seconds ];
}

module.exports = { PanelHandler };