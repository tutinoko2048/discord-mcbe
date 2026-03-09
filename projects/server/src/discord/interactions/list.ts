import { EmbedBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { defineCommand } from '../command';
import { ScriptWorld } from '../../minecraft';
import { _t, _tm } from '../../util';
import { createErrorEmbed, Palette } from '../embeds';

const SILENT_OPTION = 'silent';
const WORLD_OPTION = 'world';

const data = new SlashCommandBuilder()
  .setName('list')
  .setDescription(_t('command.list.description'))
  .setDescriptionLocalizations(_tm('command.list.description'))
  .addBooleanOption(option =>
    option
      .setName(SILENT_OPTION)
      .setDescription(_t('command.list.silent.description'))
      .setDescriptionLocalizations(_tm('command.list.silent.description')),
  )
  .addStringOption(option =>
    option
      .setName(WORLD_OPTION)
      .setDescription(_t('command.list.world.description'))
      .setDescriptionLocalizations(_tm('command.list.world.description'))
      .setAutocomplete(true),
  )
  .setContexts(InteractionContextType.Guild);

export default defineCommand(
  data,
  async (interaction, app) => {
    const silent = interaction.options.getBoolean(SILENT_OPTION) ?? false;
    const worldName = interaction.options.getString(WORLD_OPTION);

    const allWorlds = app.minecraft.getWorlds();

    let useFields = false;
    let worlds: ScriptWorld[];
    if (worldName) {
      const world = app.minecraft.getWorlds().find((w) => w.name === worldName);
      if (!world) {
        const embed = createErrorEmbed(_t('command.list.world.notFound', worldName));
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
      }
      useFields = true;
      worlds = [world];
    } else {
      worlds = allWorlds;
    }

    const embed = new EmbedBuilder();
    embed.setColor(Palette.Success);
    embed.setTitle('List')

    if (worlds.length === 0) {
      embed.setDescription(`-# ${_t('common.noOnlineWorlds')}`);
    } else if (useFields || worlds.length > 1) {
      for (const world of worlds) {
        embed.addFields({ name: world.name, value: getPlayerListText(world) });
      }
    } else {
      const world = worlds[0]!;
      embed.setDescription(getPlayerListText(world));
    }

    await interaction.reply({
      embeds: [embed],
      flags: silent ? MessageFlags.Ephemeral : undefined,
    });
  },
  async (interaction, app) => {
    const focused = interaction.options.getFocused(true);

    if (focused.name === WORLD_OPTION) {
      const worlds = app.minecraft.getWorlds();
      await interaction.respond(
        worlds.map((w) => {
          const { current, max } = w.getPlayerList();
          return {
            name: max === undefined
              ? `${w.name} - ${current} players`
              : `${w.name} - ${current}/${max} players`,
            value: w.name,
          };
        }),
      );
    }
  }
);

function getPlayerListText(world: ScriptWorld): string {
  const { current, max, players } = world.getPlayerList();

  if (max === undefined) {
    return [
      `${_t('command.list.players')}: ${current}`,
      ...players.map((p) => `- ${p.name}`),
    ].filter(Boolean).join('\n');
  } else {
    return [
      `${_t('command.list.players')}: ${current}/${max}`,
      ...players.map((p) => `- ${p.name}`),
    ].filter(Boolean).join('\n');
  }
}
