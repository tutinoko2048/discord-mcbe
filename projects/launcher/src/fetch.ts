const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_ATTEMPTS = 3;

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  attempts = DEFAULT_ATTEMPTS,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: init.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });

      if (!isRetryableStatus(response.status) || attempt === attempts) {
        return response;
      }

      console.warn(`Request failed with ${response.status}. Retrying (${attempt}/${attempts - 1})...`);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
      console.warn(`Request failed. Retrying (${attempt}/${attempts - 1})...`);
    }

    await Bun.sleep(250 * 2 ** (attempt - 1));
  }

  throw lastError ?? new Error(`Failed to fetch ${url}`);
}
