import { randomUUID } from 'node:crypto';
import { connectShyftCapabilityEnvelopeData } from '../../fixtures/test-data';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryA5ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  threadId?: string;
  existingMappingId?: string;
};

type StoryA5HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryA5Context = {
  storyId: 'a-5';
  tenantId: string;
  orgUnitId: string;
  role: string;
  userId: string;
  correlationId: string;
  csrfToken: string;
  threadId: string;
  existingMappingId: string;
  validPrimaryNumber: string;
  validUpdatedNumber: string;
  validEscalationBaselineHours: number;
  fallbackEscalationBaselineHours: number;
  orgUnitAdminUserId: string;
  orgUnitMemberUserId: string;
  tenantStaffUserId: string;
  tenantViewerUserId: string;
  tenantAdminUserId: string;
  unauthorizedUserId: string;
  flags: ConnectShyftFlags;
  paths: {
    inbox: string;
    threadEnsure: string;
    threadClaim: string;
    threadTakeover: string;
    numbersCollection: string;
    numbersById: string;
    escalationConfig: string;
    envelopeSystemErrorContract: string;
    numbersUi: string;
    escalationUi: string;
  };
};

export function createStoryA5Context(
  overrides: StoryA5ContextOverrides = {},
): StoryA5Context {
  const threadId = overrides.threadId ?? '03e7ea47-70ed-48c5-8880-4d88c1888bdb';
  const existingMappingId =
    overrides.existingMappingId ?? connectShyftCapabilityEnvelopeData.existingMappingId;

  return {
    storyId: 'a-5',
    tenantId: overrides.tenantId ?? connectShyftCapabilityEnvelopeData.tenantAlphaId,
    orgUnitId:
      overrides.orgUnitId ?? connectShyftCapabilityEnvelopeData.orgUnitAlphaWestId,
    role: overrides.role ?? 'ORGUNIT_ADMIN',
    userId: overrides.userId ?? connectShyftCapabilityEnvelopeData.orgUnitAdminUserId,
    correlationId:
      overrides.correlationId ?? `corr-story-a5-${randomUUID().slice(0, 8)}`,
    csrfToken: overrides.csrfToken ?? `csrf-story-a5-${randomUUID().slice(0, 8)}`,
    threadId,
    existingMappingId,
    validPrimaryNumber: connectShyftCapabilityEnvelopeData.validPrimaryNumber,
    validUpdatedNumber: connectShyftCapabilityEnvelopeData.validUpdatedNumber,
    validEscalationBaselineHours:
      connectShyftCapabilityEnvelopeData.validEscalationBaselineHours,
    fallbackEscalationBaselineHours:
      connectShyftCapabilityEnvelopeData.fallbackEscalationBaselineHours,
    orgUnitAdminUserId: connectShyftCapabilityEnvelopeData.orgUnitAdminUserId,
    orgUnitMemberUserId: connectShyftCapabilityEnvelopeData.orgUnitMemberUserId,
    tenantStaffUserId: connectShyftCapabilityEnvelopeData.tenantStaffUserId,
    tenantViewerUserId: connectShyftCapabilityEnvelopeData.tenantViewerUserId,
    tenantAdminUserId: connectShyftCapabilityEnvelopeData.tenantAdminUserId,
    unauthorizedUserId: connectShyftCapabilityEnvelopeData.unauthorizedUserId,
    flags: {
      ...connectShyftCapabilityEnvelopeData.flagsAllEnabled,
    },
    paths: {
      inbox: '/api/v1/connectshyft/inbox',
      threadEnsure: '/api/v1/connectshyft/threads',
      threadClaim: `/api/v1/connectshyft/threads/${threadId}/claim`,
      threadTakeover: `/api/v1/connectshyft/threads/${threadId}/takeover`,
      numbersCollection: '/api/v1/connectshyft/numbers',
      numbersById: `/api/v1/connectshyft/numbers/${existingMappingId}`,
      escalationConfig: '/api/v1/connectshyft/escalation/config',
      envelopeSystemErrorContract:
        '/api/v1/platform/_kernel/contracts/envelope/response-matrix/system-error',
      numbersUi: '/app/connectshyft/settings/numbers',
      escalationUi: '/app/connectshyft/settings/escalation',
    },
  };
}

export function createStoryA5Headers(
  context: StoryA5Context,
  overrides: StoryA5HeaderOverrides = {},
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
