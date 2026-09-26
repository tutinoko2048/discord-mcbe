import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { requestPacket } from './common';

export const RunCommandPacket = requestPacket(
  ActionId.RunCommand,
  v.strictObject({ command: v.string() }),
  v.variant('error', [
    v.strictObject({ error: v.literal(true), message: v.string() }),
    v.strictObject({ error: v.literal(false), successCount: v.number() }),
  ]),
);
