import { PlayerDescriptor } from '@discord-mcbe/shared';
import { Player, system } from '@minecraft/server';

export function createPlayerDescriptor(player: Player): PlayerDescriptor {
  return {
    name: player.name,
    nameTag: player.nameTag,
    uniqueId: player.id,
    platformType: player.clientSystemInfo.platformType,
  };
}

let lastTick: number | undefined;
let deltaTimes: number[] = [];
system.runInterval(() => {
  const now = Date.now();
  if (lastTick) {
    if (deltaTimes.length > 60) deltaTimes.shift(); // Keep the last 60 ticks
    deltaTimes.push(now - lastTick);
  }
  lastTick = now;
});

export function getTPS(): number {
  if (deltaTimes.length === 0) return 20;
  const averageDelta = deltaTimes.reduce((sum, delta) => sum + delta, 0) / deltaTimes.length;
  const tps = 1000 / averageDelta;
  return Math.floor(tps * 100) / 100;
}
