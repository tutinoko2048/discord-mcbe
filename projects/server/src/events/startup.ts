import { ServerOptions } from 'socket-be';
import { Application } from '../main';

export class StartupEvent {
  constructor(
    public readonly app: Application,
  ) {}

  get formatter(): ServerOptions['formatter'] {
    return this.app.minecraft.socket.options.formatter;
  }
}