import { ScriptWorld } from './world';

export class ScriptPlayer {
  public readonly name: string;

  constructor(
    private readonly world: ScriptWorld,
    name: string,
  ) {
    this.name = name;
  }
}