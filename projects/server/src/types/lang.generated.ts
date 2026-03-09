// ⚠️ AUTO-GENERATED FILE
// DO NOT EDIT MANUALLY

/* biome-ignore: auto-generated file. */

export type Arg = string | number;


export type Locale =
  | 'en-US'
  | 'fr'
  | 'ja';



export type LangArgs = {
  'command.command.sending': [];
  'command.error.catch': [];
  'command.error.nopermission': [];
  'command.error.noworlds': [];
  'command.help.commands': [];
  'command.list.description': [];
  'command.list.players': [];
  'command.list.silent.description': [];
  'command.list.world.description': [];
  'command.list.world.notFound': [Arg];
  'command.panel.create.description': [];
  'command.panel.create.success': [Arg];
  'command.panel.description': [];
  'command.panel.show.description': [];
  'command.panel.show.notFound': [];
  'command.ping.description': [];
  'common.duration': [Arg, Arg, Arg];
  'common.noOnlineWorlds': [];
  'console.chat': [Arg, Arg, Arg];
  'console.command': [Arg, Arg, Arg];
  'console.connect': [Arg];
  'console.disconnect': [Arg];
  'console.join': [Arg, Arg];
  'console.leave': [Arg, Arg];
  'console.login': [Arg];
  'console.message': [Arg, Arg, Arg];
  'console.message.withAttachments': [Arg, Arg, Arg];
  'console.reply': [Arg, Arg, Arg, Arg];
  'console.reply.withAttachments': [Arg, Arg, Arg, Arg];
  'console.script.ready': [Arg];
  'console.socket.command': [Arg];
  'console.socket.ready': [Arg];
  'discord.chat': [Arg, Arg];
  'discord.chat.multipleWorlds': [Arg, Arg, Arg];
  'discord.connect': [];
  'discord.disconnect': [];
  'discord.join': [Arg];
  'discord.leave': [Arg];
  'discord.panel.uptime': [];
  'discord.ready': [];
  'minecraft.connect': [Arg];
  'minecraft.message': [Arg, Arg];
  'minecraft.message.withAttachments': [Arg, Arg];
  'minecraft.reply': [Arg, Arg, Arg];
  'minecraft.reply.withAttachments': [Arg, Arg, Arg];
};


export type LangKey = keyof LangArgs;
