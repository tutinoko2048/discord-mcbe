import type {
  ServerBoundNotificationPacket,
  ServerBoundRequestInput,
  DisconnectReason,
  RequestResult,
  ClientBoundRequestResponse,
  ClientBoundApplicationRequestPacket,
} from '@discord-mcbe/shared';

type Listener<T> = (data: T) => void;
type ClientBoundApplicationRequestType = ClientBoundApplicationRequestPacket['type'];
type ClientBoundApplicationRequestResponse = ClientBoundRequestResponse<ClientBoundApplicationRequestType>;

/** Requests handled by the application; transport-internal packets are intercepted first. */
export type ClientBoundRequestHandler = (
  request: ClientBoundApplicationRequestPacket,
) => ClientBoundApplicationRequestResponse | PromiseLike<ClientBoundApplicationRequestResponse>;

export interface IBridgeClient {
  isConnected: boolean;

  request(packet: ServerBoundRequestInput): Promise<RequestResult<unknown>>;

  notify(packet: ServerBoundNotificationPacket): void;

  disconnect(reason?: DisconnectReason): Promise<void>;

  on(event: 'connect', listener: Listener<{ sessionId: string }>): void;
  on(event: 'disconnect', listener: Listener<{ reason: DisconnectReason }>): void;
}
