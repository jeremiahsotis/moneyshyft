import { randomUUID } from 'node:crypto';
import { connectShyftCapabilityEnvelopeData } from '../../fixtures/test-data';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryG5ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryG5HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

type StoryG5UrlActor = {
  role: string;
  userId: string;
  orgUnitMemberships: string[];
  orgUnitId?: string;
};

export type StoryG5Context = {
  storyId: 'g-5';
  tenantId: string;
  orgUnitId: string;
  role: string;
  userId: string;
  correlationId: string;
  csrfToken: string;
  volunteerUserId: string;
  orgUnitAdminUserId: string;
  tenantViewerUserId: string;
  flags: ConnectShyftFlags;
  breakpoints: {
    mobile: { width: 390; height: 844 };
    tablet: { width: 834; height: 1112 };
    desktop: { width: 1440; height: 900 };
  };
  requiredVolunteerIaTestIds: readonly string[];
  paths: {
    settingsNavigation: string;
    availability: string;
    numbersCollection: string;
    escalationConfig: string;
    moreUi: string;
    moreAvailabilityUi: string;
    moreNumbersUi: string;
    moreEscalationUi: string;
  };
};

export function createStoryG5Context(
  overrides: StoryG5ContextOverrides = {},
): StoryG5Context {
  return {
    storyId: 'g-5',
    tenantId: overrides.tenantId ?? connectShyftCapabilityEnvelopeData.tenantAlphaId,
    orgUnitId: overrides.orgUnitId ?? connectShyftCapabilityEnvelopeData.orgUnitAlphaEastId,
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-g5-volunteer',
    correlationId: overrides.correlationId ?? `corr-story-g5-${randomUUID().slice(0, 8)}`,
    csrfToken: overrides.csrfToken ?? `csrf-story-g5-${randomUUID().slice(0, 8)}`,
    volunteerUserId: 'user-connectshyft-g5-volunteer',
    orgUnitAdminUserId: connectShyftCapabilityEnvelopeData.orgUnitAdminUserId,
    tenantViewerUserId: connectShyftCapabilityEnvelopeData.tenantViewerUserId,
    flags: {
      ...connectShyftCapabilityEnvelopeData.flagsAllEnabled,
    },
    breakpoints: {
      mobile: { width: 390, height: 844 },
      tablet: { width: 834, height: 1112 },
      desktop: { width: 1440, height: 900 },
    },
    requiredVolunteerIaTestIds: [
      'connectshyft-more-option-directory',
      'connectshyft-more-option-settings',
      'connectshyft-more-option-notifications',
      'connectshyft-more-option-display-preferences',
      'connectshyft-more-option-sign-out',
    ],
    paths: {
      settingsNavigation: '/api/v1/connectshyft/settings/navigation',
      availability: '/api/v1/connectshyft/availability',
      numbersCollection: '/api/v1/connectshyft/numbers',
      escalationConfig: '/api/v1/connectshyft/escalation/config',
      moreUi: '/app/connectshyft/settings',
      moreAvailabilityUi: '/app/connectshyft/settings/availability',
      moreNumbersUi: '/app/connectshyft/settings/numbers',
      moreEscalationUi: '/app/connectshyft/settings/escalation',
    },
  };
}

export function createStoryG5Headers(
  context: StoryG5Context,
  overrides: StoryG5HeaderOverrides = {},
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

export const buildStoryG5UrlParams = (
  context: StoryG5Context,
  actor: StoryG5UrlActor,
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: actor.orgUnitId ?? context.orgUnitId,
    actorUserId: actor.userId,
    tenantRole: actor.role,
    orgUnitMemberships: actor.orgUnitMemberships.join(','),
  });

  return params.toString();
};

export const buildStoryG5MoreUrl = (
  context: StoryG5Context,
  actor: StoryG5UrlActor,
): string => {
  return `${context.paths.moreUi}?${buildStoryG5UrlParams(context, actor)}`;
};

export const buildStoryG5AdminPathUrl = (
  context: StoryG5Context,
  adminPath: string,
  actor: StoryG5UrlActor,
): string => {
  return `${adminPath}?${buildStoryG5UrlParams(context, actor)}`;
};
