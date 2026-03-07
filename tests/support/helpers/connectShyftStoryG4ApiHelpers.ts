import { expect } from '@playwright/test';
import { apiRequest } from './apiClient';

type ConnectShyftNeighborPhone = {
  label?: string;
  value?: string;
  isShared?: boolean;
  isPrimary?: boolean;
};

type ConnectShyftNeighbor = {
  neighborId?: string;
  tenantId?: string;
  orgUnitId?: string;
  firstName?: string;
  lastName?: string;
  prefersTexting?: string;
  email?: string;
  notes?: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  phones?: ConnectShyftNeighborPhone[];
};

export type ConnectShyftEnvelope = {
  ok?: boolean;
  code?: string;
  message?: string;
  data?: {
    thread?: {
      threadId?: string;
      state?: string;
      neighborId?: string;
      orgUnitId?: string;
    };
    lifecycle?: {
      createdNewThread?: boolean;
      reusedThreadId?: string;
      ensuredActiveThread?: boolean;
    };
    neighbor?: ConnectShyftNeighbor;
    neighbors?: ConnectShyftNeighbor[];
    fieldErrors?: Array<{
      field?: string;
      reason?: string;
      message?: string;
    }>;
  };
};

export const listStoryG4Neighbors = async (
  request: Parameters<typeof apiRequest>[0],
  path: string,
  headers: Record<string, string>,
): Promise<ConnectShyftEnvelope> => {
  const response = await apiRequest(request, {
    method: 'GET',
    path,
    headers,
  });

  expect(response.status()).toBe(200);
  return (await response.json()) as ConnectShyftEnvelope;
};
