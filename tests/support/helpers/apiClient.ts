import type { APIRequestContext, APIResponse } from '@playwright/test';

type RequestOptions = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  data?: unknown;
  headers?: Record<string, string>;
};

const MAX_TRANSIENT_RETRIES = 2;

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const isTransientNetworkFailure = (error: unknown): boolean => {
  const message = String((error as { message?: unknown })?.message ?? '');
  return (
    message.includes('ECONNRESET')
    || message.includes('ECONNREFUSED')
    || message.includes('ETIMEDOUT')
    || message.includes('socket hang up')
    || message.includes('Timeout')
  );
};

export async function apiRequest(
  request: APIRequestContext,
  options: RequestOptions,
): Promise<APIResponse> {
  const defaultApiBaseUrl = 'http://127.0.0.1:3000';
  const configuredApiBaseUrl = process.env.API_URL || process.env.API_BASE_URL || defaultApiBaseUrl;
  const requestUrl = options.path.startsWith('/api/')
    ? new URL(options.path, configuredApiBaseUrl).toString()
    : options.path;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await request.fetch(requestUrl, {
        method: options.method,
        data: options.data,
        headers: options.headers,
      });
    } catch (error) {
      if (!isTransientNetworkFailure(error) || attempt >= MAX_TRANSIENT_RETRIES) {
        throw error;
      }
      await sleep(200 * (attempt + 1));
    }
  }
}
