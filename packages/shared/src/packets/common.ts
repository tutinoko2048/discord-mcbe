import * as v from 'valibot';
import { DisconnectReason, ResponseErrorReason } from '../enums/protocol';
import type { Pfid, UniqueId } from '../types';

export const RequestIdSchema = v.string();
export const UniqueIdSchema = v.custom<UniqueId>((input) => typeof input === 'string');
export const PfidSchema = v.custom<Pfid>((input) => typeof input === 'string');

export const DisconnectReasonSchema = v.picklist([
  DisconnectReason.Disconnect,
  DisconnectReason.OutdatedServer,
  DisconnectReason.OutdatedClient,
  DisconnectReason.ConnectionLost,
]);

export const ResponseErrorReasonSchema = v.picklist([
  ResponseErrorReason.Abort,
  ResponseErrorReason.Timeout,
  ResponseErrorReason.InvalidSession,
  ResponseErrorReason.InternalError,
  ResponseErrorReason.InvalidPayload,
]);

export function requestPacket<
  const TType extends string,
  const TReqData extends v.GenericSchema,
  const TResData extends v.GenericSchema,
>(type: TType, req: TReqData, res: TResData) {
  return {
    type,
    req: v.strictObject({
      type: v.literal(type),
      requestId: RequestIdSchema,
      data: req,
    }),
    res,
  } as const;
}

type AnyRequestPacketDefinition = ReturnType<typeof requestPacket<string, v.GenericSchema, v.GenericSchema>>;

type RequestSchemas<TDefinitions extends readonly AnyRequestPacketDefinition[]> = {
  [Index in keyof TDefinitions]: TDefinitions[Index]['req'];
};

export function requestSchemas<const TDefinitions extends readonly AnyRequestPacketDefinition[]>(
  definitions: TDefinitions,
): RequestSchemas<TDefinitions> {
  return definitions.map((definition) => definition.req) as RequestSchemas<TDefinitions>;
}

export function notificationPacket<const TType extends string, const TData extends v.GenericSchema>(
  type: TType,
  data: TData,
) {
  return v.strictObject({
    type: v.literal(type),
    data,
  });
}
