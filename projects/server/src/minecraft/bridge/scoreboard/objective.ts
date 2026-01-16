import * as util from 'node:util';
import type { ScoreboardObjectiveDescriptor } from '@discord-mcbe/shared';
import type { ScriptPlayer } from '../player';
import type { ScriptScoreboardScoreInfo } from './score-info';
import type { ScriptScoreboard } from './scoreboard';

export class ScriptScoreboardObjective {
  private readonly scoreboard: ScriptScoreboard;

  /**
   * Identifier of the scoreboard objective.
   */
  public readonly id: string;

  /**
   * Returns the player-visible name of this scoreboard objective.
   */
  public readonly displayName?: string;

  constructor(scoreboard: ScriptScoreboard, descriptor: ScoreboardObjectiveDescriptor) {
    this.scoreboard = scoreboard;
    this.id = descriptor.id;
    this.displayName = descriptor.displayName;
  }

  async getScore(player: ScriptPlayer | string): Promise<number | null> {
    return this.scoreboard.getScore(player, this);
  }

  async getScores(): Promise<ScriptScoreboardScoreInfo[]> {
    return this.scoreboard.getScores(this);
  }

  async setScore(player: ScriptPlayer | string, score: number): Promise<number> {
    return this.scoreboard.setScore(player, this, score);
  }

  async addScore(player: ScriptPlayer | string, score: number): Promise<number> {
    return this.scoreboard.addScore(player, this, score);
  }

  async removeScore(player: ScriptPlayer | string, score: number): Promise<number> {
    return this.scoreboard.removeScore(player, this, score);
  }

  async removeParticipant(player: ScriptPlayer | string): Promise<void> {
    return this.scoreboard.removeParticipant(player, this);
  }

  [util.inspect.custom](
    _depth: number,
    options: util.InspectOptionsStylized,
    inspect: typeof util.inspect,
  ): string {
    return `ScriptScoreboardObjective ${inspect(
      {
        id: this.id,
        displayName: this.displayName,
      },
      options,
    )}`;
  }
}
