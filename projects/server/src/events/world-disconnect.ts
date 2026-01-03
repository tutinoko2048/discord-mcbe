import { DisconnectReason } from '@script-bridge/protocol';
import { MinecraftEvent } from './minecraft';
import type { Application } from '../application';
import type { ScriptWorld } from '../minecraft';

export class WorldDisconnectEvent extends MinecraftEvent {
  public static readonly identifier = 'worldDisconnect';

  public readonly reason?: DisconnectReason;

  constructor(app: Application, world: ScriptWorld, reason?: DisconnectReason) {
    super(app, world);
    this.reason = reason;
  }
}
