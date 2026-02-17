import type { APIRequestContext, APIResponse } from '@playwright/test';

type RequestOptions = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  data?: unknown;
  headers?: Record<string, string>;
};

export async function apiRequest(
  request: APIRequestContext,
  options: RequestOptions,
): Promise<APIResponse> {
  return request.fetch(options.path, {
    method: options.method,
    data: options.data,
    headers: options.headers,
  });
}
