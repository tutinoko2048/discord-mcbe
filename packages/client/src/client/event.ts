import { world } from '@minecraft/server';
import { createPlayerDescriptor } from './util';
import {
  ActionId,
  type PlayerJoinAction,
  type PlayerLeaveAction,
  type ChatSendAction,
} from '@discord-mcbe/shared';
import { IBridgeClient } from '../transport';

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
      playerUniqueId: ev.playerId,
    });
  });

  world.afterEvents.chatSend.subscribe((ev) => {
    if (!bridge.isConnected) return;

    bridge.send<ChatSendAction>(ActionId.ChatSend, {
      senderName: ev.sender.name,
      senderUniqueId: ev.sender.id,
      message: ev.message,
    });
  });
}
