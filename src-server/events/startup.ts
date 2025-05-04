import type { App } from '../main';

export class StartupEvent {
  constructor(
    public readonly app: App,
  ) {}

  setPlayerNameFormatter(formatter: (name: string) => string): void {
    this.app.server.options.formatter ??= {};
    this.app.server.options.formatter.playerName = formatter;
  }
}