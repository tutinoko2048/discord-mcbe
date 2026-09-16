import * as v from 'valibot';
import {
  GenericResponseErrorReasonSchema,
  InvalidPayloadResponseErrorReasonSchema,
  RequestIdSchema,
} from './common';

export const RESPONSE_PACKET_TYPE = '__internal__:response' as const;

export const SuccessResponsePacket = v.strictObject({
  type: v.literal(RESPONSE_PACKET_TYPE),
  requestId: RequestIdSchema,
  ok: v.literal(true),
  data: v.unknown(),
});

export const GenericErrorResponsePacket = v.strictObject({
  code: GenericResponseErrorReasonSchema,
  message: v.string(),
});

export const InvalidPayloadErrorResponsePacket = v.strictObject({
  code: InvalidPayloadResponseErrorReasonSchema,
  message: v.string(),
  issues: v.array(v.unknown()),
});

export const ErrorResponsePacket = v.strictObject({
  type: v.literal(RESPONSE_PACKET_TYPE),
  requestId: RequestIdSchema,
  ok: v.literal(false),
  error: v.variant('code', [GenericErrorResponsePacket, InvalidPayloadErrorResponsePacket]),
});

export const ResponsePacket = v.variant('ok', [SuccessResponsePacket, ErrorResponsePacket]);
export type ResponsePacket = v.InferOutput<typeof ResponsePacket>;
