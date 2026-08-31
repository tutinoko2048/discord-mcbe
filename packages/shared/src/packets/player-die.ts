import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { notificationPacket, UniqueIdSchema } from './common';
import type { EntityDamageCause } from '@minecraft/server';

const PlayerDieDamagingEntitySchema = v.variant('isPlayer', [
  v.strictObject({
    isPlayer: v.literal(true),
    name: v.string(),
    nameTag: v.string(),
    typeId: v.string(),
    localizationKey: v.string(),
  }),
  v.strictObject({
    isPlayer: v.literal(false),
    nameTag: v.optional(v.string()),
    typeId: v.string(),
    localizationKey: v.string(),
  }),
]);

export type PlayerDieDamagingEntity = v.InferOutput<typeof PlayerDieDamagingEntitySchema>;

export const PlayerDiePacket = notificationPacket(
  ActionId.PlayerDie,
  v.strictObject({
    playerUniqueId: UniqueIdSchema,
    cause: v.custom<EntityDamageCause>((input) => typeof input === 'string'),
    damagingEntity: v.optional(PlayerDieDamagingEntitySchema),
  }),
);
