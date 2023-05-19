const { ChatInput } = require('@akki256/discord-interaction');
const { ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const setPanel = require('./set_panel');
const getPanel = require('./get_panel');
const deletePanel = require('./delete_panel');
const localization = require('../_localizations.json');

const subcommands = /** @type {const} */ ({
  set: 'set',
  get: 'get',
  delete: 'delete'
});

const panelCommand = new ChatInput({
  name: 'panel',
  description: 'Commands related to the status panel',
  descriptionLocalizations: localization['panel'],
  options: [
    {
      name: subcommands.set,
      description: 'Sets the channel to show the status panel',
      descriptionLocalizations: localization['panel.set'],
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: subcommands.get,
      description: 'Gets the channel the status panel is shown',
      descriptionLocalizations: localization['panel.get'],
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: subcommands.delete,
      description: 'Deletes the status panel',
      descriptionLocalizations: localization['panel.delete'],
      type: ApplicationCommandOptionType.Subcommand
    }
  ],
  defaultMemberPermissions: PermissionFlagsBits.Administrator
}, async (interaction) => {
  
  const subcmd = interaction.options.getSubcommand();
  
  if (subcmd === subcommands.set) return await setPanel(interaction);
  if (subcmd === subcommands.get) return await getPanel(interaction);
  if (subcmd === subcommands.delete) return await deletePanel(interaction);
});

module.exports = [ panelCommand ];