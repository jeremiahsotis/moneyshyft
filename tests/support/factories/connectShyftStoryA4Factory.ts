import { randomUUID } from 'node:crypto';
import { connectShyftEscalationConfigData } from '../../fixtures/test-data';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryA4ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryA4HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

type StoryA4Recipients = {
  primaryOrgUnitAdminUserId: string;
  secondaryOrgUnitAdminUserId: string;
  tenantStaffUserId: string;
};

export type StoryA4Context = {
  storyId: 'a-4';
  tenantId: string;
  orgUnitId: string;
  role: string;
  userId: string;
  correlationId: string;
  csrfToken: string;
  defaultBaselineHours: number;
  validBaselineHours: number;
  invalidBaselineLow: number;
  invalidBaselineHigh: number;
  invalidBaselineFractional: number;
  crossTenantOrgUnitId: string;
  crossTenantRecipientUserId: string;
  recipients: StoryA4Recipients;
  flags: ConnectShyftFlags;
  paths: {
    escalationConfig: string;
    escalationUi: string;
  };
};

export function createStoryA4Context(
  overrides: StoryA4ContextOverrides = {},
): StoryA4Context {
  return {
    storyId: 'a-4',
    tenantId: overrides.tenantId ?? connectShyftEscalationConfigData.tenantAlphaId,
    orgUnitId:
      overrides.orgUnitId ?? connectShyftEscalationConfigData.orgUnitAlphaEastId,
    role: overrides.role ?? 'ORGUNIT_ADMIN',
    userId: overrides.userId ?? connectShyftEscalationConfigData.orgUnitAdminUserId,
    correlationId:
      overrides.correlationId
      ?? `corr-story-a4-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken
      ?? `csrf-story-a4-${randomUUID().slice(0, 8)}`,
    defaultBaselineHours: connectShyftEscalationConfigData.defaultBaselineHours,
    validBaselineHours: connectShyftEscalationConfigData.validBaselineHours,
    invalidBaselineLow: connectShyftEscalationConfigData.invalidBaselineLow,
    invalidBaselineHigh: connectShyftEscalationConfigData.invalidBaselineHigh,
    invalidBaselineFractional:
      connectShyftEscalationConfigData.invalidBaselineFractional,
    crossTenantOrgUnitId: connectShyftEscalationConfigData.orgUnitBravoNorthId,
    crossTenantRecipientUserId:
      connectShyftEscalationConfigData.crossTenantRecipientUserId,
    recipients: {
      primaryOrgUnitAdminUserId:
        connectShyftEscalationConfigData.primaryRecipientUserId,
      secondaryOrgUnitAdminUserId:
        connectShyftEscalationConfigData.secondaryRecipientUserId,
      tenantStaffUserId:
        connectShyftEscalationConfigData.tenantStaffRecipientUserId,
    },
    flags: { ...connectShyftEscalationConfigData.flagsAllEnabled },
    paths: {
      escalationConfig: '/api/v1/connectshyft/escalation/config',
      escalationUi: '/app/connectshyft/settings/escalation',
    },
  };
}

export function createStoryA4Headers(
  context: StoryA4Context,
  overrides: StoryA4HeaderOverrides = {},
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
