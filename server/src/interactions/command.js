const fs = require('fs');
const { ChatInput } = require('@akki256/discord-interaction');
const { EmbedBuilder, ApplicationCommandOptionType, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { sendCommand } = require('../handlers/MessageHandler');
const embeds = require('../embeds');
const localization = require('./_localizations.json');
const main = require('../index.js');

const deleteButtonId = 'delete_response';

const runCommand = new ChatInput({
  name: 'command',
  description: 'Sends a command to worlds',
  descriptionLocalizations: localization['command'],
  options: [
    {
      name: 'command',
      description: 'A command to send',
      descriptionLocalizations: localization['command.command'],
      type: ApplicationCommandOptionType.String,
      maxLength: 4096,
      required: true
    },
    {
      name: 'world',
      description: 'A world to send',
      descriptionLocalizations: localization['command.command'],
      type: ApplicationCommandOptionType.String,
      maxLength: 4096,
      autocomplete: true
    }
  ]
}, async (interaction) => {
  const member = /** @type {import('discord.js').GuildMember} */(interaction.member);
  
  const isOP = member.roles.cache.hasAny(...main.config.command_role_id);
  if (!isOP) return interaction.reply({
    embeds: [ embeds.error(main.lang.run('command.error.nopermission')) ],
    ephemeral: true
  });
  
  const embed = new EmbedBuilder()
    .setDescription(main.lang.run('command.command.sending'))
      .setFooter({
      text: `Requested by ${member?.displayName}`,
      iconURL: interaction.user.displayAvatarURL()
    });
  await interaction.reply({ embeds: [embed] });
  
  const command = interaction.options.getString('command') ?? '';
  const worldName = interaction.options.getString('world');
  let worlds = main.server.getWorlds();
  if (worldName && worldName !== 'all') worlds = worlds.filter(w => w.name === worldName);
  const res = await sendCommand(main, command, embed, { worlds });
  
  const button = new ButtonBuilder()
    .setCustomId(deleteButtonId)
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('❌');
  const row = new ActionRowBuilder().setComponents(button);
  
  // @ts-ignore
  await interaction.editReply({ embeds: [res.embed], components: [row], files: res.files });
  if (res.files) fs.unlinkSync(res.files[0]);
  
  const filter = i => i.customId === deleteButtonId && i.user.id === interaction.user.id;
  const collector = interaction.channel.createMessageComponentCollector({ filter, time: 40*1000 });
  collector.once('collect', () => {
    interaction.deleteReply();
  });
  
  if (res.error) return;
  main.server.sendMessage(main.lang.run('minecraft.command', [
    member?.displayName,
    `/${command}`
  ]));
}, async (interaction) => {
  const focused = interaction.options.getFocused(true);
  const worlds = main.server.getWorlds().map(w => w.name);
  worlds.push('all');
  let choices = /** @type {{ name: string, value: string }[]} */ ([]);
  
  if (focused.name === 'world') {
    choices = worlds.map(w => ({ name: w, value: w }));
  }
  
  const filtered = choices.filter(choice => 
    choice.value.toLowerCase().startsWith(focused.value.toLowerCase())
  );
  
  await interaction.respond(filtered);
});

module.exports = [ runCommand ];