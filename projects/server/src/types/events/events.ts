import type {
  MinecraftMessageEvent,
  PlayerJoinEvent,
  PlayerLeaveEvent,
  StartupEvent,
  WorldConnectEvent,
  WorldDisconnectEvent,
  ShutdownEvent,
  WorldLoadEvent,
  DiscordMessageEvent,
  DiscordReadyEvent,
  DiscordSendEvent,
} from '../../events';

export interface ApplicationEvents {
  startup: [StartupEvent];
  shutdown: [ShutdownEvent];
  worldConnect: [WorldConnectEvent];
  worldLoad: [WorldLoadEvent];
  worldDisconnect: [WorldDisconnectEvent];
  minecraftMessage: [MinecraftMessageEvent];
  discordMessage: [DiscordMessageEvent];
  playerJoin: [PlayerJoinEvent];
  playerLeave: [PlayerLeaveEvent];
  discordReady: [DiscordReadyEvent];
  discordSend: [DiscordSendEvent];
}
