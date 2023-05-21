const { ChatInput } = require('@akki256/discord-interaction');
const { EmbedBuilder } = require('discord.js');
const moment = require('moment-timezone');
const localization = require('./_localizations.json');
const { server, config, lang } = require('../index.js');

const pingCommand = new ChatInput({
  name: 'ping',
  description: 'Shows the bot and worlds response time',
  descriptionLocalizations: localization['ping']
  
}, async (interaction) => {
  const worlds = server.getWorlds();
  
  const sentTime = Date.now();
  await interaction.deferReply();
  const deltaTime = Date.now() - sentTime;
  
  const startAt = moment(server.startTime).tz(config.timezone).format('MM/DD HH:mm:ss');
  
  const embed = new EmbedBuilder();
  embed.setDescription([
    'Pong!',
    `\- **Time**: ${deltaTime}ms`,
    `\- **Discord**: ${interaction.client.ws.ping}ms`,
    ...worlds.map(w => `\- **${w.name}**: ${w.ping}ms`)
  ].join('\n'));
  embed.setColor('Random');
  embed.setFooter({ text: lang.run('command.ping.startAt', [ startAt ]) });
  await interaction.followUp({ embeds: [embed] });
});

module.exports = [ pingCommand ];