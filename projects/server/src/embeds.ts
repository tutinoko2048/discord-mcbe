import { EmbedBuilder } from 'discord.js';

export const colors = {
  "success": 0x2979FF,
  "join": 0x48F542,
  "leave": 0xF54242,
  "error": 0xF44336
} as const;

export const ready = () => {
  return new EmbedBuilder()
    .setColor(colors.success)
    .setTimestamp(Date.now());
}

export const connect = (text: string, worldName: string) => {
  return new EmbedBuilder()
    .setColor(colors.success)
    .setTimestamp(Date.now())
    .setFooter({ text: worldName })
    .setDescription(text);
}

export const disconnect = (desc, worldName) => {
  return new EmbedBuilder()
    .setColor(colors.success)
    .setTimestamp(Date.now())
    .setFooter({ text: worldName })
    .setDescription(desc);
}

export const join = (desc, worldName) => {
  const embed = new EmbedBuilder()
    .setColor(colors.join)
    .setDescription(desc);
  if (worldName) embed.setFooter({ text: worldName });
  return embed;
}

export const leave = (desc, worldName) => {
  const embed = new EmbedBuilder()
    .setColor(colors.leave)
    .setDescription(desc);
  if (worldName) embed.setFooter({ text: worldName });
  return embed;
}

export const error = (desc) => {
  return new EmbedBuilder()
    .setColor(colors.error)
    .setDescription(desc)
    .setAuthor({ name: '❌  Error' });
}

export const tnac = (desc) => {
  return new EmbedBuilder()
    .setColor(0xFF7043)
    .setDescription(desc)
    .setTimestamp()
    .setAuthor({ name: 'TN-AntiCheat' });
}