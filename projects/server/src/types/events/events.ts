import { PlayerChatEvent, PlayerJoinEvent, PlayerLeaveEvent, StartupEvent, ConnectEvent, DisconnectEvent } from '../../events';

export interface ApplicationEvents {
  'startup': [StartupEvent];
  'connect': [ConnectEvent];
  'disconnect': [DisconnectEvent];
  'playerChat': [PlayerChatEvent];
  'playerJoin': [PlayerJoinEvent];
  'playerLeave': [PlayerLeaveEvent];
}