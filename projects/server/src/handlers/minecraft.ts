import { Server as SocketBEServer } from 'socket-be';
import { BridgeServer } from '../bridge';
import { App } from '../main';

export class MinecraftHandler {
  public readonly socket: SocketBEServer;

  public readonly bridge: BridgeServer;

  constructor(private readonly app: App) {
    this.socket = new SocketBEServer();
    this.bridge = new BridgeServer(app);
  }
}