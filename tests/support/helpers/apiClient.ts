import type { APIRequestContext, APIResponse } from '@playwright/test';
import { ensureConnectShyftDbActorUser } from './connectShyftDbActor';

type RequestOptions = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  data?: unknown;
  headers?: Record<string, string>;
};

const MAX_TRANSIENT_RETRIES = 2;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }

  try {
    const payloadJson = Buffer.from(segments[1], 'base64url').toString('utf8');
    const parsed = JSON.parse(payloadJson) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const readCookieValue = (cookieHeader: string | undefined, key: string): string | null => {
  if (!cookieHeader) {
    return null;
  }

  const cookie = cookieHeader
    .split(';')
    .map((segment) => segment.trim())
    .find((segment) => segment.startsWith(`${key}=`));

  if (!cookie) {
    return null;
  }

  return cookie.slice(key.length + 1) || null;
};

const resolveConnectShyftActorUserId = (options: RequestOptions): string | null => {
  const explicitUserId = options.headers?.['x-test-connectshyft-user-id']?.trim();
  if (explicitUserId) {
    return explicitUserId;
  }

  const accessToken = readCookieValue(options.headers?.cookie, 'access_token');
  if (!accessToken) {
    return null;
  }

  const payload = decodeJwtPayload(accessToken);
  return typeof payload?.userId === 'string' ? payload.userId.trim() : null;
};

const primeConnectShyftActorUser = async (options: RequestOptions): Promise<void> => {
  if (!options.path.startsWith('/api/v1/connectshyft/')) {
    return;
  }

  const actorUserId = resolveConnectShyftActorUserId(options);
  if (!actorUserId || !UUID_PATTERN.test(actorUserId)) {
    return;
  }

  await ensureConnectShyftDbActorUser(actorUserId);
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

  await primeConnectShyftActorUser(options);

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
