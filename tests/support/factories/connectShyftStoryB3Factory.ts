import { randomUUID } from 'node:crypto';
import { connectShyftContextEnforcementData } from '../../fixtures/test-data';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryB3ContextOverrides = {
  tenantId?: string;
  primaryOrgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  neighborId?: string;
};

type StoryB3HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
  activeThreadNeighborIds?: string[];
};

export type StoryB3NeighborPhoneInput = {
  label: string;
  value: string;
  isShared: boolean;
  verificationStatus?: 'verified' | 'unverified';
};

export type StoryB3NeighborUpdatePayload = {
  orgUnitId: string;
  firstName: string;
  lastName: string;
  phones: StoryB3NeighborPhoneInput[];
};

export type StoryB3Context = {
  storyId: 'b-3';
  tenantId: string;
  primaryOrgUnitId: string;
  peerOrgUnitId: string;
  crossTenantId: string;
  crossTenantOrgUnitId: string;
  role: string;
  userId: string;
  relatedActorUserId: string;
  unrelatedActorUserId: string;
  tenantPrivilegedUserId: string;
  correlationId: string;
  csrfToken: string;
  neighborId: string;
  activeThreadId: string;
  baseFirstName: string;
  baseLastName: string;
  relatedUpdateFirstName: string;
  relatedUpdateLastName: string;
  tenantPrivilegedUpdateFirstName: string;
  tenantPrivilegedUpdateLastName: string;
  sharedPhoneRaw: string;
  sharedPhoneNormalized: string;
  nonSharedPhoneRaw: string;
  nonSharedPhoneNormalized: string;
  refusalCodes: {
    relationshipRequired: 'CONNECTSHYFT_NEIGHBOR_EDIT_RELATIONSHIP_REQUIRED';
  };
  flags: ConnectShyftFlags;
  paths: {
    neighborsCollection: string;
    neighborById: string;
    neighborProfileUi: string;
  };
};

export function createStoryB3Context(
  overrides: StoryB3ContextOverrides = {},
): StoryB3Context {
  const neighborId = overrides.neighborId ?? `neighbor-b3-${randomUUID().slice(0, 8)}`;
  const relatedActorUserId = `user-connectshyft-b3-related-${randomUUID().slice(0, 8)}`;
  const unrelatedActorUserId = `user-connectshyft-b3-unrelated-${randomUUID().slice(0, 8)}`;
  const tenantPrivilegedUserId = `user-connectshyft-b3-tenant-staff-${randomUUID().slice(0, 8)}`;

  return {
    storyId: 'b-3',
    tenantId: overrides.tenantId ?? connectShyftContextEnforcementData.tenantAlphaId,
    primaryOrgUnitId:
      overrides.primaryOrgUnitId
      ?? connectShyftContextEnforcementData.orgUnitAlphaEastId,
    peerOrgUnitId: connectShyftContextEnforcementData.orgUnitAlphaWestId,
    crossTenantId: connectShyftContextEnforcementData.tenantBravoId,
    crossTenantOrgUnitId: connectShyftContextEnforcementData.orgUnitBravoNorthId,
    role: overrides.role ?? 'ORGUNIT_IDENTITY_LEAD',
    userId:
      overrides.userId
      ?? `user-connectshyft-b3-${randomUUID().slice(0, 8)}`,
    relatedActorUserId,
    unrelatedActorUserId,
    tenantPrivilegedUserId,
    correlationId:
      overrides.correlationId
      ?? `corr-story-b3-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken
      ?? `csrf-story-b3-${randomUUID().slice(0, 8)}`,
    neighborId,
    activeThreadId: randomUUID(),
    baseFirstName: 'Mina',
    baseLastName: 'Lopez',
    relatedUpdateFirstName: 'Mina Governed',
    relatedUpdateLastName: 'Lopez Governed',
    tenantPrivilegedUpdateFirstName: 'Mina Privileged',
    tenantPrivilegedUpdateLastName: 'Lopez Privileged',
    sharedPhoneRaw: '+1 (260) 555-0311',
    sharedPhoneNormalized: '+12605550311',
    nonSharedPhoneRaw: '+1 (260) 555-0312',
    nonSharedPhoneNormalized: '+12605550312',
    refusalCodes: {
      relationshipRequired: 'CONNECTSHYFT_NEIGHBOR_EDIT_RELATIONSHIP_REQUIRED',
    },
    flags: { ...connectShyftContextEnforcementData.flagsAllEnabled },
    paths: {
      neighborsCollection: '/api/v1/connectshyft/neighbors',
      neighborById: `/api/v1/connectshyft/neighbors/${neighborId}`,
      neighborProfileUi: `/app/connectshyft/neighbors/${neighborId}`,
    },
  };
}

export function createStoryB3Headers(
  context: StoryB3Context,
  overrides: StoryB3HeaderOverrides = {},
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

  if (overrides.activeThreadNeighborIds) {
    resolvedHeaders['x-test-connectshyft-active-thread-neighbor-ids'] = JSON.stringify(
      overrides.activeThreadNeighborIds,
    );
  }

  return resolvedHeaders;
}
