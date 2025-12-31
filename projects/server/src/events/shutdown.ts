import type { Application } from '../application';
import { ApplicationEvent } from './app';

export class ShutdownEvent extends ApplicationEvent {
  public static readonly identifier = 'shutdown';
}
