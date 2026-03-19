import { faker } from '@faker-js/faker';
import { randomUUID } from 'node:crypto';
import { connectShyftContextEnforcementData } from '../../fixtures/test-data';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryG4ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryG4HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryG4AddressInput = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
};

export type StoryG4NeighborPhoneInput = {
  label: string;
  value: string;
  isShared?: boolean;
};

export type StoryG4NeighborCreatePayload = {
  orgUnitId: string;
  firstName: string;
  lastName: string;
  phones: StoryG4NeighborPhoneInput[];
  email?: string;
  address?: StoryG4AddressInput;
  prefersTexting?: 'YES' | 'NO' | 'UNKNOWN';
  notes?: string;
};

export type StoryG4ThreadEnsurePayload = {
  orgUnitId: string;
  neighborId: string;
  source: 'DIRECTORY';
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
};

export type StoryG4Context = {
  storyId: 'g-4';
  tenantId: string;
  orgUnitId: string;
  crossScopeOrgUnitId: string;
  role: string;
  userId: string;
  adminUserId: string;
  correlationId: string;
  csrfToken: string;
  flags: ConnectShyftFlags;
  searchTerms: {
    byName: string;
    byPhone: string;
  };
  neighborIds: {
    existing: string;
    newCandidate: string;
  };
  threadIds: {
    existingActive: string;
  };
  testData: {
    primaryPhoneRaw: string;
    additionalPhoneRaw: string;
    primaryPhoneNormalized: string;
  };
  breakpoints: {
    mobile: { width: 390; height: 844 };
    tablet: { width: 834; height: 1112 };
  };
  requiredAddNeighborTestIds: readonly string[];
  requiredDirectoryTestIds: readonly string[];
  paths: {
    neighborsCollection: string;
    threadsCollection: string;
    addNeighborUi: string;
    directoryUi: string;
    threadDetailUi: string;
  };
};

export function createStoryG4Context(
  overrides: StoryG4ContextOverrides = {},
): StoryG4Context {
  return {
    storyId: 'g-4',
    tenantId: overrides.tenantId ?? connectShyftContextEnforcementData.tenantAlphaId,
    orgUnitId: overrides.orgUnitId ?? connectShyftContextEnforcementData.orgUnitAlphaEastId,
    crossScopeOrgUnitId: connectShyftContextEnforcementData.orgUnitAlphaWestId,
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-g4-volunteer',
    adminUserId: 'user-connectshyft-g4-admin',
    correlationId: overrides.correlationId ?? `corr-story-g4-${randomUUID().slice(0, 8)}`,
    csrfToken: overrides.csrfToken ?? `csrf-story-g4-${randomUUID().slice(0, 8)}`,
    flags: { ...connectShyftContextEnforcementData.flagsAllEnabled },
    searchTerms: {
      byName: 'Mina',
      byPhone: '2605550199',
    },
    neighborIds: {
      existing: '5128e0b5-2bd2-4ae4-8297-65e36f631b37',
      newCandidate: 'd3051607-f43b-43c3-8990-8239dbd57943',
    },
    threadIds: {
      existingActive: 'ab3ebb00-e2bc-438f-888b-c33e7966a400',
    },
    testData: {
      primaryPhoneRaw: '+1 (260) 555-0199',
      additionalPhoneRaw: '+1 (260) 555-0120',
      primaryPhoneNormalized: '+12605550199',
    },
    breakpoints: {
      mobile: { width: 390, height: 844 },
      tablet: { width: 834, height: 1112 },
    },
    requiredAddNeighborTestIds: [
      'connectshyft-neighbor-first-name-input',
      'connectshyft-neighbor-last-name-input',
      'connectshyft-neighbor-primary-phone-input',
      'connectshyft-neighbor-additional-phone-input',
      'connectshyft-neighbor-email-input',
      'connectshyft-neighbor-address-line1-input',
      'connectshyft-neighbor-address-city-input',
      'connectshyft-neighbor-address-state-input',
      'connectshyft-neighbor-address-postal-input',
      'connectshyft-neighbor-prefers-texting-toggle',
      'connectshyft-neighbor-shared-phone-toggle',
      'connectshyft-neighbor-notes-textarea',
      'connectshyft-neighbor-submit-action',
    ],
    requiredDirectoryTestIds: [
      'connectshyft-directory-surface',
      'connectshyft-directory-search-input',
      'connectshyft-directory-search-mode-name',
      'connectshyft-directory-search-mode-phone',
      'connectshyft-directory-result-card',
      'connectshyft-directory-result-conference-chip',
      'connectshyft-directory-start-conversation-action',
    ],
    paths: {
      neighborsCollection: '/api/v1/connectshyft/neighbors',
      threadsCollection: '/api/v1/connectshyft/threads',
      addNeighborUi: '/app/connectshyft/neighbors/new',
      directoryUi: '/app/connectshyft/directory',
      threadDetailUi: '/app/connectshyft/threads',
    },
  };
}

export function createStoryG4Headers(
  context: StoryG4Context,
  overrides: StoryG4HeaderOverrides = {},
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

export function createStoryG4NeighborCreatePayload(
  context: StoryG4Context,
  overrides: Partial<StoryG4NeighborCreatePayload> = {},
): StoryG4NeighborCreatePayload {
  return {
    orgUnitId: context.orgUnitId,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phones: [
      {
        label: 'mobile',
        value: context.testData.primaryPhoneRaw,
        isShared: false,
      },
      {
        label: 'home',
        value: context.testData.additionalPhoneRaw,
        isShared: true,
      },
    ],
    email: faker.internet.email().toLowerCase(),
    address: {
      line1: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      postalCode: faker.location.zipCode('#####'),
    },
    prefersTexting: 'YES',
    notes: 'Volunteer directory intake generated by Story g.4 ATDD factory.',
    ...overrides,
  };
}

export function createStoryG4ThreadEnsurePayload(
  context: StoryG4Context,
  overrides: Partial<StoryG4ThreadEnsurePayload> = {},
): StoryG4ThreadEnsurePayload {
  return {
    orgUnitId: context.orgUnitId,
    neighborId: context.neighborIds.existing,
    source: 'DIRECTORY',
    lastInboundCsNumberId: '+12605550111',
    preferredOutboundCsNumberId: '+12605550111',
    ...overrides,
  };
}
