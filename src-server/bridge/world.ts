import { Session } from '@script-bridge/server';
import { BridgeServer } from './server';

import type { RawMessage } from '@minecraft/server';
import { ScriptPlayer } from './player';

export class ScriptWorld {
  private readonly bridge: BridgeServer;
  public readonly session: Session;
  
  constructor(bridge: BridgeServer, session: Session) {
    this.bridge = bridge;
    this.session = session;
  }

  async getPlayers(): Promise<ScriptPlayer[]> {}

  async runCommand(command: string): Promise<void> {}

  async sendMessage(message: string | RawMessage | (string | RawMessage)[]): Promise<void> {}

  private onPlayerJoin() {}

  private onPlayerLeave() {}

  private onChatSend() {}
}