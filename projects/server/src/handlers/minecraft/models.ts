import { Player as SocketPlayer, World as SocketWorld } from 'socket-be';
import { ScriptPlayer, ScriptWorld } from '../../bridge';

export type IPlayer = 
  | ({ isSocket: true } & SocketPlayer)
  | ({ isSocket: false } & ScriptPlayer);

export function createPlayer(player: SocketPlayer | ScriptPlayer): IPlayer {
  if (player instanceof SocketPlayer) {
    defineFlag(player, 'isSocket', true);
  } else {
    defineFlag(player, 'isSocket', false);
  }
  return player as IPlayer;
}

export type IWorld =
  | ({ isSocket: true } & SocketWorld)
  | ({ isSocket: false } & ScriptWorld);

export function createWorld(world: SocketWorld | ScriptWorld): IWorld {
  if (world instanceof SocketWorld) {
    defineFlag(world, 'isSocket', true);
  } else {
    defineFlag(world, 'isSocket', false);
  }
  return world as IWorld;
}

export function defineFlag(obj: unknown, key: string, value: boolean) {
  Object.defineProperty(obj, key, {
    value,
    configurable: false,
    writable: false,
  });
}
