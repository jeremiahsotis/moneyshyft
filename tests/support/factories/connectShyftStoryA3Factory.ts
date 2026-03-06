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
  secondaryOrgUnitId: string;
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

const TENANT_ID_PREFIX = 'tenant-connectshyft-';
const ORG_UNIT_ID_PREFIX = 'org-connectshyft-';

const resolveTenantSegment = (tenantId: string, fallbackSegment: string): string => {
  if (!tenantId.startsWith(TENANT_ID_PREFIX)) {
    return fallbackSegment;
  }

  const suffix = tenantId.slice(TENANT_ID_PREFIX.length).trim();
  return suffix.length > 0 ? suffix : fallbackSegment;
};

const resolveStoryA3NumberSeed = (seed: string): number => {
  const parsed = Number.parseInt(seed.slice(0, 8), 16);
  if (Number.isNaN(parsed)) {
    return 1000000;
  }

  return (parsed % 9000000) + 1000000;
};

const formatE164FromSeed = (seed: number): string => `+1260${seed.toString().padStart(7, '0')}`;

export function createStoryA3Context(
  overrides: StoryA3ContextOverrides = {},
): StoryA3Context {
  const contextSeed = randomUUID().replace(/-/g, '').slice(0, 8);
  const fallbackTenantSegment = `alpha-a3-${contextSeed}`;
  const tenantId = overrides.tenantId ?? `${TENANT_ID_PREFIX}${fallbackTenantSegment}`;
  const tenantSegment = resolveTenantSegment(tenantId, fallbackTenantSegment);
  const orgUnitId =
    overrides.orgUnitId ?? `${ORG_UNIT_ID_PREFIX}${tenantSegment}-east`;
  const secondaryOrgUnitId = `${ORG_UNIT_ID_PREFIX}${tenantSegment}-west`;
  const crossTenantOrgUnitId = `${ORG_UNIT_ID_PREFIX}bravo-a3-${contextSeed}-north`;
  const numberSeed = resolveStoryA3NumberSeed(contextSeed);

  return {
    storyId: 'a-3',
    tenantId,
    orgUnitId,
    secondaryOrgUnitId,
    role: overrides.role ?? 'ORGUNIT_ADMIN',
    userId:
      overrides.userId ?? connectShyftNumberMappingData.orgUnitAdminUserId,
    correlationId:
      overrides.correlationId
      ?? `corr-story-a3-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken
      ?? `csrf-story-a3-${randomUUID().slice(0, 8)}`,
    duplicateTenantNumber: formatE164FromSeed(numberSeed + 20),
    validPrimaryNumber: formatE164FromSeed(numberSeed),
    validSecondaryNumber: formatE164FromSeed(numberSeed + 1),
    validUpdatedNumber: formatE164FromSeed(numberSeed + 8),
    invalidNonE164Number: connectShyftNumberMappingData.invalidNonE164Number,
    crossTenantOrgUnitId,
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
