const { ChatInput } = require('@akki256/discord-interaction');
const { EmbedBuilder } = require('discord.js');
const { colors } = require('../embeds');
const localization = require('./_localizations.json');
const { lang, server } = require('../index.js');

const listCommand = new ChatInput({
  name: 'list',
  description: 'Shows player list',
  descriptionLocalizations: localization['list']
  
}, async (interaction) => {
  const worlds = server.getWorlds();
  
  const embed = new EmbedBuilder();
  embed.setAuthor({ name: 'List' });
  embed.setColor(colors.success);
  embed.setDescription(lang.run('command.list.fetching'));
  await interaction.reply({ embeds: [embed] });
  
  const info = await Promise.all(worlds.map(async w => {
    const list = await w.getPlayerList();
    return [
      `**${w.name} - ${list.current}/${list.max}**`,
      '**  |  **Players:',
      `**  |  **${list.players.sort().join(', ')}`
    ].join('\n');
  }));

  embed.setTimestamp(Date.now());
  embed.setDescription(worlds.length > 0 ? info.join('\n') : lang.run('command.list.offline'));
  await interaction.editReply({ embeds: [embed] });
});

module.exports = [ listCommand ];