const fs = require('fs');
const { ChatInput } = require('@akki256/discord-interaction');
const { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const { sendCommand } = require('../handlers/MessageHandler');
const localization = require('./_localizations.json');
const main = require('../index.js');

const tellCommand = new ChatInput({
  name: 'tell',
  description: 'Sends a message with tell',
  descriptionLocalizations: localization['tell'],
  options: [
    {
      name: 'target',
      description: 'Target',
      descriptionLocalizations: localization['tell.target'],
      type: ApplicationCommandOptionType.String,
      maxLength: 4096,
      required: true,
      autocomplete: true
    },
    {
      name: 'message',
      description: 'A message to send',
      descriptionLocalizations: localization['tell.message'],
      type: ApplicationCommandOptionType.String,
      maxLength: 4096,
      required: true
    }
  ]
}, async (interaction) => {
  const member = /** @type {import('discord.js').GuildMember} */(interaction.member);
  
  const embed = new EmbedBuilder()
    .setDescription(main.lang.run('command.command.sending'))
    .setFooter({
      text: `Requested by ${member?.displayName ?? interaction.user.tag}`,
      iconURL: interaction.user.displayAvatarURL()
    });
  await interaction.reply({ embeds: [embed], ephemeral: true });
  
  const target = interaction.options.getString('target');
  const message = interaction.options.getString('message');
  
  const command = `tell ${formatSelector(target)} §.\n- §b${interaction.user.tag}§r§o§7: ${message}§r`;
  const res = await sendCommand(main, command, embed, { onlyMessage: true });
  if (!res.error) main.logger.log(`[${member?.displayName ?? interaction.user.tag} → ${target}] ${message}`);
  
  // @ts-ignore
  await interaction.editReply({ embeds: [res.embed], files: res.files });
  if (res.files) fs.unlinkSync(res.files[0]);
  
}, async (interaction) => {
  const focused = interaction.options.getFocused(true);
  const _players = main.server.getWorlds().flatMap(w => w.lastPlayers);
  const players = [...new Set(_players)]; // remove duplicates
  let choices = /** @type {{ name: string, value: string }[]} */ ([]);
  
  if (focused.name === 'target') {
    choices = players.map(p => ({ name: p, value: p }));
  }
  
  const filtered = choices.filter(choice => 
    choice.value.toLowerCase().startsWith(focused.value.toLowerCase())
  );
  
  await interaction.respond(filtered);
});

/** @param {string} selector */
function formatSelector(selector) {
  if (selector.match(/@[apser].*/)) return selector;
  if (selector.includes(' ') && !selector.match(/".*"/)) return `"${selector}"`;
  return selector;
}

module.exports = [ tellCommand ];