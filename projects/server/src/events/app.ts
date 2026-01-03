import type { Application } from '../application';
import type { ApplicationEvents } from '../types';

export abstract class ApplicationEvent {
  public static readonly identifier: keyof ApplicationEvents;
  public readonly identifier = (this.constructor as typeof ApplicationEvent).identifier;

  constructor(public readonly app: Application) {}

  public emit(): boolean {
    return this.app.emit(this.identifier, this as any);
  }
}
