import { world, Player } from '@minecraft/server';
import type { ScriptBridgeClient } from '@script-bridge/client';
import {
  ActionId,
  type SendMessageAction,
  type GetEntityLocationAction,
  type GetGameModeAction,
  type SetGameModeAction,
  RunCommandAction,
} from '@discord-mcbe/shared';

export function registerHandlers(bridge: ScriptBridgeClient) {
  bridge.registerHandler<SendMessageAction>(ActionId.SendMessage, (action) => {
    const { message, playerUniqueId } = action.data;

    if (playerUniqueId) {
      const entity = world.getEntity(playerUniqueId);
      if (!(entity instanceof Player)) throw new Error('Player not found');
      entity.sendMessage(message);
    } else {
      world.sendMessage(message);
    }

    action.respond();
  });

  bridge.registerHandler<RunCommandAction>(ActionId.RunCommand, (action) => {
    const { command } = action.data;

    const overworld = world.getDimension('overworld');
    const { successCount } = overworld.runCommand(command);
    action.respond({ successCount });
  });

  bridge.registerHandler<GetEntityLocationAction>(ActionId.GetEntityLocation, (action) => {
    const { entityUniqueId } = action.data;

    const entity = world.getEntity(entityUniqueId);
    if (!entity) throw new Error('Entity not found');

    action.respond({
      location: entity.location,
      dimensionId: entity.dimension.id,
    });
  });

  bridge.registerHandler<GetGameModeAction>(ActionId.GetGameMode, (action) => {
    const { playerUniqueId } = action.data;

    const entity = world.getEntity(playerUniqueId);
    if (!(entity instanceof Player)) throw new Error('Player not found');

    action.respond({
      gameMode: entity.getGameMode(),
    });
  });

  bridge.registerHandler<SetGameModeAction>(ActionId.SetGameMode, (action) => {
    const { playerUniqueId, gameMode } = action.data;

    const entity = world.getEntity(playerUniqueId);
    if (!(entity instanceof Player)) throw new Error('Player not found');

    entity.setGameMode(gameMode);
    action.respond();
  });
}