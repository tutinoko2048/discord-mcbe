import {
  ActionId,
  type DisplaySlotId,
  type GetAllObjectivesAction,
  type GetObjectiveAction,
  type GetScoreAction,
  type ObjectiveSortOrder,
  type UpdateObjectiveAction,
  type UpdateScoreAction,
  type ScoreboardParticipantDescriptor,
  type RemoveParticipantAction,
  type SetObjectiveDisplayAction,
  type GetAllScoresAction,
} from '@discord-mcbe/shared';
import { ScriptScoreboardObjective } from './objective';
import { ScriptScoreboardScoreInfo } from './score-info';
import { BridgeActionError } from '../errors';
import type { ISession } from '../../transport';
import type { ScriptPlayer } from '../player';

export class ScriptScoreboard {
  private readonly session: ISession;

  private readonly objectives = new Map<string, ScriptScoreboardObjective>();

  constructor(session: ISession) {
    this.session = session;
  }

  /**
   * Returns all defined objectives.
   */
  async getObjectives(): Promise<ScriptScoreboardObjective[]> {
    const res = await this.session.send<GetAllObjectivesAction>(ActionId.GetAllObjectives);
    if (res.error) throw new BridgeActionError(res);

    const objectives: ScriptScoreboardObjective[] = [];
    for (const descriptor of res.data.objectives) {
      let objective = this.objectives.get(descriptor.id);
      if (!objective) {
        objective = new ScriptScoreboardObjective(this, descriptor);
        this.objectives.set(descriptor.id, objective);
      }
      objectives.push(objective);
    }
    return objectives;
  }

  /**
   * Returns a specific objective (by id).
   */
  async getObjective(objectiveId: string): Promise<ScriptScoreboardObjective | undefined> {
    const res = await this.session.send<GetObjectiveAction>(ActionId.GetObjective, { objectiveId });
    if (res.error) throw new BridgeActionError(res);

    if (!res.data.objective) return undefined;

    if (!this.objectives.has(objectiveId)) {
      const objective = new ScriptScoreboardObjective(this, res.data.objective);
      this.objectives.set(objectiveId, objective);
    }
    return this.objectives.get(objectiveId);
  }

  /**
   * Adds a new objective to the scoreboard.
   */
  async addObjective(objectiveId: string, displayName?: string): Promise<ScriptScoreboardObjective> {
    const res = await this.session.send<UpdateObjectiveAction>(ActionId.UpdateObjective, {
      type: 'add',
      objectiveId,
      displayName,
    });
    if (res.error) throw new BridgeActionError(res);

    if (!res.data.objective) throw new Error('Objective should be returned');

    const objective = new ScriptScoreboardObjective(this, res.data.objective);
    this.objectives.set(objectiveId, objective);
    return objective;
  }

  /**
   * Removes an objective from the scoreboard.
   */
  async removeObjective(objective: ScriptScoreboardObjective | string): Promise<void> {
    const objectiveId = this.createObjectiveId(objective);
    const res = await this.session.send<UpdateObjectiveAction>(ActionId.UpdateObjective, {
      type: 'remove',
      objectiveId,
    });
    if (res.error) throw new BridgeActionError(res);

    this.objectives.delete(objectiveId);
  }
  /**
   * Returns a score given a player and objective.
   */
  async getScore(
    target: ScriptPlayer | string,
    objective: ScriptScoreboardObjective | string,
  ): Promise<number | null> {
    const res = await this.session.send<GetScoreAction>(ActionId.GetScore, {
      objectiveId: this.createObjectiveId(objective),
      participant: this.createParticipant(target),
    });
    if (res.error) throw new BridgeActionError(res);

    return res.data.value;
  }

  async getScores(objective: ScriptScoreboardObjective | string): Promise<ScriptScoreboardScoreInfo[]> {
    const res = await this.session.send<GetAllScoresAction>(ActionId.GetAllScores, {
      objectiveId: this.createObjectiveId(objective),
    });
    if (res.error) throw new BridgeActionError(res);

    return res.data.scores.map((info) => new ScriptScoreboardScoreInfo(info));
  }

  /**
   * Sets the score given a player and objective.
   * @returns New value of the score.
   */
  async setScore(
    target: ScriptPlayer | string,
    objective: ScriptScoreboardObjective | string,
    score: number,
  ): Promise<number> {
    const res = await this.session.send<UpdateScoreAction>(ActionId.UpdateScore, {
      type: 'set',
      objectiveId: this.createObjectiveId(objective),
      participant: this.createParticipant(target),
      score,
    });
    if (res.error) throw new BridgeActionError(res);

    return res.data.value;
  }
  /**
   * Adds the score given a player and objective.
   * @returns New value of the score.
   */
  async addScore(
    target: ScriptPlayer | string,
    objective: ScriptScoreboardObjective | string,
    score: number,
  ): Promise<number> {
    const res = await this.session.send<UpdateScoreAction>(ActionId.UpdateScore, {
      type: 'add',
      objectiveId: this.createObjectiveId(objective),
      participant: this.createParticipant(target),
      score,
    });
    if (res.error) throw new BridgeActionError(res);

    return res.data.value;
  }
  /**
   * Removes the score given a player and objective.
   * @returns New value of the score.
   */
  async removeScore(
    target: ScriptPlayer | string,
    objective: ScriptScoreboardObjective | string,
    score: number,
  ): Promise<number> {
    const res = await this.session.send<UpdateScoreAction>(ActionId.UpdateScore, {
      type: 'add',
      objectiveId: this.createObjectiveId(objective),
      participant: this.createParticipant(target),
      score: -score,
    });
    if (res.error) throw new BridgeActionError(res);

    return res.data.value;
  }

  /**
   * Removes a player from an objective.
   */
  async removeParticipant(
    target: ScriptPlayer | string,
    objective: ScriptScoreboardObjective | string,
  ): Promise<void> {
    const res = await this.session.send<RemoveParticipantAction>(ActionId.RemoveParticipant, {
      objectiveId: this.createObjectiveId(objective),
      participant: this.createParticipant(target),
    });
    if (res.error) throw new BridgeActionError(res);
  }

  /**
   * Sets an objective into a display slot with specified additional display settings.
   */
  async setDisplay(
    displaySlotId: DisplaySlotId,
    objective?: ScriptScoreboardObjective | string,
    sortOrder?: ObjectiveSortOrder,
  ): Promise<void> {
    const res = await this.session.send<SetObjectiveDisplayAction>(ActionId.SetObjectiveDisplay, {
      displaySlotId,
      objectiveId: objective ? this.createObjectiveId(objective) : undefined,
      sortOrder,
    });
    if (res.error) throw new BridgeActionError(res);
  }

  private createObjectiveId(id: ScriptScoreboardObjective | string): string {
    return typeof id === 'string' ? id : id.id;
  }

  private createParticipant(player: ScriptPlayer | string): ScoreboardParticipantDescriptor {
    return typeof player === 'string' ? { fakePlayer: player } : { uniqueId: player.uniqueId };
  }
}
