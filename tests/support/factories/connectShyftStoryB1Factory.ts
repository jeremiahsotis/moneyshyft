import { randomUUID } from 'node:crypto';
import { connectShyftContextEnforcementData } from '../../fixtures/test-data';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryB1ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryB1HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryB1NeighborPhoneInput = {
  label: string;
  value: string;
};

export type StoryB1NeighborCreatePayload = {
  orgUnitId: string;
  firstName: string;
  lastName: string;
  phones: StoryB1NeighborPhoneInput[];
};

export type StoryB1Context = {
  storyId: 'b-1';
  tenantId: string;
  orgUnitId: string;
  role: string;
  userId: string;
  correlationId: string;
  csrfToken: string;
  crossTenantOrgUnitId: string;
  flags: ConnectShyftFlags;
  validPhoneRaw: string;
  validPhoneNormalized: string;
  invalidPhoneRaw: string;
  paths: {
    neighborsCollection: string;
    neighborsCreateUi: string;
  };
};

export function createStoryB1Context(
  overrides: StoryB1ContextOverrides = {},
): StoryB1Context {
  return {
    storyId: 'b-1',
    tenantId: overrides.tenantId ?? connectShyftContextEnforcementData.tenantAlphaId,
    orgUnitId:
      overrides.orgUnitId ?? connectShyftContextEnforcementData.orgUnitAlphaEastId,
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId:
      overrides.userId
      ?? `user-connectshyft-b1-${randomUUID().slice(0, 8)}`,
    correlationId:
      overrides.correlationId
      ?? `corr-story-b1-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken
      ?? `csrf-story-b1-${randomUUID().slice(0, 8)}`,
    crossTenantOrgUnitId: connectShyftContextEnforcementData.orgUnitBravoNorthId,
    flags: { ...connectShyftContextEnforcementData.flagsAllEnabled },
    validPhoneRaw: '+1 (260) 555-0199',
    validPhoneNormalized: '+12605550199',
    invalidPhoneRaw: '260-ABC-0199',
    paths: {
      neighborsCollection: '/api/v1/connectshyft/neighbors',
      neighborsCreateUi: '/app/connectshyft/neighbors/new',
    },
  };
}

export function createStoryB1Headers(
  context: StoryB1Context,
  overrides: StoryB1HeaderOverrides = {},
): Record<string, string> {
  const headers = createTenantScopeHeaders({
    tenantId: overrides.tenantId ?? context.tenantId,
    orgUnitId: overrides.orgUnitId === undefined ? context.orgUnitId : overrides.orgUnitId,
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

