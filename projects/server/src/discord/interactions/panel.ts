import { channelMention, EmbedBuilder, InteractionContextType, MessageFlags, messageLink, SlashCommandBuilder } from 'discord.js';
import { _t, _tm } from '../../util';
import { defineCommand } from '../command';
import { createErrorEmbed, Palette } from '../embeds';

const SUBCOMMAND_CREATE = 'create';
const SUBCOMMAND_SHOW = 'show';

const data = new SlashCommandBuilder()
  .setName('panel')
  .setDescription(_t('command.panel.description'))
  .setDescriptionLocalizations(_tm('command.panel.description'))
  .setContexts(InteractionContextType.Guild)
  .addSubcommand(subcommand =>
    subcommand
      .setName(SUBCOMMAND_CREATE)
      .setDescription(_t('command.panel.create.description'))
      .setDescriptionLocalizations(_tm('command.panel.create.description'))
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName(SUBCOMMAND_SHOW)
      .setDescription(_t('command.panel.show.description'))
      .setDescriptionLocalizations(_tm('command.panel.show.description'))
  );

export default defineCommand(
  data,
  async (interaction, app) => {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === SUBCOMMAND_CREATE) {
      const channelId = interaction.channelId;
      await app.bot.panels.delete();
      await app.bot.panels.create(channelId);

      const embed = new EmbedBuilder()
        .setAuthor({ name: 'Status Panel' })
        .setColor(Palette.Success)
        .setDescription(`${_t('command.panel.create.success', channelMention(channelId))}`);

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    } else if (subcommand === SUBCOMMAND_SHOW) {
      const panel = await app.bot.panels.fetchMessage();
      if (!panel) {
        const embed = createErrorEmbed(_t('command.panel.show.notFound'));
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
      }

      const embed = new EmbedBuilder()
        .setAuthor({ name: 'Status Panel' })
        .setColor(Palette.Success)
        .setDescription(messageLink(panel.channelId, panel.id));

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    } else {
      const embed = createErrorEmbed('Unknown subcommand');
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
);
