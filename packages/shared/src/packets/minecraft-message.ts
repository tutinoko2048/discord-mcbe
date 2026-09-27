import type { RawMessage } from '@minecraft/server';
import * as v from 'valibot';

export const RawMessageSchema: v.GenericSchema<RawMessage> = v.lazy(() =>
  v.strictObject({
    rawtext: v.optional(v.array(RawMessageSchema)),
    score: v.optional(
      v.strictObject({
        name: v.optional(v.string()),
        objective: v.optional(v.string()),
      }),
    ),
    text: v.optional(v.string()),
    translate: v.optional(v.string()),
    with: v.optional(v.union([v.array(v.string()), RawMessageSchema])),
  }),
);

export const MinecraftMessageSchema = v.union([
  v.string(),
  RawMessageSchema,
  v.array(v.union([v.string(), RawMessageSchema])),
]);
