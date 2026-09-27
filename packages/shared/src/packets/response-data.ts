import * as v from 'valibot';
import { RequestPackets, type ClientBoundRequestType } from './schemas';

type RequestPacketDefinition = (typeof RequestPackets)[number];

export type ResponseDataType = RequestPacketDefinition['type'];
type RequestPacketDefinitionFor<T extends ResponseDataType> = Extract<RequestPacketDefinition, { type: T }>;
type ResponseDataSchema<T extends ResponseDataType> = RequestPacketDefinitionFor<T>['res'];

export type ResponseData<T extends ResponseDataType> = v.InferOutput<ResponseDataSchema<T>>;
export type ClientBoundResponseData<T extends ClientBoundRequestType> = ResponseData<T>;

/** Internal typed response envelope used by client-side request handlers. */
export type ClientBoundRequestResponse<T extends ClientBoundRequestType = ClientBoundRequestType> = {
  [Type in T]: { type: Type; data: ResponseData<Type> };
}[T];

export function safeParseResponseData<T extends ResponseDataType>(
  type: T,
  input: unknown,
): v.SafeParseResult<ResponseDataSchema<T>> {
  const definition = RequestPackets.find((packet) => packet.type === type);
  if (!definition) throw new Error(`Unknown request packet type: ${type}`);
  return v.safeParse(definition.res, input) as v.SafeParseResult<ResponseDataSchema<T>>;
}
