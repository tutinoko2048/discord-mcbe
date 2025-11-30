import { ApplicationEvent } from './app';

export class StartupEvent extends ApplicationEvent {
  public static readonly identifier = 'startup';
}
