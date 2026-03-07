import { world, Player, system, type ScoreboardObjective, ObjectiveSortOrder } from '@minecraft/server';
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
  type KickPlayerAction,
  type GetAllObjectivesAction,
  type GetScoreAction,
  type UpdateScoreAction,
  type RemoveParticipantAction,
  type GetObjectiveAction,
  type UpdateObjectiveAction,
  type SetObjectiveDisplayAction,
  type GetAllScoresAction,
} from '@discord-mcbe/shared';
import {
  createDimensionDescriptor,
  createScoreboardObjectiveDescriptor,
  createScoreboardScoreInfoDescriptor,
} from './descriptors';
import { getTPS } from './util';
import type { IBridgeClient } from '../transport';

export function registerHandlers(bridge: IBridgeClient) {
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
      dimension: createDimensionDescriptor(entity.dimension),
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

  bridge.registerHandler<GetScoreAction>(ActionId.GetScore, (action) => {
    const { objectiveId, participant } = action.data;

    const objective = world.scoreboard.getObjective(objectiveId);
    if (!objective) throw new Error(`Objective '${objectiveId}' not found`);

    const target = participant.uniqueId ? world.getEntity(participant.uniqueId) : participant.fakePlayer;
    if (!target) throw new Error(`Participant '${participant.uniqueId}' not found`);

    action.respond({
      value: target ? objective.getScore(target) ?? null : null,
    });
  });

  bridge.registerHandler<UpdateScoreAction>(ActionId.UpdateScore, (action) => {
    const { objectiveId, participant, type, score } = action.data;

    const objective = world.scoreboard.getObjective(objectiveId);
    if (!objective) throw new Error(`Objective '${objectiveId}' not found`);

    const target = participant.uniqueId ? world.getEntity(participant.uniqueId) : participant.fakePlayer;
    if (!target) throw new Error(`Participant '${participant.uniqueId}' not found`);

    let newScore: number = score;
    if (type === 'set') {
      objective.setScore(target, score);
    } else if (type === 'add') {
      newScore = objective.addScore(target, score);
    }

    action.respond({ value: newScore });
  });

  bridge.registerHandler<GetAllScoresAction>(ActionId.GetAllScores, (action) => {
    const { objectiveId } = action.data;

    const objective = world.scoreboard.getObjective(objectiveId);
    if (!objective) throw new Error(`Objective '${objectiveId}' not found`);

    const scores = objective.getScores().map(createScoreboardScoreInfoDescriptor);
    action.respond({ scores });
  });

  bridge.registerHandler<RemoveParticipantAction>(ActionId.RemoveParticipant, (action) => {
    const { objectiveId, participant } = action.data;

    const objective = world.scoreboard.getObjective(objectiveId);
    if (!objective) throw new Error(`Objective '${objectiveId}' not found`);

    const target = participant.uniqueId ? world.getEntity(participant.uniqueId) : participant.fakePlayer;
    if (!target) throw new Error(`Participant '${participant.uniqueId}' not found`);

    action.respond({ result: objective.removeParticipant(target) });
  });

  bridge.registerHandler<GetObjectiveAction>(ActionId.GetObjective, (action) => {
    const { objectiveId } = action.data;

    const objective = world.scoreboard.getObjective(objectiveId);

    action.respond({
      objective: objective ? createScoreboardObjectiveDescriptor(objective) : undefined,
    });
  });

  bridge.registerHandler<GetAllObjectivesAction>(ActionId.GetAllObjectives, (action) => {
    const objectives = world.scoreboard.getObjectives();
    const objectiveDescriptors = objectives.map(createScoreboardObjectiveDescriptor);
    action.respond({ objectives: objectiveDescriptors });
  });

  bridge.registerHandler<UpdateObjectiveAction>(ActionId.UpdateObjective, (action) => {
    const { type, objectiveId, displayName } = action.data;

    let objective: ScoreboardObjective | undefined;
    if (type === 'add') {
      objective = world.scoreboard.addObjective(objectiveId, displayName);
    } else if (type === 'remove') {
      world.scoreboard.removeObjective(objectiveId);
    }

    action.respond({
      objective: objective ? createScoreboardObjectiveDescriptor(objective) : undefined,
    });
  });

  bridge.registerHandler<SetObjectiveDisplayAction>(ActionId.SetObjectiveDisplay, (action) => {
    const { displaySlotId, objectiveId, sortOrder } = action.data;

    if (objectiveId) {
      const objective = world.scoreboard.getObjective(objectiveId);
      if (!objective) throw new Error(`Objective '${objectiveId}' not found`);

      world.scoreboard.setObjectiveAtDisplaySlot(displaySlotId, {
        objective,
        sortOrder: sortOrder ? ObjectiveSortOrder[sortOrder] : undefined,
      });
    } else {
      world.scoreboard.clearObjectiveAtDisplaySlot(displaySlotId);
    }

    action.respond();
  });

  if (__DEV__) console.log('§7[discord-mcbe] -- Successfully registered handlers.');
}
