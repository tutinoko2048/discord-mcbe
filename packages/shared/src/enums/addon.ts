/** Features an add-on can request when it registers with discord-mcbe. */
export enum AddonFeature {
  /** The add-on handles Minecraft chat itself and reports it to discord-mcbe. */
  MinecraftChat = 'minecraft_chat',
  /** The add-on displays chat relayed from Discord in place of discord-mcbe. */
  DiscordChat = 'discord_chat',
}
