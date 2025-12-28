// ⚠️ AUTO-GENERATED FILE
// DO NOT EDIT MANUALLY

/* biome-ignore */

export type Arg = string | number;


export type Locale =
  | "en_US"
  | "fr_FR"
  | "ja_JP";



export type LangArgs = {
  "command.command.sending": [];
  "command.error.catch": [];
  "command.error.nopermission": [];
  "command.error.noworlds": [];
  "command.help.commands": [];
  "command.list.fetching": [];
  "command.list.offline": [];
  "command.panel.deleted": [];
  "command.panel.jump": [];
  "command.panel.notfound": [];
  "command.panel.set": [Arg];
  "command.ping.startAt": [Arg];
  "console.attachment": [Arg, Arg];
  "console.attachments": [Arg, Arg];
  "console.chat": [Arg, Arg];
  "console.command": [Arg, Arg];
  "console.connect": [Arg, Arg];
  "console.disconnect": [Arg];
  "console.join": [Arg, Arg, Arg];
  "console.leave": [Arg, Arg, Arg];
  "console.listening": [Arg];
  "console.login": [Arg];
  "console.me": [Arg, Arg];
  "console.message": [Arg, Arg];
  "console.say": [Arg];
  "discord.chat": [Arg, Arg];
  "discord.connect": [Arg];
  "discord.disconnect": [];
  "discord.join": [Arg, Arg, Arg];
  "discord.leave": [Arg, Arg, Arg];
  "discord.list": [Arg, Arg, Arg];
  "discord.me": [Arg, Arg];
  "discord.ready": [];
  "discord.say": [Arg];
  "minecraft.attachments": [Arg, Arg];
  "minecraft.command": [Arg, Arg];
  "minecraft.connect": [Arg];
  "minecraft.message": [Arg, Arg];
  "util.duration": [Arg, Arg, Arg];
};


export type LangKey = keyof LangArgs;
