import { inspect } from 'node:util';
import * as color from 'colorette';

interface LoggerOptions {
  timezoneOffset?: number;
  debug?: boolean;
}

export class Logger {
  constructor(
    private readonly name: string,
    private readonly options: LoggerOptions = {}
  ) {}

  public log(...message: any[]): void {
    const formattedMessage = this.formatMessage(message);
    console.log(
      color.gray(`${this.getTime()} [LOG] [${this.name}] ${formattedMessage}`)
    );
  }

  public info(...message: any[]): void {
    const formattedMessage = this.formatMessage(message);
    console.log(
      color.whiteBright(`${this.getTime()} [INFO] [${this.name}] ${formattedMessage}`)
    );
  }

  public warn(...message: any[]): void {
    const formattedMessage = this.formatMessage(message);
    console.warn(
      color.yellow(`${this.getTime()} [WARN] [${this.name}] ${formattedMessage}`)
    );
  }

  public error(...message: any[]): void {
    const formattedMessage = this.formatMessage(message);
    console.error(
      color.red(`${this.getTime()} [ERROR] [${this.name}] ${formattedMessage}`)
    );
  }

  public debug(...message: any[]): void {
    if (!this.options.debug) return;
    const formattedMessage = this.formatMessage(message);
    console.log(
      color.cyan(`${this.getTime()} [DEBUG] [${this.name}] ${formattedMessage}`)
    );
  }

  private formatMessage(message: any[]): string {
    return message.map((msg) => {
      if (typeof msg === 'object') {
        return inspect(msg, { depth: 2, colors: true });
      }
      return msg;
    }).join(' ');
  }

  private getTime(): string {
    const date = new Date();
    const offset = this.options.timezoneOffset ?? 0;
    const localDate = new Date(date.getTime() + offset * 60 * 60 * 1000);
    return localDate.toISOString().replace('T', ' ').replace('Z', '');
  }
}