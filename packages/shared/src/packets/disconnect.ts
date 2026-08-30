import * as v from 'valibot';
import { InternalAction } from '../enums/protocol';
import { DisconnectReasonSchema, requestPacket } from './common';

export const DisconnectPacket = requestPacket(
  InternalAction.Disconnect,
  v.strictObject({ reason: DisconnectReasonSchema }),
  v.null(),
);
