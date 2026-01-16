import { MinecraftEvent } from './minecraft';

/**
 * Cancellable.
 */
export class WorldConnectEvent extends MinecraftEvent {
  public static readonly identifier = 'worldConnect';
}
