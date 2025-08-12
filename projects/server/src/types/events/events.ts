import { PlayerChatEvent, StartupEvent } from '../../events';

export interface ApplicationEvents {
  'startup': [StartupEvent];
  'playerChat': [PlayerChatEvent];
}