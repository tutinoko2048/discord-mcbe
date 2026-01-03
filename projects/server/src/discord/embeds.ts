import { EmbedBuilder } from 'discord.js';

export const enum Palette {
  Success = 0x1E88E5,
  Error = 0xD32F2F,
  Discord = 0x5c64f4,
}

export const connect = (text: string, worldName: string) => {
  return new EmbedBuilder()
    .setColor(Palette.Success)
    .setTimestamp(Date.now())
    .setFooter({ text: worldName })
    .setDescription(text);
};

export const disconnect = (desc: string, worldName: string) => {
  return new EmbedBuilder()
    .setColor(Palette.Success)
    .setTimestamp(Date.now())
    .setFooter({ text: worldName })
    .setDescription(desc);
};

export const error = (desc: string) => {
  return new EmbedBuilder().setColor(Palette.Error).setDescription(desc).setAuthor({ name: '❌  Error' });
};

export const tnac = (desc: string) => {
  return new EmbedBuilder()
    .setColor(0xff7043)
    .setDescription(desc)
    .setTimestamp()
    .setAuthor({ name: 'TN-AntiCheat' });
};
