const { EmbedBuilder } = require('discord.js');

const colors = /** @type {const} */ ({
  "success": 0x2979FF,
  "join": 0x48F542,
  "leave": 0xF54242,
  "error": 0xF44336
});
exports.colors = colors;

exports.ready = () => {
  return new EmbedBuilder()
    .setColor(colors.success)
    .setTimestamp(Date.now());
}

exports.connect = (text, worldName) => {
  return new EmbedBuilder()
    .setColor(colors.success)
    .setTimestamp(Date.now())
    .setFooter({ text: worldName })
    .setDescription(text);
}

exports.disconnect = (desc, worldName) => {
  return new EmbedBuilder()
    .setColor(colors.success)
    .setTimestamp(Date.now())
    .setFooter({ text: worldName })
    .setDescription(desc);
}

exports.join = (desc, worldName) => {
  const embed = new EmbedBuilder()
    .setColor(colors.join)
    .setDescription(desc);
  if (worldName) embed.setFooter({ text: worldName });
  return embed;
}

exports.leave = (desc, worldName) => {
  const embed = new EmbedBuilder()
    .setColor(colors.leave)
    .setDescription(desc);
  if (worldName) embed.setFooter({ text: worldName });
  return embed;
}

exports.error = (desc) => {
  return new EmbedBuilder()
    .setColor(colors.error)
    .setDescription(desc)
    .setAuthor({ name: '❌  Error' });
}

exports.tnac = (desc) => {
  return new EmbedBuilder()
    .setColor(0xFF7043)
    .setDescription(desc)
    .setTimestamp()
    .setAuthor({ name: 'TN-AntiCheat' });
}