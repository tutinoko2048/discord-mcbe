import { DisconnectReason } from '@script-bridge/protocol';
import { ApplicationEvent } from './app';
import type { Application } from '../application';
import type { ScriptWorld } from '../minecraft';

export class WorldDisconnectEvent extends ApplicationEvent {
  public static readonly identifier = 'worldDisconnect';

  public readonly world: ScriptWorld;

  public readonly reason?: DisconnectReason;

  constructor(app: Application, world: ScriptWorld, reason?: DisconnectReason) {
    super(app);
    this.world = world;
    this.reason = reason;
  }
}
