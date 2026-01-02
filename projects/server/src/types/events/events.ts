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
}
