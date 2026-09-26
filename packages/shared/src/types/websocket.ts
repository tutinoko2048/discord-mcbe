import type { DisconnectReason } from '../enums/protocol';

export type ConnectionResponse =
  | {
      error: true;
      errorReason: DisconnectReason;
    }
  | {
      error?: false;
      protocolVersion: number;
      worldName: string;
    };
