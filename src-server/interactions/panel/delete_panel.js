const { EmbedBuilder } = require('discord.js');
const { panels, lang } = require('../../index.js');

/** @param {import('discord.js').ChatInputCommandInteraction} interaction */
async function deletePanel(interaction) {
  
  await panels.delete();
  
  const embed = new EmbedBuilder()
    .setDescription(lang.run('command.panel.deleted'))
    .setAuthor({ name: 'Status Panel'});
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = deletePanel;