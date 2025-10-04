import { world } from '@minecraft/server';
import { createPlayerDescriptor } from './util';
import type { ScriptBridgeClient } from '@script-bridge/client';
import {
  ActionId,
  type PlayerJoinAction,
  type PlayerLeaveAction,
  type ChatSendAction,
} from '@discord-mcbe/shared';

export function registerEvents(bridge: ScriptBridgeClient) {
  world.afterEvents.playerSpawn.subscribe((ev) => {
    if (!ev.initialSpawn) return;

    bridge.send<PlayerJoinAction>(ActionId.PlayerJoin, {
      player: createPlayerDescriptor(ev.player),
    });
  });

  world.afterEvents.playerLeave.subscribe((ev) => {
    bridge.send<PlayerLeaveAction>(ActionId.PlayerLeave, {
      playerUniqueId: ev.playerId,
    });
  });

  world.afterEvents.chatSend.subscribe((ev) => {
    bridge.send<ChatSendAction>(ActionId.ChatSend, {
      senderName: ev.sender.name,
      senderUniqueId: ev.sender.id,
      message: ev.message,
    });
  });
}
