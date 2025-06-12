import { PlayerDescriptor } from '@discord-mcbe/shared';
import { Player } from '@minecraft/server';

export function toDescriptor(player: Player): PlayerDescriptor {
  return {
    name: player.name,
    nameTag: player.nameTag,
    uniqueId: player.id,
  };
}