import { DimensionDescriptor } from '@discord-mcbe/shared';
import { ScriptWorld } from './world';

export class ScriptDimension {
  private readonly world: ScriptWorld;

  public readonly id: string;

  public readonly heightRange: { min: number; max: number };

  constructor(world: ScriptWorld, descriptor: DimensionDescriptor) {
    this.world = world;
    this.id = descriptor.id;
    this.heightRange = descriptor.heightRange;
  }
}