import { ScoreboardIdentity } from './identity';
import type { ScoreboardScoreInfoDescriptor } from '@discord-mcbe/shared';

export class ScriptScoreboardScoreInfo {
  readonly score: number;

  readonly participant: ScoreboardIdentity;

  constructor(descriptor: ScoreboardScoreInfoDescriptor) {
    this.score = descriptor.score;
    this.participant = new ScoreboardIdentity(descriptor.participant);
  }
}
