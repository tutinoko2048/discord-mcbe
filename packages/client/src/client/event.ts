import { world } from '@minecraft/server';
import { createPlayerDescriptor } from './descriptors';
import {
  ActionId,
  type PlayerJoinAction,
  type PlayerLeaveAction,
  type ChatSendAction,
  type UniqueId,
} from '@discord-mcbe/shared';

import type { IBridgeClient } from '../transport';

export function registerEvents(bridge: IBridgeClient) {
  world.afterEvents.playerSpawn.subscribe((ev) => {
    if (!bridge.isConnected || !ev.initialSpawn) return;

    bridge.send<PlayerJoinAction>(ActionId.PlayerJoin, {
      player: createPlayerDescriptor(ev.player),
    });
  });

  world.afterEvents.playerLeave.subscribe((ev) => {
    if (!bridge.isConnected) return;

    bridge.send<PlayerLeaveAction>(ActionId.PlayerLeave, {
      playerUniqueId: ev.playerId as UniqueId,
    });
  });

  world.afterEvents.chatSend.subscribe((ev) => {
    if (!bridge.isConnected) return;

    bridge.send<ChatSendAction>(ActionId.ChatSend, {
      senderName: ev.sender.name,
      senderUniqueId: ev.sender.id as UniqueId,
      message: ev.message,
    });
  });

  if (__DEV__) console.log('§7[discord-mcbe] -- Successfully registered events.');
}
