import type { DimensionDescriptor } from '@discord-mcbe/shared';

export class ScriptDimension {
  public readonly id: string;

  public readonly heightRange: { min: number; max: number };

  constructor(descriptor: DimensionDescriptor) {
    this.id = descriptor.id;
    this.heightRange = descriptor.heightRange;
  }
}
