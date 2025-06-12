import { world } from '@minecraft/server';
import { toDescriptor } from './util';
import type { ScriptBridgeClient } from '@script-bridge/client';
import {
  ActionId,
  type PlayerJoinAction,
  type PlayerLeaveAction,
} from '@discord-mcbe/shared';

export function registerEvents(bridge: ScriptBridgeClient) {
  world.afterEvents.playerSpawn.subscribe(ev => {
    if (!ev.initialSpawn) return;
    
    bridge.send<PlayerJoinAction>(ActionId.PlayerJoin, {
      player: toDescriptor(ev.player),
    });
  });

  world.afterEvents.playerLeave.subscribe(ev => {
    bridge.send<PlayerLeaveAction>(ActionId.PlayerLeave, {
      playerUniqueId: ev.playerId,
    });
  });
}