import * as v from 'valibot';
import { InternalAction } from '../enums/protocol';
import { requestPacket } from './common';

export const PingPacket = requestPacket(
  InternalAction.Ping,
  v.strictObject({ sentAt: v.number() }),
  v.strictObject({ receivedAt: v.number() }),
);
