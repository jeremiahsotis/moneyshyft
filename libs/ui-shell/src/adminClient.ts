type Envelope<T> = {
  ok?: boolean;
  code?: string;
  message?: string;
  data?: T;
  tenantId?: string | null;
};

export type AdminEnvelope<T> = Envelope<T>;

type ResponseEnvelope<T> = Promise<{ data: Envelope<T> }>;

export interface AdminHttpClient {
  post<T>(url: string, body?: unknown, config?: unknown): ResponseEnvelope<T>;
  patch<T>(url: string, body?: unknown, config?: unknown): ResponseEnvelope<T>;
  put<T>(url: string, body?: unknown, config?: unknown): ResponseEnvelope<T>;
  delete<T>(url: string, config?: unknown): ResponseEnvelope<T>;
}

export const unwrapData = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (record.data && typeof record.data === 'object') {
      return record.data as T;
    }

    return record as T;
  }

  return {} as T;
};

export const buildIdempotencyKey = (): string => {
  if (
    typeof globalThis !== 'undefined'
    && globalThis.crypto
    && typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const adminWriteConfig = () => ({
  headers: {
    'Idempotency-Key': buildIdempotencyKey(),
  },
});

export const createAdminClient = (api: AdminHttpClient) => {
  const adminPost = async <T>(url: string, body?: unknown): Promise<T> => {
    const response = await api.post<T>(url, body ?? {}, adminWriteConfig());
    return unwrapData<T>(response.data);
  };

  const adminPatch = async <T>(url: string, body?: unknown): Promise<T> => {
    const response = await api.patch<T>(url, body ?? {}, adminWriteConfig());
    return unwrapData<T>(response.data);
  };

  const adminPut = async <T>(url: string, body?: unknown): Promise<T> => {
    const response = await api.put<T>(url, body ?? {}, adminWriteConfig());
    return unwrapData<T>(response.data);
  };

  const adminDelete = async <T>(url: string, body?: unknown): Promise<T> => {
    const response = await api.delete<T>(url, {
      ...adminWriteConfig(),
      data: body ?? {},
    });
    return unwrapData<T>(response.data);
  };

  return {
    adminDelete,
    adminPatch,
    adminPost,
    adminPut,
    adminWriteConfig,
    buildIdempotencyKey,
    unwrapData,
  };
};
