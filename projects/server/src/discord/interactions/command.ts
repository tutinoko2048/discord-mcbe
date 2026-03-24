import { writeFile, rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AttachmentBuilder,
  codeBlock,
  EmbedBuilder,
  inlineCode,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { CommandResult } from 'socket-be';
import { defineCommand } from '../command';
import { createErrorEmbed, Palette } from '../embeds';
import { _t, _tm } from '../../util';
import { ScriptWorld } from '../../minecraft';

const COMMAND_OPTION = 'command';
const RAW_OPTION = 'raw';
const WORLD_OPTION = 'world';
const SILENT_OPTION = 'silent';

const data = new SlashCommandBuilder()
  .setName('command')
  .setDescription(_t('command.command.description'))
  .setDescriptionLocalizations(_tm('command.command.description'))
  .addStringOption((option) =>
    option
      .setName(COMMAND_OPTION)
      .setDescription(_t('command.command.command.description'))
      .setDescriptionLocalizations(_tm('command.command.command.description'))
      .setRequired(true),
  )
  .addBooleanOption((option) =>
    option
      .setName(RAW_OPTION)
      .setDescription(_t('command.command.raw.description'))
      .setDescriptionLocalizations(_tm('command.command.raw.description')),
  )
  .addStringOption((option) =>
    option
      .setName(WORLD_OPTION)
      .setDescription(_t('command.command.world.description'))
      .setDescriptionLocalizations(_tm('command.command.world.description'))
      .setAutocomplete(true),
  )
  .addBooleanOption((option) =>
    option
      .setName(SILENT_OPTION)
      .setDescription(_t('command.command.silent.description'))
      .setDescriptionLocalizations(_tm('command.command.silent.description')),
  )
  .setContexts(InteractionContextType.Guild);

export default defineCommand(
  data,
  async (interaction, app) => {
    const command = interaction.options.getString(COMMAND_OPTION, true);
    const raw = interaction.options.getBoolean(RAW_OPTION) ?? false;
    const worldName = interaction.options.getString(WORLD_OPTION);
    const silent = interaction.options.getBoolean(SILENT_OPTION) ?? false;

    const allWorlds = app.minecraft.getWorlds();
    let targetWorlds: ScriptWorld[];

    if (worldName) {
      const world = app.minecraft.getWorlds().find((w) => w.name === worldName);
      if (!world) {
        const embed = createErrorEmbed(_t('common.worldNotFound', worldName));
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
      }
      targetWorlds = [world];
    } else {
      targetWorlds = allWorlds;
    }

    if (targetWorlds.length === 0) {
      const embed = createErrorEmbed(_t('common.noOnlineWorlds'));
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    const sendingEmbed = new EmbedBuilder()
      .setColor(Palette.Success)
      .setDescription(_t('command.command.sending'));
    await interaction.reply({ embeds: [sendingEmbed], flags: silent ? MessageFlags.Ephemeral : undefined });

    const results = await Promise.all(
      targetWorlds.map(async (world) => {
        try {
          let rawResult: Awaited<ReturnType<typeof world.runCommand>> | CommandResult<{}>;
          let message: string;
          if (world.isLocal()) {
            const res = await world.session.world.runCommand(command);
            rawResult = res;
            message = res.statusMessage || 'Success';
          } else {
            const res = await world.runCommand(command);
            rawResult = res;
            message = `Success Count: ${res.successCount}`;
          }

          return { error: false, world, message, rawResult };
        } catch (error) {
          const message = Error.isError(error) ? error.message : String(error);
          return {
            error: true,
            world,
            message: inlineCode(message),
            rawResult: { error: message },
          };
        }
      }),
    );

    const attachments: AttachmentBuilder[] = [];

    const embed = new EmbedBuilder();
    embed.setTitle('Command Results');

    if (results.every((r) => r.error === true)) {
      embed.setColor(Palette.Error);
    } else if (results.some((r) => r.error === true)) {
      embed.setColor('Yellow');
    } else {
      embed.setColor(Palette.Success);
    }

    const lines = results
      .map(({ world, message, rawResult }) => {
        const result = raw ? codeBlock(JSON.stringify(rawResult, null, 2)) : message;
        return `${targetWorlds.length > 1 ? `**${world.name}**\n` : ''}${result}`;
      })
      .join('\n');

    const tempDir = await mkdtemp(join(tmpdir(), 'discord-mcbe-'));
    try {
      const tempFilePath = join(tempDir, 'results.txt');
      await writeFile(tempFilePath, lines);

      if (lines.length > 500) {
        attachments.push(new AttachmentBuilder(tempFilePath, { name: 'results.txt' }));
      } else {
        embed.setDescription(lines);
      }

      await interaction.editReply({
        embeds: [embed],
        files: attachments,
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  },
  async (interaction, app) => {
    const focused = interaction.options.getFocused(true);

    if (focused.name === WORLD_OPTION) {
      const worlds = app.minecraft.getWorlds();
      await interaction.respond(
        worlds.map((w) => ({
          name: w.name,
          value: w.name,
        })),
      );
    }
  },
);
