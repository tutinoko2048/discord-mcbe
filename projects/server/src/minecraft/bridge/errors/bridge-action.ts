import { ResponseErrorReason } from '@discord-mcbe/shared';

export class BridgeActionError extends Error {
  constructor(response: { errorReason: ResponseErrorReason; message: string }) {
    super(`[${ResponseErrorReason[response.errorReason]}] ${response.message}`);
    this.name = 'BridgeActionError';
  }
}
