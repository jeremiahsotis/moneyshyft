import type { APIRequestContext } from '@playwright/test';

export async function findByField<T extends Record<string, unknown>>(
  request: APIRequestContext,
  path: string,
  field: keyof T,
  value: T[keyof T]
): Promise<T | undefined> {
  const response = await request.get(path);
  const data = await response.json();
  return data.data.find((item: T) => item[field] === value);
}

export async function deleteById(request: APIRequestContext, path: string, id?: string) {
  if (!id) return;
  await request.delete(`${path}/${id}`);
}
