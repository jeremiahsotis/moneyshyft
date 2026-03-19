import { randomUUID } from 'node:crypto';
import { connectShyftContextEnforcementData } from '../../fixtures/test-data';
import { createUniqueConnectShyftTestPhone } from './connectShyftTestPhoneFactory';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryB2ContextOverrides = {
  tenantId?: string;
  primaryOrgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  neighborId?: string;
};

type StoryB2HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryB2NeighborPhoneInput = {
  label: string;
  value: string;
  isShared: boolean;
  verificationStatus?: 'verified' | 'unverified';
};

export type StoryB2NeighborUpdatePayload = {
  orgUnitId: string;
  firstName: string;
  lastName: string;
  phones: StoryB2NeighborPhoneInput[];
};

export type StoryB2Context = {
  storyId: 'b-2';
  tenantId: string;
  primaryOrgUnitId: string;
  peerOrgUnitId: string;
  crossTenantId: string;
  crossTenantOrgUnitId: string;
  role: string;
  userId: string;
  correlationId: string;
  csrfToken: string;
  neighborId: string;
  baseFirstName: string;
  baseLastName: string;
  updatedFirstName: string;
  updatedLastName: string;
  sharedPhoneRaw: string;
  sharedPhoneNormalized: string;
  nonSharedPhoneRaw: string;
  nonSharedPhoneNormalized: string;
  flags: ConnectShyftFlags;
  paths: {
    neighborsCollection: string;
    neighborById: string;
    neighborProfileUi: string;
  };
};

export function createStoryB2Context(
  overrides: StoryB2ContextOverrides = {},
): StoryB2Context {
  const neighborId = overrides.neighborId ?? `neighbor-b2-${randomUUID().slice(0, 8)}`;
  const sharedPhone = createUniqueConnectShyftTestPhone('7');
  const nonSharedPhone = createUniqueConnectShyftTestPhone('8');

  return {
    storyId: 'b-2',
    tenantId: overrides.tenantId ?? connectShyftContextEnforcementData.tenantAlphaId,
    primaryOrgUnitId:
      overrides.primaryOrgUnitId
      ?? connectShyftContextEnforcementData.orgUnitAlphaEastId,
    peerOrgUnitId: connectShyftContextEnforcementData.orgUnitAlphaWestId,
    crossTenantId: connectShyftContextEnforcementData.tenantBravoId,
    crossTenantOrgUnitId: connectShyftContextEnforcementData.orgUnitBravoNorthId,
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId:
      overrides.userId
      ?? `user-connectshyft-b2-${randomUUID().slice(0, 8)}`,
    correlationId:
      overrides.correlationId
      ?? `corr-story-b2-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken
      ?? `csrf-story-b2-${randomUUID().slice(0, 8)}`,
    neighborId,
    baseFirstName: 'Mina',
    baseLastName: 'Lopez',
    updatedFirstName: 'Mina Shared',
    updatedLastName: 'Lopez Shared',
    sharedPhoneRaw: sharedPhone.raw,
    sharedPhoneNormalized: sharedPhone.normalized,
    nonSharedPhoneRaw: nonSharedPhone.raw,
    nonSharedPhoneNormalized: nonSharedPhone.normalized,
    flags: { ...connectShyftContextEnforcementData.flagsAllEnabled },
    paths: {
      neighborsCollection: '/api/v1/connectshyft/neighbors',
      neighborById: `/api/v1/connectshyft/neighbors/${neighborId}`,
      neighborProfileUi: `/app/connectshyft/neighbors/${neighborId}`,
    },
  };
}

export function createStoryB2Headers(
  context: StoryB2Context,
  overrides: StoryB2HeaderOverrides = {},
): Record<string, string> {
  const headers = createTenantScopeHeaders({
    tenantId: overrides.tenantId ?? context.tenantId,
    orgUnitId:
      overrides.orgUnitId === undefined ? context.primaryOrgUnitId : overrides.orgUnitId,
    role: overrides.role ?? context.role,
    userId: overrides.userId ?? context.userId,
    correlationId: overrides.correlationId ?? context.correlationId,
    csrfToken: overrides.csrfToken ?? context.csrfToken,
  });

  const resolvedHeaders: Record<string, string> = {
    ...headers,
    'x-test-connectshyft-flags': JSON.stringify(overrides.flags ?? context.flags),
  };

  if (overrides.orgUnitMemberships) {
    resolvedHeaders['x-test-connectshyft-orgunit-memberships'] = JSON.stringify(
      overrides.orgUnitMemberships,
    );
  }

  return resolvedHeaders;
}
