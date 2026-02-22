import { randomUUID } from 'node:crypto';
import { connectShyftNumberMappingData } from '../../fixtures/test-data';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryA3ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryA3HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryA3Context = {
  storyId: 'a-3';
  tenantId: string;
  orgUnitId: string;
  role: string;
  userId: string;
  correlationId: string;
  csrfToken: string;
  duplicateTenantNumber: string;
  validPrimaryNumber: string;
  validSecondaryNumber: string;
  validUpdatedNumber: string;
  invalidNonE164Number: string;
  crossTenantOrgUnitId: string;
  flags: ConnectShyftFlags;
  paths: {
    numbersCollection: string;
    numbersById: string;
    numbersUi: string;
  };
};

export function createStoryA3Context(
  overrides: StoryA3ContextOverrides = {},
): StoryA3Context {
  return {
    storyId: 'a-3',
    tenantId: overrides.tenantId ?? connectShyftNumberMappingData.tenantAlphaId,
    orgUnitId:
      overrides.orgUnitId ?? connectShyftNumberMappingData.orgUnitAlphaEastId,
    role: overrides.role ?? 'ORGUNIT_ADMIN',
    userId:
      overrides.userId ?? connectShyftNumberMappingData.orgUnitAdminUserId,
    correlationId:
      overrides.correlationId
      ?? `corr-story-a3-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken
      ?? `csrf-story-a3-${randomUUID().slice(0, 8)}`,
    duplicateTenantNumber: connectShyftNumberMappingData.duplicateTenantNumber,
    validPrimaryNumber: connectShyftNumberMappingData.validPrimaryNumber,
    validSecondaryNumber: connectShyftNumberMappingData.validSecondaryNumber,
    validUpdatedNumber: connectShyftNumberMappingData.validUpdatedNumber,
    invalidNonE164Number: connectShyftNumberMappingData.invalidNonE164Number,
    crossTenantOrgUnitId: connectShyftNumberMappingData.orgUnitBravoNorthId,
    flags: { ...connectShyftNumberMappingData.flagsAllEnabled },
    paths: {
      numbersCollection: '/api/v1/connectshyft/numbers',
      numbersById: '/api/v1/connectshyft/numbers/mapping-a3-1001',
      numbersUi: '/app/connectshyft/settings/numbers',
    },
  };
}

export function createStoryA3Headers(
  context: StoryA3Context,
  overrides: StoryA3HeaderOverrides = {},
): Record<string, string> {
  const headers = createTenantScopeHeaders({
    tenantId: overrides.tenantId ?? context.tenantId,
    orgUnitId:
      overrides.orgUnitId === undefined ? context.orgUnitId : overrides.orgUnitId,
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
