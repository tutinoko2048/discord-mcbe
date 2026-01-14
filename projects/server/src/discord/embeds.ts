import { EmbedBuilder } from 'discord.js';

export const enum Palette {
  Success = 0x1e88e5,
  Error = 0xd32f2f,
  Discord = 0x5c64f4,
  Connect = 0x4fc3f7,
  Disconnect = 0x757575,
  Join = 0x66bb6a,
  Leave = 0xef5350,
}

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
