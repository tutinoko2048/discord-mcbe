import { system } from '@minecraft/server';

let lastTick: number | undefined;
const deltaTimes: number[] = [];
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
