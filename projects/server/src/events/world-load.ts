import { MinecraftEvent } from './minecraft';

export class WorldLoadEvent extends MinecraftEvent {
  public static readonly identifier = 'worldLoad';
}
