import type { ScoreboardIdentityType } from '../enums';
import type { UniqueId } from './player';

export interface ScoreboardObjectiveDescriptor {
  id: string;
  displayName?: string;
}

export interface ScoreboardParticipantDescriptor {
  uniqueId?: UniqueId;
  fakePlayer?: string;
}

export interface ScoreboardIdentityDescriptor {
  type: ScoreboardIdentityType;
  id: number;
  displayName: string;
  entityUniqueId?: UniqueId;
}

export interface ScoreboardScoreInfoDescriptor {
  score: number;
  participant: ScoreboardIdentityDescriptor;
}
