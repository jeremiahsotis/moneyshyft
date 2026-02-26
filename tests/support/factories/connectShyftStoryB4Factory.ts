import { randomUUID } from 'node:crypto';
import { connectShyftContextEnforcementData } from '../../fixtures/test-data';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryB4ContextOverrides = {
  tenantId?: string;
  primaryOrgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  sourceNeighborId?: string;
  survivorNeighborId?: string;
};

type StoryB4HeaderOverrides = {
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

export type StoryB4NeighborMergePayload = {
  orgUnitId: string;
  sourceNeighborId: string;
  survivorNeighborId: string;
  irreversibleConfirmation: {
    acknowledged: boolean;
    phrase: string;
  };
  reason: string;
  simulateFailureStage?: 'before-commit' | 'after-dependent-repoint';
};

export type StoryB4Context = {
  storyId: 'b-4';
  tenantId: string;
  primaryOrgUnitId: string;
  peerOrgUnitId: string;
  crossTenantId: string;
  crossTenantOrgUnitId: string;
  role: string;
  userId: string;
  tenantAdminUserId: string;
  identityLeadUserId: string;
  orgUnitMemberUserId: string;
  correlationId: string;
  csrfToken: string;
  sourceNeighborId: string;
  survivorNeighborId: string;
  irreversibleConfirmationPhrase: string;
  refusalCodes: {
    mergeForbidden: 'CONNECTSHYFT_NEIGHBOR_MERGE_FORBIDDEN';
    confirmationRequired: 'CONNECTSHYFT_NEIGHBOR_MERGE_CONFIRMATION_REQUIRED';
    transactionAborted: 'CONNECTSHYFT_NEIGHBOR_MERGE_TRANSACTION_ABORTED';
  };
  flags: ConnectShyftFlags;
  paths: {
    neighborsCollection: string;
    sourceNeighborById: string;
    survivorNeighborById: string;
    neighborMerge: string;
    neighborProfileUi: string;
  };
};

export function createStoryB4Context(
  overrides: StoryB4ContextOverrides = {},
): StoryB4Context {
  const sourceNeighborId = overrides.sourceNeighborId
    ?? `neighbor-b4-source-${randomUUID().slice(0, 8)}`;
  const survivorNeighborId = overrides.survivorNeighborId
    ?? `neighbor-b4-survivor-${randomUUID().slice(0, 8)}`;

  return {
    storyId: 'b-4',
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
      ?? `user-connectshyft-b4-${randomUUID().slice(0, 8)}`,
    tenantAdminUserId: `user-connectshyft-b4-tenant-admin-${randomUUID().slice(0, 8)}`,
    identityLeadUserId: `user-connectshyft-b4-identity-lead-${randomUUID().slice(0, 8)}`,
    orgUnitMemberUserId: `user-connectshyft-b4-orgunit-member-${randomUUID().slice(0, 8)}`,
    correlationId:
      overrides.correlationId
      ?? `corr-story-b4-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken
      ?? `csrf-story-b4-${randomUUID().slice(0, 8)}`,
    sourceNeighborId,
    survivorNeighborId,
    irreversibleConfirmationPhrase: 'IRREVERSIBLE MERGE',
    refusalCodes: {
      mergeForbidden: 'CONNECTSHYFT_NEIGHBOR_MERGE_FORBIDDEN',
      confirmationRequired: 'CONNECTSHYFT_NEIGHBOR_MERGE_CONFIRMATION_REQUIRED',
      transactionAborted: 'CONNECTSHYFT_NEIGHBOR_MERGE_TRANSACTION_ABORTED',
    },
    flags: { ...connectShyftContextEnforcementData.flagsAllEnabled },
    paths: {
      neighborsCollection: '/api/v1/connectshyft/neighbors',
      sourceNeighborById: `/api/v1/connectshyft/neighbors/${sourceNeighborId}`,
      survivorNeighborById: `/api/v1/connectshyft/neighbors/${survivorNeighborId}`,
      neighborMerge: '/api/v1/connectshyft/neighbors/merge',
      neighborProfileUi: `/app/connectshyft/neighbors/${survivorNeighborId}`,
    },
  };
}

export function createStoryB4Headers(
  context: StoryB4Context,
  overrides: StoryB4HeaderOverrides = {},
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
