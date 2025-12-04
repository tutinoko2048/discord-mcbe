import { DisconnectReason, PayloadType, ResponseErrorReason } from '@script-bridge/protocol';

/** script→socket */
export type ClientRequest<T = unknown> = {
  type: PayloadType.Request;
  channelId: string;
  data?: T;
  requestId: number;
  sessionId: string;
};

/** socket→script */
export type ServerResponse<T = unknown> =
  | {
      type: PayloadType.Response;
      error?: false;
      data: T;
      requestId: number;
      sessionId: string;
    }
  | {
      type: PayloadType.Response;
      error: true;
      errorReason: ResponseErrorReason;
      message: string;
      requestId: number;
      sessionId: string;
    };

/** socket→script */
export type ServerRequest<T = unknown> = {
  type: PayloadType.Request;
  channelId: string;
  data?: T;
  requestId: number;
  sessionId: string;
};

/** script→socket */
export type ClientResponse<T = unknown> =
  | {
      type: PayloadType.Response;
      error?: false;
      data: T;
      requestId: number;
      sessionId: string;
    }
  | {
      type: PayloadType.Response;
      error: true;
      errorReason: ResponseErrorReason;
      message: string;
      requestId: number;
      sessionId: string;
    };

export type ConnectionResponse =
  | {
      error: true;
      errorReason: DisconnectReason;
    }
  | {
      error?: false;
      protocolVersion: number;
      clientId: string;
    };

export type QueryResponse =
  | {
      error: true;
      errorReason: ResponseErrorReason;
    }
  | {
      error?: false;
      data: (ClientRequest | ClientResponse)[];
    };
