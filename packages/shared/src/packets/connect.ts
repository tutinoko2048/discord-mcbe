import * as v from 'valibot';
import { InternalAction } from '../enums/protocol';
import { requestPacket } from './common';

export const ConnectPacket = requestPacket(
  InternalAction.Connect,
  v.strictObject({
    clientId: v.string(),
    protocolVersion: v.number(),
  }),
  v.strictObject({ sessionId: v.string() }),
);
