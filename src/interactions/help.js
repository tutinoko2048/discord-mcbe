const { ChatInput } = require('@akki256/discord-interaction');
const { EmbedBuilder } = require('discord.js');
const localization = require('./_localizations.json');
const { TN_ICON_URL, GITHUB_URL } = require('../util/constants');
const { lang, interactions, version } = require('../index.js');

const helpCommand = new ChatInput({
  name: 'help',
  description: 'Show a help message of this bot',
  descriptionLocalizations: localization['help']
  
}, async (interaction) => {
  const commands = [...interactions.chatInputs.values()];

  const embed = new EmbedBuilder();
  embed.setAuthor({ name: `discord-mcbe v${version} Help` });
  embed.setDescription([
    lang.run('command.help.commands'),
    ...commands.map(c => `</${c.data.name}:${c.id}> - ${getDescription(c, interaction.locale)}`),
    `[More Info](${GITHUB_URL})`,
  ].join('\n'));
  embed.setFooter({ text: 'Made by RetoRuto9900K', iconURL: TN_ICON_URL });
  embed.setColor(0x00C853);
  await interaction.reply({ embeds: [embed] });
});

/**
 * @param {import('@akki256/discord-interaction').ChatInput} command
 * @param {string} locale
 */
function getDescription(command, locale) {
  return command.data.descriptionLocalizations?.[locale] ?? command.data.description;
}

module.exports = [ helpCommand ];