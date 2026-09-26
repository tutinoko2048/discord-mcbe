import type {
  ServerBoundApplicationRequestPacket,
  ServerBoundNotificationPacket,
} from '@discord-mcbe/shared';
import type { ISession } from './interfaces';

export type ServerBoundPacket = ServerBoundApplicationRequestPacket | ServerBoundNotificationPacket;
export type ServerBoundPacketHandler = (session: ISession, packet: ServerBoundPacket) => unknown;
