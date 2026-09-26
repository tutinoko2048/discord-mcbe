import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { requestPacket } from './common';

export const GetTpsPacket = requestPacket(ActionId.GetTPS, v.null(), v.strictObject({ tps: v.number() }));
