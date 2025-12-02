import { PlayerDescriptor, DimensionDescriptor } from '@discord-mcbe/shared';
import { Player, Dimension } from '@minecraft/server';

export function createPlayerDescriptor(player: Player): PlayerDescriptor {
  return {
    name: player.name,
    nameTag: player.nameTag,
    uniqueId: player.id,
    platformType: player.clientSystemInfo.platformType,
  };
}

export function createDimensionDescriptor(dimension: Dimension): DimensionDescriptor {
  return {
    id: dimension.id,
    heightRange: dimension.heightRange,
  };
}
