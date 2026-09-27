import * as v from 'valibot';
import { ActionId } from '../../enums/action-id';
import { requestPacket } from '../common';
import { ScoreboardParticipantDescriptorSchema } from '../descriptors';

export const RemoveParticipantPacket = requestPacket(
  ActionId.RemoveParticipant,
  v.strictObject({
    objectiveId: v.string(),
    participant: ScoreboardParticipantDescriptorSchema,
  }),
  v.strictObject({ result: v.boolean() }),
);
