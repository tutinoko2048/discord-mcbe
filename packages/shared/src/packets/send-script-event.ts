import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { requestPacket } from './common';

export const SendScriptEventPacket = requestPacket(
  ActionId.SendScriptEvent,
  v.strictObject({ id: v.string(), message: v.string() }),
  v.null(),
);
