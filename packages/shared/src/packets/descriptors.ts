import * as v from 'valibot';
import { PlatformType, ScoreboardIdentityType } from '../enums';
import { PfidSchema, UniqueIdSchema } from './common';

export const Vector3Schema = v.strictObject({
  x: v.number(),
  y: v.number(),
  z: v.number(),
});

export const DimensionDescriptorSchema = v.strictObject({
  id: v.string(),
  heightRange: v.strictObject({
    min: v.number(),
    max: v.number(),
  }),
});

export const PlayerDescriptorSchema = v.strictObject({
  name: v.string(),
  nameTag: v.string(),
  uniqueId: UniqueIdSchema,
  pfid: PfidSchema,
  platformType: v.enum(PlatformType),
});

export const ScoreboardObjectiveDescriptorSchema = v.strictObject({
  id: v.string(),
  displayName: v.optional(v.string()),
});

export const ScoreboardParticipantDescriptorSchema = v.union([
  v.strictObject({ uniqueId: UniqueIdSchema }),
  v.strictObject({ fakePlayer: v.string() }),
]);

export const ScoreboardIdentityDescriptorSchema = v.strictObject({
  type: v.enum(ScoreboardIdentityType),
  id: v.number(),
  displayName: v.string(),
  entityUniqueId: v.optional(UniqueIdSchema),
});

export const ScoreboardScoreInfoDescriptorSchema = v.strictObject({
  score: v.number(),
  participant: ScoreboardIdentityDescriptorSchema,
});
