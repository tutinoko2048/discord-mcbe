import { EmbedBuilder, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { _t, _tm } from '../../util';
import { defineCommand } from '../command';

const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription(_t('command.ping.description'))
  .setDescriptionLocalizations(_tm('command.ping.description'))
  .setContexts(InteractionContextType.Guild);

export default defineCommand(data, async (interaction, app) => {
  const embed = new EmbedBuilder();
  embed.setTitle('Pong!');
  embed.setColor(0x52a535);
  embed.addFields({ name: 'Bot', value: `${interaction.client.ws.ping} ms` });
  embed.setFooter({ text: `discord-mcbe v${app.version}` });
  embed.setTimestamp();

  const worlds = app.minecraft.getWorlds();
  if (worlds.length === 0) {
    embed.setDescription(`-# ${_t('common.noOnlineWorlds')}`);
  }

  for (const world of app.minecraft.getWorlds()) {
    embed.addFields({ name: world.name, value: `Ping: ${world.averagePing} ms` });
  }

  await interaction.reply({ embeds: [embed] });
});
