import { PlayerDescriptor } from '@discord-mcbe/shared';
import { ScriptWorld } from './world';

export class ScriptPlayer {
  private readonly world: ScriptWorld;
  
  public readonly name: string;

  public readonly nameTag: string;

  public readonly uniqueId: string;

  constructor(
    world: ScriptWorld,
    descriptor: PlayerDescriptor
  ) {
    this.world = world;
    this.name = descriptor.name;
    this.nameTag = descriptor.nameTag;
    this.uniqueId = descriptor.uniqueId;
  }

  async sendMessage(message: string): Promise<void> {

  }
}