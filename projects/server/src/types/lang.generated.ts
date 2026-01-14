// ⚠️ AUTO-GENERATED FILE
// DO NOT EDIT MANUALLY

/* biome-ignore */

export type Arg = string | number;


export type Locale =
  | 'en_US'
  | 'fr_FR'
  | 'ja_JP';



export type LangArgs = {
  'command.command.sending': [];
  'command.error.catch': [];
  'command.error.nopermission': [];
  'command.error.noworlds': [];
  'command.help.commands': [];
  'command.list.fetching': [];
  'command.list.offline': [];
  'command.panel.deleted': [];
  'command.panel.jump': [];
  'command.panel.notfound': [];
  'command.panel.set': [Arg];
  'command.ping.startAt': [Arg];
  'console.chat': [Arg, Arg, Arg];
  'console.command': [Arg, Arg, Arg];
  'console.connect': [Arg];
  'console.disconnect': [Arg];
  'console.join': [Arg, Arg];
  'console.leave': [Arg, Arg];
  'console.login': [Arg];
  'console.message': [Arg, Arg, Arg];
  'console.script.ready': [Arg];
  'console.socket.command': [Arg];
  'console.socket.ready': [Arg];
  'console.withAttachments': [Arg, Arg, Arg];
  'discord.chat': [Arg, Arg];
  'discord.chat.multipleWorlds': [Arg, Arg, Arg];
  'discord.connect': [];
  'discord.disconnect': [];
  'discord.join': [Arg];
  'discord.leave': [Arg];
  'discord.list': [Arg, Arg, Arg];
  'discord.ready': [];
  'minecraft.connect': [Arg];
  'minecraft.message': [Arg, Arg];
  'minecraft.withAttachments': [Arg, Arg];
  'util.duration': [Arg, Arg, Arg];
};


export type LangKey = keyof LangArgs;
