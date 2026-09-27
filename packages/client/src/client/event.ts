import { Player, world } from '@minecraft/server';
import { createPlayerDescriptor } from './descriptors';
import { ActionId, type UniqueId } from '@discord-mcbe/shared';

import type { IBridgeClient } from '../transport/interfaces';

export function registerEvents(bridge: IBridgeClient) {
  world.afterEvents.playerSpawn.subscribe((ev) => {
    if (!bridge.isConnected || !ev.initialSpawn) return;

    bridge.notify({
      type: ActionId.PlayerJoin,
      data: { player: createPlayerDescriptor(ev.player) },
    });
  });

  world.afterEvents.playerLeave.subscribe((ev) => {
    if (!bridge.isConnected) return;

    bridge.notify({
      type: ActionId.PlayerLeave,
      data: { playerUniqueId: ev.playerId as UniqueId },
    });
  });

  world.afterEvents.entityDie.subscribe((ev) => {
    if (!bridge.isConnected || !(ev.deadEntity instanceof Player)) return;

    const source = ev.damageSource.damagingEntity;
    bridge.notify({
      type: ActionId.PlayerDie,
      data: {
        playerUniqueId: ev.deadEntity.id as UniqueId,
        cause: ev.damageSource.cause,
        damagingEntity:
          source instanceof Player
            ? {
                isPlayer: true,
                name: source.name,
                nameTag: source.nameTag,
                typeId: source.typeId,
                localizationKey: source.localizationKey,
              }
            : source?.isValid
              ? {
                  isPlayer: false,
                  nameTag: source.isValid ? source.nameTag : undefined,
                  typeId: source.typeId,
                  localizationKey: source.localizationKey,
                }
              : undefined,
      },
    });
  });

  world.afterEvents.chatSend.subscribe((ev) => {
    if (!bridge.isConnected) return;

    bridge.notify({
      type: ActionId.ChatSend,
      data: {
        senderName: ev.sender.name,
        senderUniqueId: ev.sender.id as UniqueId,
        message: ev.message,
      },
    });
  });

  if (__DEV__) console.log('§7[discord-mcbe] -- Successfully registered events.');
}
