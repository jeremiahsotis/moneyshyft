import { expect, type APIRequestContext, type TestInfo } from '@playwright/test';
import {
  createStoryG4Headers,
  createStoryG4NeighborCreatePayload,
  createStoryG4ThreadEnsurePayload,
  type StoryG4Context,
} from '../factories/connectShyftStoryG4Factory';
import { deterministicToken } from '../utils/deterministicTestIds';
import { apiRequest } from './apiClient';

type ConnectShyftCreateNeighborEnvelope = {
  ok?: boolean;
  data?: {
    neighbor?: {
      neighborId?: string;
      orgUnitId?: string;
    };
  };
};

type ConnectShyftEnsureThreadEnvelope = {
  ok?: boolean;
  data?: {
    thread?: {
      threadId?: string;
    };
  };
};

export type StoryG4NeighborSeedInput = {
  firstName: string;
  lastName: string;
  primaryPhone: string;
  additionalPhone?: string;
  orgUnitId?: string;
  orgUnitMemberships?: string[];
};

export type StoryG4NeighborSeed = {
  neighborId: string;
};

export const buildStoryG4UrlParams = (
  context: StoryG4Context,
  options: {
    actorUserId: string;
    tenantRole: string;
    orgUnitMemberships: string[];
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: options.actorUserId,
    tenantRole: options.tenantRole,
    orgUnitMemberships: options.orgUnitMemberships.join(','),
  });

  return params.toString();
};

export const buildStoryG4AddNeighborUrl = (context: StoryG4Context): string => {
  return `${context.paths.addNeighborUi}?${buildStoryG4UrlParams(context, {
    actorUserId: context.userId,
    tenantRole: 'ORGUNIT_MEMBER',
    orgUnitMemberships: [context.orgUnitId],
  })}`;
};

export const buildStoryG4DirectoryUrl = (context: StoryG4Context): string => {
  return `${context.paths.directoryUi}?${buildStoryG4UrlParams(context, {
    actorUserId: context.userId,
    tenantRole: 'ORGUNIT_MEMBER',
    orgUnitMemberships: [context.orgUnitId],
  })}`;
};

export const buildStoryG4DeterministicPhone = (
  testInfo: TestInfo,
  label: string,
): string => {
  const token = deterministicToken(testInfo, label, 8);
  const suffix = String(parseInt(token, 16) % 10_000).padStart(4, '0');
  return `+1260555${suffix}`;
};

export const createStoryG4NeighborSeed = async (
  request: APIRequestContext,
  context: StoryG4Context,
  input: StoryG4NeighborSeedInput,
): Promise<StoryG4NeighborSeed> => {
  const scopedOrgUnitId = input.orgUnitId ?? context.orgUnitId;
  const headers = createStoryG4Headers(context, {
    role: 'ORGUNIT_MEMBER',
    userId: context.userId,
    orgUnitId: scopedOrgUnitId,
    orgUnitMemberships: input.orgUnitMemberships ?? [scopedOrgUnitId],
  });

  const response = await apiRequest(request, {
    method: 'POST',
    path: context.paths.neighborsCollection,
    headers,
    data: createStoryG4NeighborCreatePayload(context, {
      orgUnitId: scopedOrgUnitId,
      firstName: input.firstName,
      lastName: input.lastName,
      phones: [
        {
          label: 'mobile',
          value: input.primaryPhone,
          isShared: false,
        },
        ...(input.additionalPhone
          ? [
            {
              label: 'home',
              value: input.additionalPhone,
              isShared: true,
            },
          ]
          : []),
      ],
    }),
  });

  expect(response.status()).toBe(201);
  const body = (await response.json()) as ConnectShyftCreateNeighborEnvelope;
  expect(body.ok).toBe(true);

  const neighborId = String(body.data?.neighbor?.neighborId ?? '').trim();
  expect(neighborId.length).toBeGreaterThan(0);

  return { neighborId };
};

export const ensureStoryG4ThreadSeed = async (
  request: APIRequestContext,
  context: StoryG4Context,
  neighborId: string,
): Promise<string> => {
  const headers = createStoryG4Headers(context, {
    role: 'ORGUNIT_MEMBER',
    userId: context.userId,
    orgUnitMemberships: [context.orgUnitId],
  });

  const payload = createStoryG4ThreadEnsurePayload(context, {
    neighborId,
  });

  const response = await apiRequest(request, {
    method: 'POST',
    path: context.paths.threadsCollection,
    headers,
    data: payload,
  });

  expect(response.status()).toBe(201);
  const body = (await response.json()) as ConnectShyftEnsureThreadEnvelope;
  expect(body.ok).toBe(true);

  const threadId = String(body.data?.thread?.threadId ?? '').trim();
  expect(threadId.length).toBeGreaterThan(0);
  return threadId;
};
