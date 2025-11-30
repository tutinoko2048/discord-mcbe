import type { Application } from '../main';
import { ApplicationEvent } from './app';

export class ShutdownEvent extends ApplicationEvent {
  public static readonly identifier = 'shutdown';
}
