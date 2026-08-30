import { ResponseErrorReason } from '../enums/protocol';
import { type ResponseData, type ResponseDataType, safeParseResponseData } from './response-data';
import { RESPONSE_PACKET_TYPE, type ResponsePacket } from './response';

export type RequestResult<T> =
  | {
      error?: false;
      data: T;
    }
  | {
      error: true;
      errorReason: ResponseErrorReason;
      message: string;
    };

export interface TimeoutScheduler<Timer> {
  set(callback: () => void, delay: number): Timer;
  clear(timer: Timer): void;
}

interface PendingRequest<Timer> {
  readonly requestType: ResponseDataType;
  readonly timer: Timer;
  readonly resolve: (result: RequestResult<unknown>) => void;
}

export class PendingRequests<Timer> {
  private readonly requests = new Map<string, PendingRequest<Timer>>();

  constructor(private readonly scheduler: TimeoutScheduler<Timer>) {}

  get size(): number {
    return this.requests.size;
  }

  request<T extends ResponseDataType>(
    requestType: T,
    requestId: string,
    timeout: number,
    send: () => PromiseLike<void> | void,
  ): Promise<RequestResult<ResponseData<T>>> {
    return new Promise((resolve, reject) => {
      const timer = this.scheduler.set(() => {
        this.requests.delete(requestId);
        resolve({
          error: true,
          errorReason: ResponseErrorReason.Timeout,
          message: `Request timed out: ${requestType}`,
        });
      }, timeout);

      this.requests.set(requestId, {
        requestType,
        timer,
        resolve: resolve as (result: RequestResult<unknown>) => void,
      });

      try {
        Promise.resolve(send()).catch((error: unknown) => {
          this.delete(requestId);
          reject(error instanceof Error ? error : new Error(String(error)));
        });
      } catch (error) {
        this.delete(requestId);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  handle(response: ResponsePacket): boolean {
    const pending = this.requests.get(response.requestId);
    if (!pending) return false;

    this.delete(response.requestId);

    if (!response.ok) {
      pending.resolve({
        error: true,
        errorReason: response.error.code,
        message: response.error.message,
      });
      return true;
    }

    const parsed = safeParseResponseData(pending.requestType, response.data);
    if (!parsed.success) {
      pending.resolve({
        error: true,
        errorReason: ResponseErrorReason.InvalidPayload,
        message: `Invalid response data for ${pending.requestType}`,
      });
      return true;
    }

    pending.resolve({ error: false, data: parsed.output });
    return true;
  }

  abortAll(message: string): void {
    for (const [requestId, pending] of this.requests) {
      this.scheduler.clear(pending.timer);
      pending.resolve({
        error: true,
        errorReason: ResponseErrorReason.Abort,
        message,
      });
      this.requests.delete(requestId);
    }
  }

  private delete(requestId: string): void {
    const pending = this.requests.get(requestId);
    if (!pending) return;
    this.scheduler.clear(pending.timer);
    this.requests.delete(requestId);
  }
}

export function successResponse(requestId: string, data: unknown): ResponsePacket {
  return {
    type: RESPONSE_PACKET_TYPE,
    requestId,
    ok: true,
    data,
  };
}

export function errorResponse(requestId: string, code: ResponseErrorReason, message: string): ResponsePacket {
  return {
    type: RESPONSE_PACKET_TYPE,
    requestId,
    ok: false,
    error: { code, message },
  };
}
