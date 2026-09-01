import type {
  MinecraftMessageEvent,
  PlayerDieEvent,
  PlayerJoinEvent,
  PlayerLeaveEvent,
  StartupEvent,
  WorldConnectEvent,
  WorldDisconnectEvent,
  ShutdownEvent,
  DiscordMessageEvent,
  DiscordReadyEvent,
  DiscordSendEvent,
} from '../../events';

export interface ApplicationEvents {
  startup: [StartupEvent];
  shutdown: [ShutdownEvent];
  worldConnect: [WorldConnectEvent];
  worldDisconnect: [WorldDisconnectEvent];
  minecraftMessage: [MinecraftMessageEvent];
  discordMessage: [DiscordMessageEvent];
  playerJoin: [PlayerJoinEvent];
  playerLeave: [PlayerLeaveEvent];
  playerDie: [PlayerDieEvent];
  discordReady: [DiscordReadyEvent];
  discordSend: [DiscordSendEvent];
}
