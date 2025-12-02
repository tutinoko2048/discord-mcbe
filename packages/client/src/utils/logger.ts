export class Logger {
  constructor(private readonly name: string) {}

  info(...message: any[]): void {
    console.info(`[${this.name}] ${this.formatMessage(message)}`);
  }

  warn(...message: any[]): void {
    console.warn(`[${this.name}] ${this.formatMessage(message)}`);
  }

  error(...message: any[]): void {
    console.error(`[${this.name}] ${this.formatMessage(message)}`);
  }

  debug(...message: any[]): void {
    if (!__DEV__) return;
    console.info(`[${this.name}] ${this.formatMessage(message)}`);
  }

  private formatMessage(message: any[]): string {
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
