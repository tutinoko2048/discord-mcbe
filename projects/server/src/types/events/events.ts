import { PlayerChatEvent, PlayerJoinEvent, PlayerLeaveEvent, StartupEvent } from '../../events';

export interface ApplicationEvents {
  'startup': [StartupEvent];
  //TODO - connect and disconnect event
  'playerChat': [PlayerChatEvent];
  'playerJoin': [PlayerJoinEvent];
  'playerLeave': [PlayerLeaveEvent];
}