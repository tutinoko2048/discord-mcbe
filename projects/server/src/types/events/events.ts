import type {
  ChatSendEvent,
  PlayerJoinEvent,
  PlayerLeaveEvent,
  StartupEvent,
  WorldConnectEvent,
  WorldDisconnectEvent,
  ShutdownEvent,
  WorldLoadEvent,
} from '../../events';

export interface ApplicationEvents {
  startup: [StartupEvent];
  shutdown: [ShutdownEvent];
  worldConnect: [WorldConnectEvent];
  worldLoad: [WorldLoadEvent];
  worldDisconnect: [WorldDisconnectEvent];
  chatSend: [ChatSendEvent];
  playerJoin: [PlayerJoinEvent];
  playerLeave: [PlayerLeaveEvent];
}
