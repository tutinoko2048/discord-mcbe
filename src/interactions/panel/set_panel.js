const { EmbedBuilder, channelMention } = require('discord.js');
const { panels, lang } = require('../../index.js');

/** @param {import('discord.js').ChatInputCommandInteraction} interaction */
async function setPanel(interaction) {
  const embed = new EmbedBuilder()
    .setAuthor({ name: 'Status Panel' })
    .setDescription([
      lang.run('command.panel.set', [ channelMention(interaction.channelId) ])
    ].join('\n'))
  await interaction.reply({ embeds: [embed], ephemeral: true });
  
  // パネル作成, 保存
  await panels.create(interaction.channelId);
  
  await panels.update();
}


module.exports = setPanel;