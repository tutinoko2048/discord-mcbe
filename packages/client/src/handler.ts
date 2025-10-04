import { world, Player, system } from '@minecraft/server';
import type { ScriptBridgeClient } from '@script-bridge/client';
import {
  ActionId,
  type SendMessageAction,
  type GetEntityLocationAction,
  type GetEntityDimensionAction,
  type GetGameModeAction,
  type SetGameModeAction,
  type SetTitleAction,
  type UpdateSubtitleAction,
  type SetActionBarAction,
  type RunCommandAction,
  type SendScriptEventAction,
  type GetTPSAction,
  KickPlayerAction,
} from '@discord-mcbe/shared';
import { getTPS } from './util';

export function registerHandlers(bridge: ScriptBridgeClient) {
  bridge.registerHandler<SendMessageAction>(ActionId.SendMessage, (action) => {
    const { message, playerUniqueId } = action.data;

    if (playerUniqueId) {
      const player = world.getEntity(playerUniqueId);
      if (!(player instanceof Player)) throw new Error('Player not found');
      player.sendMessage(message);
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

  bridge.registerHandler<SendScriptEventAction>(ActionId.SendScriptEvent, (action) => {
    const { id, message } = action.data;

    system.sendScriptEvent(id, message);
    action.respond();
  });

  bridge.registerHandler<GetTPSAction>(ActionId.GetTPS, (action) => {
    const tps = getTPS();
    action.respond({ tps });
  });

  bridge.registerHandler<GetEntityLocationAction>(ActionId.GetEntityLocation, (action) => {
    const { entityUniqueId } = action.data;

    const entity = world.getEntity(entityUniqueId);
    if (!entity) throw new Error('Entity not found');

    action.respond({
      location: entity.location,
    });
  });

  bridge.registerHandler<GetEntityDimensionAction>(ActionId.GetEntityDimension, (action) => {
    const { entityUniqueId } = action.data;

    const entity = world.getEntity(entityUniqueId);
    if (!entity) throw new Error('Entity not found');

    action.respond({
      dimension: {
        id: entity.dimension.id,
        heightRange: entity.dimension.heightRange,
      },
    });
  });

  bridge.registerHandler<GetGameModeAction>(ActionId.GetGameMode, (action) => {
    const { playerUniqueId } = action.data;

    const player = world.getEntity(playerUniqueId);
    if (!(player instanceof Player)) throw new Error('Player not found');

    action.respond({
      gameMode: player.getGameMode(),
    });
  });

  bridge.registerHandler<SetGameModeAction>(ActionId.SetGameMode, (action) => {
    const { playerUniqueId, gameMode } = action.data;

    const player = world.getEntity(playerUniqueId);
    if (!(player instanceof Player)) throw new Error('Player not found');

    player.setGameMode(gameMode);
    action.respond();
  });

  bridge.registerHandler<SetTitleAction>(ActionId.SetTitle, (action) => {
    const { playerUniqueId, title, options } = action.data;

    const player = world.getEntity(playerUniqueId);
    if (!(player instanceof Player)) throw new Error('Player not found');

    player.onScreenDisplay.setTitle(title, options);
    action.respond();
  });

  bridge.registerHandler<UpdateSubtitleAction>(ActionId.UpdateSubtitle, (action) => {
    const { playerUniqueId, subtitle } = action.data;

    const player = world.getEntity(playerUniqueId);
    if (!(player instanceof Player)) throw new Error('Player not found');

    player.onScreenDisplay.updateSubtitle(subtitle);
    action.respond();
  });

  bridge.registerHandler<SetActionBarAction>(ActionId.SetActionBar, (action) => {
    const { playerUniqueId, text } = action.data;

    const player = world.getEntity(playerUniqueId);
    if (!(player instanceof Player)) throw new Error('Player not found');

    player.onScreenDisplay.setActionBar(text);
    action.respond();
  });

  bridge.registerHandler<KickPlayerAction>(ActionId.KickPlayer, (action) => {
    const { playerUniqueId, reason } = action.data;

    const player = world.getEntity(playerUniqueId);
    if (!(player instanceof Player)) throw new Error('Player not found');

    player.runCommand(`kick @s ${reason ? reason : ''}`);
    action.respond();
  });
}
