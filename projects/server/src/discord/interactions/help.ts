import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  chatInputApplicationCommandMention,
  EmbedBuilder,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  type ApplicationCommand,
} from 'discord.js';
import { _t, _tm } from '../../util';
import { GITHUB_URL } from '../../util/constants';
import { defineCommand } from '../command';
import { Palette } from '../embeds';

const SILENT_OPTION = 'silent';

const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription(_t('command.help.description'))
  .setDescriptionLocalizations(_tm('command.help.description'))
  .setContexts(InteractionContextType.Guild)
  .addBooleanOption((option) =>
    option
      .setName(SILENT_OPTION)
      .setDescription(_t('command.help.silent.description'))
      .setDescriptionLocalizations(_tm('command.help.silent.description')),
  );

export default defineCommand(data, async (interaction, app) => {
  const silent = interaction.options.getBoolean(SILENT_OPTION) ?? false;
  const commands = await interaction.guild.commands.fetch();
  const description = createCommandDescription(commands.values());

  const embed = new EmbedBuilder()
    .setColor(Palette.Success)
    .setTitle(_t('command.help.commands'))
    .setDescription(
      [
        // oxfmt-ignore
        description,
        ``,
        `GitHub: ${GITHUB_URL}`,
      ].join('\n'),
    )
    .setFooter({ text: `discord-mcbe v${app.version}` });

  await interaction.reply({ embeds: [embed], flags: silent ? MessageFlags.Ephemeral : undefined });
});

function createCommandDescription(commands: Iterable<ApplicationCommand>): string {
  return [...commands]
    .filter((command) => command.type === ApplicationCommandType.ChatInput)
    .flatMap((command) => {
      const subcommands = command.options.flatMap((option) => {
        if (option.type === ApplicationCommandOptionType.Subcommand) {
          return [
            `${chatInputApplicationCommandMention(command.name, option.name, command.id)} — ${option.description}`,
          ];
        }
        if (option.type === ApplicationCommandOptionType.SubcommandGroup) {
          return (option.options ?? []).map(
            (subcommand) =>
              `${chatInputApplicationCommandMention(command.name, option.name, subcommand.name, command.id)} — ${subcommand.description}`,
          );
        }
        return [];
      });
      return subcommands.length
        ? subcommands
        : [`${chatInputApplicationCommandMention(command.name, command.id)} — ${command.description}`];
    })
    .join('\n');
}
