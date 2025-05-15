const { ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../embeds');
const { panels, lang } = require('../../index.js');

/** @param {import('discord.js').ChatInputCommandInteraction} interaction */
async function getPanel(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const panel = await panels.fetch();
  
  const options = {
    components: [],
    embeds: [],
  }
  
  if (panel) {
    const button = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setURL(panel.url)
      .setLabel(lang.run('command.panel.jump'));
    options.components[0] = new ActionRowBuilder().setComponents(button);
  } else {
    options.embeds[0] = embeds.error(lang.run('command.panel.notfound'));
  }
  
  await interaction.followUp(options);
}

module.exports = getPanel;