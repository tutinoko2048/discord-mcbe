import * as v from 'valibot';
import { ChatSendPacket } from './chat-send';
import { requestSchemas } from './common';
import { ConnectPacket } from './connect';
import { DisconnectPacket } from './disconnect';
import { GetEntityDimensionPacket } from './get-entity-dimension';
import { GetEntityLocationPacket } from './get-entity-location';
import { GetGameModePacket } from './get-game-mode';
import { GetTpsPacket } from './get-tps';
import { KickPlayerPacket } from './kick-player';
import { PingPacket } from './ping';
import { PlayerDiePacket } from './player-die';
import { PlayerJoinPacket } from './player-join';
import { PlayerLeavePacket } from './player-leave';
import { ResponsePacket } from './response';
import { RunCommandPacket } from './run-command';
import {
  GetAllObjectivesPacket,
  GetAllScoresPacket,
  GetObjectivePacket,
  GetScorePacket,
  RemoveParticipantPacket,
  SetObjectiveDisplayPacket,
  UpdateObjectivePacket,
  UpdateScorePacket,
} from './scoreboard';
import { SendMessagePacket } from './send-message';
import { SendScriptEventPacket } from './send-script-event';
import { SetActionBarPacket } from './set-action-bar';
import { SetGameModePacket } from './set-game-mode';
import { SetTitlePacket } from './set-title';
import { UpdateSubtitlePacket } from './update-subtitle';
import { WorldInitializePacket } from './world-initialize';

export const ServerBoundNotificationPacket = v.variant('type', [
  PlayerJoinPacket,
  PlayerLeavePacket,
  PlayerDiePacket,
  ChatSendPacket,
]);

export const ServerBoundInternalPackets = [ConnectPacket, DisconnectPacket] as const;
export const ServerBoundInternalPacket = v.variant('type', requestSchemas(ServerBoundInternalPackets));

export const ServerBoundRequestPackets = [WorldInitializePacket] as const;
export const ServerBoundApplicationRequestPacket = v.variant(
  'type',
  requestSchemas(ServerBoundRequestPackets),
);
export const ServerBoundRequestPacket = v.variant('type', [
  ServerBoundInternalPacket,
  ServerBoundApplicationRequestPacket,
]);

// パケット追加手順: Packetを定義 → 方向別に配列へ追加 → handlerのswitchへcase追加

/** Transport-internal packets accepted from the server side of the bridge. */
export const InternalPackets = [DisconnectPacket, PingPacket] as const;
export const InternalPacket = v.variant('type', requestSchemas(InternalPackets));

export const ClientBoundRequestPackets = [
  SendMessagePacket,
  RunCommandPacket,
  SendScriptEventPacket,
  GetTpsPacket,
  GetEntityLocationPacket,
  GetEntityDimensionPacket,
  GetGameModePacket,
  SetGameModePacket,
  SetTitlePacket,
  UpdateSubtitlePacket,
  SetActionBarPacket,
  KickPlayerPacket,
  GetScorePacket,
  UpdateScorePacket,
  GetAllScoresPacket,
  RemoveParticipantPacket,
  GetObjectivePacket,
  GetAllObjectivesPacket,
  UpdateObjectivePacket,
  SetObjectiveDisplayPacket,
] as const;

export const ClientBoundApplicationRequestPacket = v.variant(
  'type',
  requestSchemas(ClientBoundRequestPackets),
);
export const ClientBoundRequestPacket = v.variant('type', [
  InternalPacket,
  ClientBoundApplicationRequestPacket,
]);

export const RequestPackets = [
  ...ServerBoundInternalPackets,
  ...ServerBoundRequestPackets,
  ...InternalPackets,
  ...ClientBoundRequestPackets,
] as const;

export const ServerBoundPacket = v.variant('type', [
  ServerBoundNotificationPacket,
  ServerBoundInternalPacket,
  ServerBoundApplicationRequestPacket,
  ResponsePacket,
]);

export const ClientBoundPacket = v.variant('type', [
  InternalPacket,
  ClientBoundApplicationRequestPacket,
  ResponsePacket,
]);

export type ServerBoundNotificationPacket = v.InferOutput<typeof ServerBoundNotificationPacket>;
export type ServerBoundInternalPacket = v.InferOutput<typeof ServerBoundInternalPacket>;
export type ServerBoundApplicationRequestPacket = v.InferOutput<typeof ServerBoundApplicationRequestPacket>;
export type ServerBoundRequestPacket = v.InferOutput<typeof ServerBoundRequestPacket>;
export type ServerBoundRequestInput = ServerBoundRequestPacket extends infer Packet
  ? Packet extends ServerBoundRequestPacket
    ? Omit<Packet, 'requestId'>
    : never
  : never;
export type ClientBoundRequestPacket = v.InferOutput<typeof ClientBoundRequestPacket>;
export type InternalPacket = v.InferOutput<typeof InternalPacket>;
export type ClientBoundApplicationRequestPacket = v.InferOutput<typeof ClientBoundApplicationRequestPacket>;
export type ClientBoundRequestType = ClientBoundRequestPacket['type'];
export type ClientBoundRequestData<T extends ClientBoundRequestType> = Extract<
  ClientBoundRequestPacket,
  { type: T }
>['data'];
export type ServerBoundPacket = v.InferOutput<typeof ServerBoundPacket>;
export type ClientBoundPacket = v.InferOutput<typeof ClientBoundPacket>;

export type RequestPacket = ServerBoundRequestPacket | ClientBoundRequestPacket;
export type RequestPacketType = RequestPacket['type'];
export type RequestData<T extends RequestPacketType> = Extract<RequestPacket, { type: T }>['data'];

export function safeParseServerBoundPacket(input: unknown) {
  return v.safeParse(ServerBoundPacket, input);
}

export function safeParseClientBoundPacket(input: unknown) {
  return v.safeParse(ClientBoundPacket, input);
}
