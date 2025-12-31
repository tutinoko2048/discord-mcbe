import {
  Player,
  Dimension,
  ScoreboardObjective,
  Entity,
  ScoreboardScoreInfo,
  ScoreboardIdentity,
  ScoreboardIdentityType,
} from '@minecraft/server';
import type {
  PlayerDescriptor,
  DimensionDescriptor,
  UniqueId,
  ScoreboardObjectiveDescriptor,
  ScoreboardParticipantDescriptor,
  ScoreboardScoreInfoDescriptor,
  ScoreboardIdentityDescriptor,
} from '@discord-mcbe/shared';

export function createPlayerDescriptor(player: Player): PlayerDescriptor {
  return {
    name: player.name,
    nameTag: player.nameTag,
    uniqueId: player.id as UniqueId,
    platformType: player.clientSystemInfo.platformType,
  };
}

export function createDimensionDescriptor(dimension: Dimension): DimensionDescriptor {
  return {
    id: dimension.id,
    heightRange: dimension.heightRange,
  };
}

export function createScoreboardObjectiveDescriptor(
  objective: ScoreboardObjective
): ScoreboardObjectiveDescriptor {
  return {
    id: objective.id,
    displayName: objective.displayName,
  };
}

export function createScoreboardParticipantDescriptor(
  target: Entity | string
): ScoreboardParticipantDescriptor {
  return typeof target === 'string' ? { fakePlayer: target } : { uniqueId: target.id as UniqueId };
}

export function createScoreboardIdentityDescriptor(
  identity: ScoreboardIdentity
): ScoreboardIdentityDescriptor {
  let entityUniqueId: UniqueId | undefined;
  if (
    (identity.type === ScoreboardIdentityType.Entity || identity.type === ScoreboardIdentityType.Player) &&
    // getEntity throws if the player is offline
    identity.displayName !== 'commands.scoreboard.players.offlinePlayerName'
  ) {
    entityUniqueId = identity.getEntity()?.id as UniqueId;
  }

  return {
    type: identity.type,
    id: identity.id,
    displayName: identity.displayName,
    entityUniqueId,
  };
}

export function createScoreboardScoreInfoDescriptor(
  info: ScoreboardScoreInfo
): ScoreboardScoreInfoDescriptor {
  return {
    score: info.score,
    participant: createScoreboardIdentityDescriptor(info.participant),
  };
}
