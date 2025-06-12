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
    console.log(
      color.gray(color.dim(this.getTime())),
      color.gray(`[${color.bold('LOG')}] [${this.name}] ${this.formatMessage(message)}`),
    );
  }

  public info(...message: any[]): void {
    console.info(
      color.gray(color.dim(this.getTime())),
      color.cyanBright(`[${color.bold('INFO')}]`),
      `[${this.name}]`,
      this.formatMessage(message)
    );
  }

  public warn(...message: any[]): void {
    console.warn(
      color.gray(color.dim(this.getTime())),
      color.yellow(`[${color.bold('WARN')}] [${this.name}] ${this.formatMessage(message)}`),
    );
  }

  public error(...message: any[]): void {
    console.error(
      color.gray(color.dim(this.getTime())),
      color.red(`[${color.bold('ERROR')}] [${this.name}] ${this.formatMessage(message)}`),
    );
  }

  public debug(...message: any[]): void {
    if (!this.options.debug) return;
    console.debug(
      color.gray(color.dim(this.getTime())),
      color.magenta(`[${color.bold('DEBUG')}]`),
      `[${this.name}]`,
      this.formatMessage(message)
    );
  }

  private formatMessage(message: any[]): string {
    return message.map((msg) => {
      if (msg instanceof Error) {
        return msg.stack ?? msg;
      } else if (typeof msg !== 'string') {
        return inspect(msg, { depth: 2, colors: true });
      } else {
        return msg;
      }
    }).join(' ');
  }

  private getTime(): string {
    const date = new Date();
    const offset = this.options.timezoneOffset ?? 0;
    const localDate = new Date(date.getTime() + offset * 60 * 60 * 1000);
    return localDate.toISOString().replace('T', ' ').replace('Z', '');
  }
}