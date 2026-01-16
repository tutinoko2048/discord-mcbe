import { MinecraftEvent } from './minecraft';

export class WorldDisconnectEvent extends MinecraftEvent {
  public static readonly identifier = 'worldDisconnect';
}
