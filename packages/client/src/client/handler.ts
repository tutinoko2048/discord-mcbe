import { ObjectiveSortOrder, Player, system, world, type ScoreboardObjective } from '@minecraft/server';
import {
  ActionId,
  type ResponseData,
  type ClientBoundApplicationRequestPacket,
  type ClientBoundRequestResponse,
} from '@discord-mcbe/shared';
import {
  createDimensionDescriptor,
  createScoreboardObjectiveDescriptor,
  createScoreboardScoreInfoDescriptor,
} from './descriptors';
import { getTPS } from './util';

type ClientBoundApplicationRequestType = ClientBoundApplicationRequestPacket['type'];
type HandlerResponse<T extends ClientBoundApplicationRequestType> = ClientBoundRequestResponse<T>;

function res<T extends ClientBoundApplicationRequestType>(
  request: Extract<ClientBoundApplicationRequestPacket, { type: T }>,
  responseValue: NoInfer<ResponseData<T>>,
): HandlerResponse<T> {
  return { type: request.type, data: responseValue };
}

function assertNever(value: never): never {
  throw new Error(`Unsupported server request: ${String(value)}`);
}

export async function handleClientBoundRequest(
  request: ClientBoundApplicationRequestPacket,
): Promise<ClientBoundRequestResponse<ClientBoundApplicationRequestType>> {
  switch (request.type) {
    case ActionId.SendMessage: {
      const { data } = request;
      if (data.playerUniqueId) {
        const player = world.getEntity(data.playerUniqueId);
        if (!(player instanceof Player)) throw new Error('Player not found');
        player.sendMessage(data.message);
      } else {
        world.sendMessage(data.message);
      }
      return res(request, null);
    }

    case ActionId.RunCommand: {
      const { data } = request;
      const overworld = world.getDimension('overworld');
      try {
        const { successCount } = overworld.runCommand(data.command);
        return res(request, { error: false, successCount });
      } catch (error) {
        return res(request, { error: true, message: String(error) });
      }
    }

    case ActionId.SendScriptEvent: {
      const { data } = request;
      system.sendScriptEvent(data.id, data.message);
      return res(request, null);
    }

    case ActionId.GetTPS:
      return res(request, { tps: getTPS() });

    case ActionId.GetEntityLocation: {
      const { data } = request;
      const entity = world.getEntity(data.entityUniqueId);
      if (!entity) throw new Error('Entity not found');
      return res(request, { location: entity.location });
    }

    case ActionId.GetEntityDimension: {
      const { data } = request;
      const entity = world.getEntity(data.entityUniqueId);
      if (!entity) throw new Error('Entity not found');
      return res(request, { dimension: createDimensionDescriptor(entity.dimension) });
    }

    case ActionId.GetGameMode: {
      const { data } = request;
      const player = world.getEntity(data.playerUniqueId);
      if (!(player instanceof Player)) throw new Error('Player not found');
      return res(request, { gameMode: player.getGameMode() });
    }

    case ActionId.SetGameMode: {
      const { data } = request;
      const player = world.getEntity(data.playerUniqueId);
      if (!(player instanceof Player)) throw new Error('Player not found');
      player.setGameMode(data.gameMode);
      return res(request, null);
    }

    case ActionId.SetTitle: {
      const { data } = request;
      const player = world.getEntity(data.playerUniqueId);
      if (!(player instanceof Player)) throw new Error('Player not found');
      player.onScreenDisplay.setTitle(data.title, data.options);
      return res(request, null);
    }

    case ActionId.UpdateSubtitle: {
      const { data } = request;
      const player = world.getEntity(data.playerUniqueId);
      if (!(player instanceof Player)) throw new Error('Player not found');
      player.onScreenDisplay.updateSubtitle(data.subtitle);
      return res(request, null);
    }

    case ActionId.SetActionBar: {
      const { data } = request;
      const player = world.getEntity(data.playerUniqueId);
      if (!(player instanceof Player)) throw new Error('Player not found');
      player.onScreenDisplay.setActionBar(data.text);
      return res(request, null);
    }

    case ActionId.KickPlayer: {
      const { data } = request;
      const player = world.getEntity(data.playerUniqueId);
      if (!(player instanceof Player)) throw new Error('Player not found');
      player.runCommand(`kick @s ${data.reason ?? ''}`);
      return res(request, null);
    }

    case ActionId.GetScore: {
      const { data } = request;
      const objective = world.scoreboard.getObjective(data.objectiveId);
      if (!objective) throw new Error(`Objective '${data.objectiveId}' not found`);
      const target =
        'uniqueId' in data.participant
          ? world.getEntity(data.participant.uniqueId)
          : data.participant.fakePlayer;
      if (!target) throw new Error('Participant not found');
      return res(request, { value: objective.getScore(target) ?? null });
    }

    case ActionId.UpdateScore: {
      const { data } = request;
      const objective = world.scoreboard.getObjective(data.objectiveId);
      if (!objective) throw new Error(`Objective '${data.objectiveId}' not found`);
      const target =
        'uniqueId' in data.participant
          ? world.getEntity(data.participant.uniqueId)
          : data.participant.fakePlayer;
      if (!target) throw new Error('Participant not found');
      const value =
        data.type === 'set'
          ? (objective.setScore(target, data.score), data.score)
          : objective.addScore(target, data.score);
      return res(request, { value });
    }

    case ActionId.GetAllScores: {
      const { data } = request;
      const objective = world.scoreboard.getObjective(data.objectiveId);
      if (!objective) throw new Error(`Objective '${data.objectiveId}' not found`);
      return res(request, { scores: objective.getScores().map(createScoreboardScoreInfoDescriptor) });
    }

    case ActionId.RemoveParticipant: {
      const { data } = request;
      const objective = world.scoreboard.getObjective(data.objectiveId);
      if (!objective) throw new Error(`Objective '${data.objectiveId}' not found`);
      const target =
        'uniqueId' in data.participant
          ? world.getEntity(data.participant.uniqueId)
          : data.participant.fakePlayer;
      if (!target) throw new Error('Participant not found');
      return res(request, { result: objective.removeParticipant(target) });
    }

    case ActionId.GetObjective: {
      const { data } = request;
      const objective = world.scoreboard.getObjective(data.objectiveId);
      return res(request, {
        objective: objective ? createScoreboardObjectiveDescriptor(objective) : undefined,
      });
    }

    case ActionId.GetAllObjectives:
      return res(request, {
        objectives: world.scoreboard.getObjectives().map(createScoreboardObjectiveDescriptor),
      });

    case ActionId.UpdateObjective: {
      const { data } = request;
      let objective: ScoreboardObjective | undefined;
      if (data.type === 'add') {
        objective = world.scoreboard.addObjective(data.objectiveId, data.displayName);
      } else {
        world.scoreboard.removeObjective(data.objectiveId);
      }
      return res(request, {
        objective: objective ? createScoreboardObjectiveDescriptor(objective) : undefined,
      });
    }

    case ActionId.SetObjectiveDisplay: {
      const { data } = request;
      if (data.objectiveId) {
        const objective = world.scoreboard.getObjective(data.objectiveId);
        if (!objective) throw new Error(`Objective '${data.objectiveId}' not found`);
        world.scoreboard.setObjectiveAtDisplaySlot(data.displaySlotId, {
          objective,
          sortOrder: data.sortOrder
            ? ObjectiveSortOrder[data.sortOrder as keyof typeof ObjectiveSortOrder]
            : undefined,
        });
      } else {
        world.scoreboard.clearObjectiveAtDisplaySlot(data.displaySlotId);
      }
      return res(request, null);
    }

    default:
      return assertNever(request);
  }
}
