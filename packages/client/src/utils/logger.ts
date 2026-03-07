export class Logger {
  constructor(private readonly name: string) {}

  log(...message: unknown[]): void {
    console.log(`[${this.name}] ${this.formatMessage(message)}`);
  }

  info(...message: unknown[]): void {
    console.info(`[${this.name}] ${this.formatMessage(message)}`);
  }

  warn(...message: unknown[]): void {
    console.warn(`[${this.name}] ${this.formatMessage(message)}`);
  }

  error(...message: unknown[]): void {
    console.error(`[${this.name}] ${this.formatMessage(message)}`);
  }

  debug(...message: unknown[]): void {
    if (!__DEV__) return;
    console.info(`[${this.name}] ${this.formatMessage(message)}`);
  }

  private formatMessage(message: unknown[]): string {
    return message
      .map((msg) => {
        if (msg instanceof Error) {
          return msg.stack ?? msg;
        } else if (typeof msg !== 'string') {
          return JSON.stringify(msg, null, 2);
        }
        return msg;
      })
      .join(' ');
  }
}
