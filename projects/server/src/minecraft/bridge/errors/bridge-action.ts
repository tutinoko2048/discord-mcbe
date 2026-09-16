import { ResponseErrorReason } from '@discord-mcbe/shared';

export class BridgeActionError extends Error {
  readonly issues?: readonly unknown[];

  constructor(response: { errorReason: ResponseErrorReason; message: string; issues?: readonly unknown[] }) {
    const issues = response.errorReason === ResponseErrorReason.InvalidPayload ? response.issues : undefined;
    super(
      `[${ResponseErrorReason[response.errorReason]}] ${response.message}` +
        (issues ? `\n${JSON.stringify(issues, null, 2)}` : ''),
    );
    this.name = 'BridgeActionError';
    this.issues = issues;
  }
}
