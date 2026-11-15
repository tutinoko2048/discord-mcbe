import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { requestPacket } from './common';
import { PlayerDescriptorSchema } from './descriptors';

/** Server settings the client needs to know. Sent once per connection. */
export const ServerSettingsSchema = v.strictObject({
  allowAddonMessages: v.boolean(),
});
export type ServerSettings = v.InferOutput<typeof ServerSettingsSchema>;

export const WorldInitializePacket = requestPacket(
  ActionId.WorldInitialize,
  v.strictObject({ players: v.array(PlayerDescriptorSchema) }),
  v.strictObject({ settings: ServerSettingsSchema }),
);
