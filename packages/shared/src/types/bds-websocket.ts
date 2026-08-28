import { PayloadType, type ResponseErrorReason } from '../protocol';

/** A request sent in either direction over the BDS WebSocket transport. */
export type BdsWebSocketRequest<T = unknown> = {
  type: PayloadType.Request;
  channelId: string;
  requestId: string;
  data?: T;
};

/** A response sent in either direction over the BDS WebSocket transport. */
export type BdsWebSocketResponse<T = unknown> =
  | {
      type: PayloadType.Response;
      error?: false;
      data: T;
      requestId: string;
    }
  | {
      type: PayloadType.Response;
      error: true;
      errorReason: ResponseErrorReason;
      message: string;
      requestId: string;
    };

export type BdsWebSocketPayload = BdsWebSocketRequest | BdsWebSocketResponse;

export function isBdsWebSocketPayload(value: unknown): value is BdsWebSocketPayload {
  if (typeof value !== 'object' || value === null) return false;

  const payload = value as Record<string, unknown>;
  if (typeof payload.requestId !== 'string') return false;

  if (payload.type === PayloadType.Request) return typeof payload.channelId === 'string';
  if (payload.type !== PayloadType.Response) return false;

  return (
    payload.error !== true || (typeof payload.errorReason === 'number' && typeof payload.message === 'string')
  );
}

export namespace BdsWebSocketBridge {
  export const PROTOCOL_VERSION = 1;
}
