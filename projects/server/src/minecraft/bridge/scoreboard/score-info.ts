import { ScoreboardScoreInfoDescriptor } from '@discord-mcbe/shared';
import { ScoreboardIdentity } from './identity';

export class ScriptScoreboardScoreInfo {
  readonly score: number;

  readonly participant: ScoreboardIdentity;

  constructor(descriptor: ScoreboardScoreInfoDescriptor) {
    this.score = descriptor.score;
    this.participant = new ScoreboardIdentity(descriptor.participant);
  }
}
