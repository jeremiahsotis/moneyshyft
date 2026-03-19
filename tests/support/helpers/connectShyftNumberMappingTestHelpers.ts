import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';
import { apiRequest } from './apiClient';

type ConnectShyftNumberMappingRecord = {
  mappingId?: string;
  providerNumberE164?: string;
  twilioNumberE164?: string;
  label?: string | null;
  isActive?: boolean;
};

const toMappings = (payload: unknown): ConnectShyftNumberMappingRecord[] => {
  const record = payload && typeof payload === 'object'
    ? (payload as { data?: { mappings?: unknown } })
    : null;
  const mappings = record?.data?.mappings;
  return Array.isArray(mappings) ? (mappings as ConnectShyftNumberMappingRecord[]) : [];
};

const resolveMappingNumber = (mapping: ConnectShyftNumberMappingRecord): string => {
  const providerNumber = typeof mapping.providerNumberE164 === 'string'
    ? mapping.providerNumberE164.trim()
    : '';
  if (providerNumber.length > 0) {
    return providerNumber;
  }

  const twilioNumber = typeof mapping.twilioNumberE164 === 'string'
    ? mapping.twilioNumberE164.trim()
    : '';
  return twilioNumber;
};

const resolveMappingLabel = (mapping: ConnectShyftNumberMappingRecord, fallback: string): string => {
  const label = typeof mapping.label === 'string' ? mapping.label.trim() : '';
  return label.length > 0 ? label : fallback;
};

export const ensureSingleActiveConnectShyftSmsSenderMapping = async (input: {
  request: APIRequestContext;
  headers: Record<string, string>;
  orgUnitId: string;
  preferredNumber: string;
  preferredLabel: string;
}): Promise<void> => {
  const listPath = `/api/v1/connectshyft/numbers?orgUnitId=${encodeURIComponent(input.orgUnitId)}`;
  const initialListResponse = await apiRequest(input.request, {
    method: 'GET',
    path: listPath,
    headers: input.headers,
  });
  expect(initialListResponse.status()).toBe(200);
  const initialListBody = await initialListResponse.json();
  expect(initialListBody).toMatchObject({
    ok: true,
    code: 'CONNECTSHYFT_NUMBER_MAPPINGS_RESOLVED',
  });

  let mappings = toMappings(initialListBody);
  if (!mappings.some((mapping) => resolveMappingNumber(mapping) === input.preferredNumber)) {
    const createResponse = await apiRequest(input.request, {
      method: 'POST',
      path: '/api/v1/connectshyft/numbers',
      headers: input.headers,
      data: {
        orgUnitId: input.orgUnitId,
        providerNumberE164: input.preferredNumber,
        label: input.preferredLabel,
        isActive: true,
      },
    });
    expect([200, 201]).toContain(createResponse.status());
    const createBody = await createResponse.json();
    if (
      createBody?.ok === true &&
      createBody?.code === 'CONNECTSHYFT_NUMBER_MAPPING_SAVED'
    ) {
      mappings = toMappings(createBody);
    } else if (createBody?.code === 'CONNECTSHYFT_NUMBER_MAPPING_DUPLICATE') {
      // Parallel test workers can race to seed the same orgUnit mapping. Refetch
      // and normalize the resulting shared state instead of treating the duplicate
      // insert guard as a test failure.
      const duplicateListResponse = await apiRequest(input.request, {
        method: 'GET',
        path: listPath,
        headers: input.headers,
      });
      expect(duplicateListResponse.status()).toBe(200);
      const duplicateListBody = await duplicateListResponse.json();
      expect(duplicateListBody).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_NUMBER_MAPPINGS_RESOLVED',
      });
      mappings = toMappings(duplicateListBody);
    } else {
      expect(createBody).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_NUMBER_MAPPING_SAVED',
      });
      mappings = toMappings(createBody);
    }
  }

  const selectedMapping = mappings.find(
    (mapping) => resolveMappingNumber(mapping) === input.preferredNumber,
  ) || mappings.find((mapping) => mapping.isActive === true) || mappings[0];
  expect(typeof selectedMapping?.mappingId).toBe('string');
  expect((selectedMapping?.mappingId ?? '').trim().length).toBeGreaterThan(0);

  for (const mapping of mappings) {
    const mappingId = typeof mapping.mappingId === 'string' ? mapping.mappingId.trim() : '';
    if (!mappingId) {
      continue;
    }

    const shouldBeActive = mappingId === selectedMapping?.mappingId;
    if (mapping.isActive === shouldBeActive) {
      continue;
    }

    const updateResponse = await apiRequest(input.request, {
      method: 'PUT',
      path: `/api/v1/connectshyft/numbers/${mappingId}`,
      headers: input.headers,
      data: {
        orgUnitId: input.orgUnitId,
        providerNumberE164: resolveMappingNumber(mapping),
        label: resolveMappingLabel(mapping, input.preferredLabel),
        isActive: shouldBeActive,
      },
    });
    expect(updateResponse.status()).toBe(200);
    const updateBody = await updateResponse.json();
    expect(updateBody).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NUMBER_MAPPING_UPDATED',
    });
  }

  const verificationResponse = await apiRequest(input.request, {
    method: 'GET',
    path: listPath,
    headers: input.headers,
  });
  expect(verificationResponse.status()).toBe(200);
  const verificationBody = await verificationResponse.json();
  const activeMappings = toMappings(verificationBody)
    .filter((mapping) => mapping.isActive === true);
  expect(activeMappings).toHaveLength(1);
};
