import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { requestPacket, UniqueIdSchema } from './common';
import { MinecraftMessageSchema } from './minecraft-message';

export const TitleDisplayOptionsSchema = v.strictObject({
  fadeInDuration: v.number(),
  fadeOutDuration: v.number(),
  stayDuration: v.number(),
  subtitle: v.optional(MinecraftMessageSchema),
});

export type TitleDisplayOptions = v.InferOutput<typeof TitleDisplayOptionsSchema>;

export const SetTitlePacket = requestPacket(
  ActionId.SetTitle,
  v.strictObject({
    playerUniqueId: UniqueIdSchema,
    title: MinecraftMessageSchema,
    options: v.optional(TitleDisplayOptionsSchema),
  }),
  v.null(),
);
