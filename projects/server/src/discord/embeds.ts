import { EmbedBuilder } from 'discord.js';

export const colors = {
  success: 0x2979ff,
  join: 0x48f542,
  leave: 0xf54242,
  error: 0xf44336,
} as const;

export const ready = () => {
  return new EmbedBuilder().setColor(colors.success).setTimestamp(Date.now());
};

export const connect = (text: string, worldName: string) => {
  return new EmbedBuilder()
    .setColor(colors.success)
    .setTimestamp(Date.now())
    .setFooter({ text: worldName })
    .setDescription(text);
};

export const disconnect = (desc: string, worldName: string) => {
  return new EmbedBuilder()
    .setColor(colors.success)
    .setTimestamp(Date.now())
    .setFooter({ text: worldName })
    .setDescription(desc);
};

export const join = (desc: string, worldName: string) => {
  const embed = new EmbedBuilder().setColor(colors.join).setDescription(desc);
  if (worldName) embed.setFooter({ text: worldName });
  return embed;
};

export const leave = (desc: string, worldName: string) => {
  const embed = new EmbedBuilder().setColor(colors.leave).setDescription(desc);
  if (worldName) embed.setFooter({ text: worldName });
  return embed;
};

export const error = (desc: string) => {
  return new EmbedBuilder()
    .setColor(colors.error)
    .setDescription(desc)
    .setAuthor({ name: '❌  Error' });
};

export const tnac = (desc: string) => {
  return new EmbedBuilder()
    .setColor(0xff7043)
    .setDescription(desc)
    .setTimestamp()
    .setAuthor({ name: 'TN-AntiCheat' });
};
