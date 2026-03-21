// @ts-nocheck
import request from 'supertest';
import db from '../../../../config/knex';
import * as canonicalEventsModule from '../../../../modules/connectshyft/canonicalEvents';
import * as identityResolverModule from '../../../../modules/connectshyft/identityResolver';
import * as neighborsModule from '../../../../modules/connectshyft/neighbors';
import { AsyncConnectShyftNeighborService } from '../../../../modules/connectshyft/neighbors';
import {
  connectShyftNumberMappingServiceAsync,
  type ConnectShyftNumberMapping,
} from '../../../../modules/connectshyft/numberMappings';
import { AsyncConnectShyftThreadService } from '../../../../modules/connectshyft/threads';
import {
  buildApp,
  buildHeaders,
  type CanonicalEventRecord,
  expectProviderSpecificLeakageRemoved,
  registerProviderRegistryRouteIntegrationHooks,
  sortCanonical,
} from './connectshyft.provider-registry.test.shared';

const mockInboundSmsPersistence = (input?: {
  ensuredNeighborId?: string;
  ensuredThreadId?: string;
  failOnTextingPreferenceCall?: boolean;
}) => {
  const originalTransaction = db.transaction;
  const mockedTransaction = jest.fn(async (handler: any) =>
    handler({
      fn: {
        now: () => new Date('2026-03-18T12:00:00.000Z'),
      },
    }));
  Object.defineProperty(db, 'transaction', {
    value: mockedTransaction,
  });
  const ensureThreadSpy = jest.spyOn(
    AsyncConnectShyftThreadService.prototype,
    'ensureThread',
  ).mockResolvedValue({
    ok: true,
    code: 'CONNECTSHYFT_THREAD_ENSURED',
    httpStatus: 200,
    data: {
      thread: {
        threadId: input?.ensuredThreadId || '00000000-0000-4000-8000-000000000111',
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        neighborId: input?.ensuredNeighborId || 'neighbor-inbound',
        state: 'UNCLAIMED',
        summary: '',
        escalationStage: 0,
        nextEvaluationAtUtc: null,
        lastInboundCsNumberId: '+12605550191',
        preferredOutboundCsNumberId: '+12605550191',
        claimedByUserId: null,
        createdAtUtc: '2026-03-18T12:00:00.000Z',
        updatedAtUtc: '2026-03-18T12:00:00.000Z',
      },
    },
  } as any);
  const canonicalEventSpy = jest.spyOn(
    canonicalEventsModule,
    'recordConnectShyftCanonicalEvent',
  ).mockResolvedValue({
    eventId: 'canonical-event-inbound-1',
    aggregateId: input?.ensuredThreadId || '00000000-0000-4000-8000-000000000111',
    aggregateType: 'Thread',
    eventType: 'connectshyft.inbound.sms_appended',
    payload: {},
    occurredAtUtc: '2026-03-18T12:00:00.000Z',
  } as any);
  const textingPreferenceSpy = jest.spyOn(
    AsyncConnectShyftNeighborService.prototype,
    'applyInboundSmsTextingPreference',
  ).mockImplementation(async () => {
    if (input?.failOnTextingPreferenceCall) {
      throw new Error('synthetic neighbor IDs must not trigger texting-preference promotion');
    }

    return {
      ok: true,
      updated: true,
      neighbor: {
        neighborId: input?.ensuredNeighborId || 'neighbor-inbound',
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        firstName: '',
        lastName: '',
        prefersTexting: 'YES',
        phones: [],
        createdAtUtc: '2026-03-18T12:00:00.000Z',
        updatedAtUtc: '2026-03-18T12:00:00.000Z',
      },
    } as any;
  });

  return {
    textingPreferenceSpy,
    restore: () => {
      textingPreferenceSpy.mockRestore();
      canonicalEventSpy.mockRestore();
      ensureThreadSpy.mockRestore();
      Object.defineProperty(db, 'transaction', {
        value: originalTransaction,
      });
    },
  };
};

const buildNumberMapping = (
  overrides: Partial<ConnectShyftNumberMapping> & Pick<
    ConnectShyftNumberMapping,
    'mappingId' | 'tenantId' | 'orgUnitId' | 'twilioNumberE164' | 'label'
  >,
): ConnectShyftNumberMapping => ({
  mappingId: overrides.mappingId,
  tenantId: overrides.tenantId,
  orgUnitId: overrides.orgUnitId,
  twilioNumberE164: overrides.twilioNumberE164,
  label: overrides.label,
  isActive: overrides.isActive ?? true,
  createdAtUtc: overrides.createdAtUtc ?? '2026-03-18T12:00:00.000Z',
  updatedAtUtc: overrides.updatedAtUtc ?? '2026-03-18T12:00:00.000Z',
});

const buildTenantOrgUnitKey = (tenantId: string, orgUnitId: string): string =>
  `${tenantId}::${orgUnitId}`;

const cloneMappings = (
  mappings: readonly ConnectShyftNumberMapping[],
): ConnectShyftNumberMapping[] => [...mappings]
  .map((mapping) => ({ ...mapping }))
  .sort((left, right) => {
    if (left.twilioNumberE164 !== right.twilioNumberE164) {
      return left.twilioNumberE164.localeCompare(right.twilioNumberE164);
    }
    return left.mappingId.localeCompare(right.mappingId);
  });

const resolveRoutingMappingByNumberFromState = (
  mappingsByScope: Map<string, ConnectShyftNumberMapping[]>,
  input: {
    tenantId: string | null;
    twilioNumberE164: string;
  },
) => {
  const tenantId = typeof input.tenantId === 'string' ? input.tenantId : null;
  const matches = Array.from(mappingsByScope.values())
    .flat()
    .filter((mapping) => mapping.isActive && mapping.twilioNumberE164 === input.twilioNumberE164)
    .filter((mapping) => tenantId ? mapping.tenantId === tenantId : true);

  if (matches.length === 1) {
    return {
      status: 'found' as const,
      mapping: { ...matches[0] },
    };
  }

  if (matches.length > 1) {
    return {
      status: 'ambiguous' as const,
      mappings: matches.map((mapping) => ({ ...mapping })),
    };
  }

  return {
    status: 'not-found' as const,
  };
};

const buildDefaultNumberMappingState = (): Map<string, ConnectShyftNumberMapping[]> => new Map([
  [
    buildTenantOrgUnitKey('tenant-connectshyft-f1', 'org-connectshyft-f1-east'),
    cloneMappings([
      buildNumberMapping({
        mappingId: 'mapping-f1-001',
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        twilioNumberE164: '+12605550191',
        label: 'Front Desk',
      }),
    ]),
  ],
  [
    buildTenantOrgUnitKey('tenant-connectshyft-f2', 'org-connectshyft-f2-east'),
    cloneMappings([
      buildNumberMapping({
        mappingId: 'mapping-f2-001',
        tenantId: 'tenant-connectshyft-f2',
        orgUnitId: 'org-connectshyft-f2-east',
        twilioNumberE164: '+12605550192',
        label: 'F2 East Primary',
      }),
    ]),
  ],
]);
describe('connectshyft provider adapter registry route integration - dispatch and canonical events', () => {
  registerProviderRegistryRouteIntegrationHooks();
  let numberMappingsByScope: Map<string, ConnectShyftNumberMapping[]>;
  let listMappingsSpy: jest.SpyInstance;
  let resolveRoutingMappingByNumberSpy: jest.SpyInstance;
  let createMappingSpy: jest.SpyInstance;
  let updateMappingSpy: jest.SpyInstance;

  beforeEach(() => {
    numberMappingsByScope = buildDefaultNumberMappingState();

    listMappingsSpy = jest.spyOn(connectShyftNumberMappingServiceAsync, 'listMappings').mockImplementation(
      async (tenantId: string, orgUnitId: string) =>
        cloneMappings(numberMappingsByScope.get(buildTenantOrgUnitKey(tenantId, orgUnitId)) || []),
    );
    resolveRoutingMappingByNumberSpy = jest.spyOn(
      connectShyftNumberMappingServiceAsync,
      'resolveRoutingMappingByNumber',
    ).mockImplementation(async (input) => resolveRoutingMappingByNumberFromState(numberMappingsByScope, input));

    createMappingSpy = jest.spyOn(connectShyftNumberMappingServiceAsync, 'createMapping').mockImplementation(
      async (input) => {
        const scopeKey = buildTenantOrgUnitKey(input.tenantId, input.orgUnitId);
        const nextMapping = buildNumberMapping({
          mappingId: input.mappingId || `mapping-${input.tenantId}-${input.orgUnitId}-${input.twilioNumberE164}`,
          tenantId: input.tenantId,
          orgUnitId: input.orgUnitId,
          twilioNumberE164: input.twilioNumberE164,
          label: input.label,
          isActive: input.isActive,
        });
        const nextMappings = cloneMappings([
          ...(numberMappingsByScope.get(scopeKey) || []),
          nextMapping,
        ]);
        numberMappingsByScope.set(scopeKey, nextMappings);

        return {
          ok: true as const,
          code: 'CONNECTSHYFT_NUMBER_MAPPING_SAVED' as const,
          httpStatus: 201 as const,
          data: {
            mappingId: nextMapping.mappingId,
            orgUnitId: nextMapping.orgUnitId,
            twilioNumberE164: nextMapping.twilioNumberE164,
            label: nextMapping.label,
            isActive: nextMapping.isActive,
            mappings: cloneMappings(nextMappings),
          },
        };
      },
    );

    updateMappingSpy = jest.spyOn(connectShyftNumberMappingServiceAsync, 'updateMapping').mockImplementation(
      async (input) => {
        const scopeKey = buildTenantOrgUnitKey(input.tenantId, input.orgUnitId);
        const currentMappings = numberMappingsByScope.get(scopeKey) || [];
        const existing = currentMappings.find((mapping) => mapping.mappingId === input.mappingId);
        if (!existing) {
          return {
            ok: false as const,
            code: 'CONNECTSHYFT_NUMBER_MAPPING_NOT_FOUND' as const,
            message: 'Number mapping not found for this tenant and orgUnit.',
          };
        }

        const nextMappings = cloneMappings(currentMappings.map((mapping) => (
          mapping.mappingId === input.mappingId
            ? {
              ...mapping,
              twilioNumberE164: input.twilioNumberE164,
              label: input.label,
              isActive: input.isActive,
              updatedAtUtc: '2026-03-18T12:00:00.000Z',
            }
            : mapping
        )));
        const updated = nextMappings.find((mapping) => mapping.mappingId === input.mappingId)!;
        numberMappingsByScope.set(scopeKey, nextMappings);

        return {
          ok: true as const,
          code: 'CONNECTSHYFT_NUMBER_MAPPING_UPDATED' as const,
          httpStatus: 200 as const,
          data: {
            mappingId: updated.mappingId,
            orgUnitId: updated.orgUnitId,
            twilioNumberE164: updated.twilioNumberE164,
            label: updated.label,
            isActive: updated.isActive,
            mappings: cloneMappings(nextMappings),
          },
        };
      },
    );
  });

  afterEach(() => {
    updateMappingSpy.mockRestore();
    createMappingSpy.mockRestore();
    resolveRoutingMappingByNumberSpy.mockRestore();
    listMappingsSpy.mockRestore();
  });

  it('dispatches outbound call through deterministic provider adapter resolution metadata', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/threads/thread-f1-unclaimed-1001/call')
      .set(buildHeaders())
      .send({
        orgUnitId: 'org-connectshyft-f1-east',
        providerKey: 'telnyx',
        targetPhone: '+12605550199',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
      data: {
        providerResolution: {
          requestedProvider: 'telnyx',
          resolvedProvider: 'telnyx',
          deterministic: true,
          adapterInterfaceVersion: 'v1',
          providerBranchingInDomain: false,
        },
        dispatch: {
          channel: 'call',
          dispatchContext: {
            targetPhone: '+12605550199',
            messageBodyProvided: false,
          },
          adapterInvoked: true,
          providerBranchingInDomain: false,
        },
      },
    });
  });

  it('refuses mine bucket reads when actor context is missing', async () => {
    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/inbox')
      .query({
        bucket: 'mine',
      })
      .set(buildHeaders({
        'x-test-connectshyft-user-id': '   ',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ACTOR_CONTEXT_REQUIRED',
      refusalType: 'business',
      data: {
        bucket: 'mine',
      },
    });
  });

  it('prefers canonical neighborId metadata over thread correlation for inbound SMS', async () => {
    const app = buildApp();
    const { restore } = mockInboundSmsPersistence({
      ensuredNeighborId: '00000000-0000-4000-8000-000000000101',
    });
    const resolveActiveSpy = jest.spyOn(neighborsModule, 'resolveActiveNeighborForInbound')
      .mockResolvedValueOnce({
        neighborId: '00000000-0000-4000-8000-000000000101',
      } as any);
    const resolveSubjectSpy = jest.spyOn(identityResolverModule, 'resolveSubjectByContactPoint');

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/inbound')
        .set(buildHeaders())
        .send({
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          threadId: 'thread-f1-unclaimed-1001',
          eventType: 'sms.inbound',
          neighborId: '00000000-0000-4000-8000-000000000101',
          from: '+12605559991',
          to: '+12605550191',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        data: {
          correlation: {
            neighborId: '00000000-0000-4000-8000-000000000101',
          },
        },
      });
      expect(resolveActiveSpy).toHaveBeenCalledTimes(1);
      expect(resolveSubjectSpy).not.toHaveBeenCalled();
    } finally {
      resolveSubjectSpy.mockRestore();
      resolveActiveSpy.mockRestore();
      restore();
    }
  });

  it('uses thread correlation before phone matching for inbound SMS', async () => {
    const app = buildApp();
    const { restore } = mockInboundSmsPersistence({
      ensuredNeighborId: 'neighbor-connectshyft-f1-1001',
    });
    const resolveActiveSpy = jest.spyOn(neighborsModule, 'resolveActiveNeighborForInbound');
    const resolveSubjectSpy = jest.spyOn(identityResolverModule, 'resolveSubjectByContactPoint');

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/inbound')
        .set(buildHeaders())
        .send({
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          threadId: 'thread-f1-unclaimed-1001',
          eventType: 'sms.inbound',
          from: '+12605551004',
          to: '+12605550191',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        data: {
          correlation: {
            neighborId: 'neighbor-connectshyft-f1-1001',
          },
        },
      });
      expect(resolveActiveSpy).not.toHaveBeenCalled();
      expect(resolveSubjectSpy).not.toHaveBeenCalled();
    } finally {
      resolveSubjectSpy.mockRestore();
      resolveActiveSpy.mockRestore();
      restore();
    }
  });

  it('records projection-ready outbound sms canonical payloads for timeline reads', async () => {
    const app = buildApp();
    const canonicalEventSpy = jest.spyOn(
      canonicalEventsModule,
      'recordConnectShyftCanonicalEvent',
    ).mockResolvedValue({
      eventId: 'canonical-event-outbound-1',
      aggregateId: 'thread-f1-unclaimed-1001',
      aggregateType: 'Thread',
      eventType: 'MessageQueued',
      payload: {},
      occurredAtUtc: '2026-03-18T12:00:00.000Z',
    } as any);

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/threads/thread-f1-unclaimed-1001/messages')
        .set(buildHeaders())
        .send({
          orgUnitId: 'org-connectshyft-f1-east',
          providerKey: 'telnyx',
          channel: 'sms',
          body: 'Projection-ready outbound message',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
      });
      expect(canonicalEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        aggregateId: 'thread-f1-unclaimed-1001',
        eventType: 'MessageQueued',
        payload: expect.objectContaining({
          direction: 'outbound',
          channel: 'sms',
          actor: 'user',
          eventName: 'connectshyft.outbound.sms_appended',
          lifecycleEvent: 'connectshyft.thread.outbound_message_dispatched',
          outboundMessageArtifact: expect.objectContaining({
            direction: 'outbound',
            channel: 'sms',
            body: 'Projection-ready outbound message',
          }),
        }),
      }));

      const recordedPayload = canonicalEventSpy.mock.calls[0]?.[0]?.payload as Record<string, unknown>;
      const outboundArtifact = recordedPayload?.outboundMessageArtifact as Record<string, unknown>;
      expect(Object.prototype.hasOwnProperty.call(outboundArtifact, 'from')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(outboundArtifact, 'to')).toBe(true);
    } finally {
      canonicalEventSpy.mockRestore();
    }
  });

  it('reuses a unique phone match and avoids creating duplicate neighbors', async () => {
    const app = buildApp();
    const { restore } = mockInboundSmsPersistence({
      ensuredNeighborId: 'neighbor-phone-match-1005',
    });
    const resolveActiveSpy = jest.spyOn(neighborsModule, 'resolveActiveNeighborForInbound')
      .mockResolvedValue(null);
    const resolveSubjectSpy = jest.spyOn(identityResolverModule, 'resolveSubjectByContactPoint')
      .mockResolvedValue({
        type: 'single_match',
        neighborId: 'neighbor-phone-match-1005',
        normalizedContactPoint: '+12605551005',
      });
    const createNeighborSpy = jest.spyOn(neighborsModule, 'createNeighborFromInbound');

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/inbound')
        .set(buildHeaders())
        .send({
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          threadId: 'sms-phone-match-thread-1005',
          eventType: 'sms.inbound',
          from: '(260) 555-1005',
          to: '+12605550191',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        data: {
          correlation: {
            neighborId: 'neighbor-phone-match-1005',
          },
        },
      });
      expect(createNeighborSpy).not.toHaveBeenCalled();
      expect(resolveSubjectSpy).toHaveBeenCalledWith({
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        contactPoint: '+12605551005',
      });
    } finally {
      createNeighborSpy.mockRestore();
      resolveSubjectSpy.mockRestore();
      resolveActiveSpy.mockRestore();
      restore();
    }
  });

  it('creates a new neighbor when phone resolution finds no active match and promotes UNKNOWN to YES', async () => {
    const app = buildApp();
    const { restore } = mockInboundSmsPersistence({
      ensuredNeighborId: 'neighbor-created-1006',
    });
    const resolveActiveSpy = jest.spyOn(neighborsModule, 'resolveActiveNeighborForInbound')
      .mockResolvedValue(null);
    const resolveSubjectSpy = jest.spyOn(identityResolverModule, 'resolveSubjectByContactPoint')
      .mockResolvedValue({
        type: 'no_match',
        normalizedContactPoint: '+12605551006',
      });
    const createNeighborSpy = jest.spyOn(neighborsModule, 'createNeighborFromInbound')
      .mockResolvedValue({
        ok: true,
        code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
        httpStatus: 201,
        data: {
          neighbor: {
            neighborId: 'neighbor-created-1006',
            tenantId: 'tenant-connectshyft-f1',
            orgUnitId: 'org-connectshyft-f1-east',
            firstName: '',
            lastName: '',
            prefersTexting: 'UNKNOWN',
            phones: [
              {
                phoneId: 'phone-created-1006',
                label: 'mobile',
                value: '+12605551006',
                rawInput: '+12605551006',
                displayNational: '(260) 555-1006',
                countryCode: '1',
                nationalNumber: '2605551006',
                extension: null,
                validationStatus: 'valid',
                usageType: 'unknown',
                source: 'system_generated',
                sortOrder: 0,
                isPrimary: true,
                isShared: false,
                verificationStatus: 'verified',
                isActive: true,
                createdAtUtc: '2026-03-18T12:00:00.000Z',
                updatedAtUtc: '2026-03-18T12:00:00.000Z',
              },
            ],
            createdAtUtc: '2026-03-18T12:00:00.000Z',
            updatedAtUtc: '2026-03-18T12:00:00.000Z',
          },
        },
      } as any);

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/inbound')
        .set(buildHeaders())
        .send({
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          threadId: 'sms-no-match-thread-1006',
          eventType: 'sms.inbound',
          from: '+12605551006',
          to: '+12605550191',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        data: {
          correlation: {
            neighborId: 'neighbor-created-1006',
          },
        },
      });
      expect(createNeighborSpy).toHaveBeenCalledWith(expect.objectContaining({
        phone: '+12605551006',
      }));
    } finally {
      createNeighborSpy.mockRestore();
      resolveSubjectSpy.mockRestore();
      resolveActiveSpy.mockRestore();
      restore();
    }
  });

  it('creates a new neighbor when explicit metadata points to a soft-deleted neighbor', async () => {
    const app = buildApp();
    const { restore } = mockInboundSmsPersistence({
      ensuredNeighborId: 'neighbor-created-1007',
    });
    const resolveActiveSpy = jest.spyOn(neighborsModule, 'resolveActiveNeighborForInbound')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    const resolveSubjectSpy = jest.spyOn(identityResolverModule, 'resolveSubjectByContactPoint')
      .mockResolvedValue({
        type: 'no_match',
        normalizedContactPoint: '+12605551007',
      });
    const createNeighborSpy = jest.spyOn(neighborsModule, 'createNeighborFromInbound')
      .mockResolvedValue({
        ok: true,
        code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
        httpStatus: 201,
        data: {
          neighbor: {
            neighborId: 'neighbor-created-1007',
            tenantId: 'tenant-connectshyft-f1',
            orgUnitId: 'org-connectshyft-f1-east',
            firstName: '',
            lastName: '',
            prefersTexting: 'UNKNOWN',
            phones: [],
            createdAtUtc: '2026-03-18T12:00:00.000Z',
            updatedAtUtc: '2026-03-18T12:00:00.000Z',
          },
        },
      } as any);

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/inbound')
        .set(buildHeaders())
        .send({
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          threadId: 'sms-deleted-metadata-thread-1007',
          eventType: 'sms.inbound',
          neighborId: '00000000-0000-4000-8000-000000000107',
          from: '+12605551007',
          to: '+12605550191',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        data: {
          correlation: {
            neighborId: 'neighbor-created-1007',
          },
        },
      });
      expect(resolveActiveSpy).toHaveBeenCalledTimes(1);
      expect(createNeighborSpy).toHaveBeenCalledWith(expect.objectContaining({
        phone: '+12605551007',
      }));
      expect(resolveSubjectSpy).toHaveBeenCalledWith({
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        contactPoint: '+12605551007',
      });
    } finally {
      createNeighborSpy.mockRestore();
      resolveSubjectSpy.mockRestore();
      resolveActiveSpy.mockRestore();
      restore();
    }
  });

  it('accepts synthetic metadata neighborIds without DB-backed revalidation or texting-preference promotion', async () => {
    const app = buildApp();
    const { restore, textingPreferenceSpy } = mockInboundSmsPersistence({
      ensuredNeighborId: 'neighbor-connectshyft-e5-atdd-e2e-001-1e781b89',
      failOnTextingPreferenceCall: true,
    });
    const resolveActiveSpy = jest.spyOn(neighborsModule, 'resolveActiveNeighborForInbound')
      .mockRejectedValue(new Error('synthetic neighbor IDs must bypass active-neighbor persistence'));
    const resolveSubjectSpy = jest.spyOn(identityResolverModule, 'resolveSubjectByContactPoint');

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/inbound')
        .set(buildHeaders())
        .send({
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          threadId: 'thread-f1-unclaimed-1001',
          eventType: 'sms.inbound',
          neighborId: 'neighbor-connectshyft-e5-atdd-e2e-001-1e781b89',
          from: '+12605551008',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        data: {
          correlation: {
            neighborId: 'neighbor-connectshyft-e5-atdd-e2e-001-1e781b89',
          },
        },
      });
      expect(resolveActiveSpy).not.toHaveBeenCalled();
      expect(textingPreferenceSpy).not.toHaveBeenCalled();
      expect(resolveSubjectSpy).not.toHaveBeenCalled();
    } finally {
      resolveSubjectSpy.mockRestore();
      resolveActiveSpy.mockRestore();
      restore();
    }
  });

  it('accepts synthetic thread-correlated neighborIds without DB-backed revalidation or texting-preference promotion', async () => {
    const app = buildApp();
    const { restore, textingPreferenceSpy } = mockInboundSmsPersistence({
      ensuredNeighborId: 'neighbor-connectshyft-f1-1001',
      failOnTextingPreferenceCall: true,
    });
    const resolveActiveSpy = jest.spyOn(neighborsModule, 'resolveActiveNeighborForInbound')
      .mockRejectedValue(new Error('synthetic thread-correlated neighbors must bypass active-neighbor persistence'));
    const resolveSubjectSpy = jest.spyOn(identityResolverModule, 'resolveSubjectByContactPoint');

    try {
      const response = await request(app)
        .post('/api/v1/connectshyft/webhooks/inbound')
        .set(buildHeaders())
        .send({
          tenantId: 'tenant-connectshyft-f1',
          orgUnitId: 'org-connectshyft-f1-east',
          threadId: 'thread-f1-unclaimed-1001',
          eventType: 'sms.inbound',
          from: '+12605551009',
          to: '+12605550191',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        data: {
          correlation: {
            neighborId: 'neighbor-connectshyft-f1-1001',
          },
        },
      });
      expect(resolveActiveSpy).not.toHaveBeenCalled();
      expect(textingPreferenceSpy).not.toHaveBeenCalled();
      expect(resolveSubjectSpy).not.toHaveBeenCalled();
    } finally {
      resolveSubjectSpy.mockRestore();
      resolveActiveSpy.mockRestore();
      restore();
    }
  });

  it('records canonical outbound and inbound events and lists deterministic provider-neutral records', async () => {
    const app = buildApp();
    const headers = buildHeaders({
      'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f2',
      'x-test-connectshyft-orgunit-id': 'org-connectshyft-f2-east',
      'x-test-connectshyft-user-id': 'user-connectshyft-f2-operator',
      'x-test-connectshyft-orgunit-memberships': JSON.stringify(['org-connectshyft-f2-east']),
    });
    const adminHeaders = buildHeaders({
      'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f2',
      'x-test-connectshyft-orgunit-id': 'org-connectshyft-f2-east',
      'x-test-connectshyft-role': 'ORGUNIT_ADMIN',
      'x-test-connectshyft-user-id': 'user-connectshyft-f2-admin',
      'x-test-connectshyft-orgunit-memberships': JSON.stringify(['org-connectshyft-f2-east']),
    });

    const threadId = 'thread-f2-unclaimed-1001';

    const listMappingsResponse = await request(app)
      .get('/api/v1/connectshyft/numbers')
      .query({
        orgUnitId: 'org-connectshyft-f2-east',
      })
      .set(adminHeaders);
    expect(listMappingsResponse.status).toBe(200);
    expect(listMappingsResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NUMBER_MAPPINGS_RESOLVED',
    });

    let mappings = listMappingsResponse.body.data.mappings ?? [];
    if (mappings.length === 0) {
      const numberMappingResponse = await request(app)
        .post('/api/v1/connectshyft/numbers')
        .set(adminHeaders)
        .send({
          orgUnitId: 'org-connectshyft-f2-east',
          providerNumberE164: '+12605550192',
          label: 'F2 East Primary',
          isActive: true,
        });
      expect(numberMappingResponse.status).toBe(201);
      expect(numberMappingResponse.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_NUMBER_MAPPING_SAVED',
        data: {
          orgUnitId: 'org-connectshyft-f2-east',
          isActive: true,
        },
      });
      mappings = numberMappingResponse.body.data.mappings ?? [];
    }

    const selectedMappingId = (
      mappings.find((mapping) => mapping.twilioNumberE164 === '+12605550192')
      || mappings[0]
    ).mappingId;

    for (const mapping of mappings) {
      const shouldBeActive = mapping.mappingId === selectedMappingId;
      if (mapping.isActive === shouldBeActive) {
        continue;
      }

      const updateMappingResponse = await request(app)
        .put(`/api/v1/connectshyft/numbers/${mapping.mappingId}`)
        .set(adminHeaders)
        .send({
          orgUnitId: 'org-connectshyft-f2-east',
          providerNumberE164: mapping.twilioNumberE164,
          label: mapping.label,
          isActive: shouldBeActive,
        });
      expect(updateMappingResponse.status).toBe(200);
      expect(updateMappingResponse.body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_NUMBER_MAPPING_UPDATED',
      });
    }

    const normalizedMappingsResponse = await request(app)
      .get('/api/v1/connectshyft/numbers')
      .query({
        orgUnitId: 'org-connectshyft-f2-east',
      })
      .set(adminHeaders);
    expect(normalizedMappingsResponse.status).toBe(200);

    const activeMappings = (normalizedMappingsResponse.body.data.mappings ?? [])
      .filter((mapping) => mapping.isActive === true);
    expect(activeMappings).toHaveLength(1);

    const callResponse = await request(app)
      .post(`/api/v1/connectshyft/threads/${threadId}/call`)
      .set(headers)
      .send({
        orgUnitId: 'org-connectshyft-f2-east',
        providerKey: 'telnyx',
      });
    expect(callResponse.status).toBe(200);

    const messageResponse = await request(app)
      .post(`/api/v1/connectshyft/threads/${threadId}/messages`)
      .set(headers)
      .send({
        orgUnitId: 'org-connectshyft-f2-east',
        providerKey: 'telnyx',
        channel: 'sms',
        body: 'Story f2 canonical store test message.',
      });
    expect(messageResponse.status).toBe(200);
    expect(messageResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
    });

    const webhookResponse = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(headers)
      .send({
        eventType: 'voice.connected',
        threadId,
        orgUnitId: 'org-connectshyft-f2-east',
        tenantId: 'tenant-connectshyft-f2',
        providerKey: 'telnyx',
        providerEventId: 'provider-event-f2-1001',
        providerPayload: {
          telnyxCallControlId: 'telnyx-hidden',
          twilioCallSid: 'twilio-hidden',
        },
      });

    expect(webhookResponse.status).toBe(200);
    expect(webhookResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      data: {
        canonicalTranslation: {
          eventType: 'CallConnected',
          providerNeutral: true,
          providerSpecificFieldsStripped: true,
        },
        domainHandlers: {
          providerBranchingInDomain: false,
        },
      },
    });

    const eventsResponse = await request(app)
      .get('/api/v1/connectshyft/events')
      .query({
        orgUnitId: 'org-connectshyft-f2-east',
        aggregateId: threadId,
        aggregateType: 'Thread',
        limit: '50',
      })
      .set(headers);

    expect(eventsResponse.status).toBe(200);
    expect(eventsResponse.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_CANONICAL_EVENTS_LISTED',
      data: {
        deterministic: true,
        providerNeutral: true,
        filters: {
          aggregateId: threadId,
          aggregateType: 'Thread',
        },
      },
    });

    const events = eventsResponse.body.data.events as CanonicalEventRecord[];
    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events).toEqual(sortCanonical(events));
    expect(events.map((event) => event.eventType)).toEqual(expect.arrayContaining([
      'CallAttemptStarted',
      'MessageQueued',
      'CallConnected',
    ]));

    events.forEach((event) => {
      expect(event.aggregateId).toBe(threadId);
      expect(event.aggregateType).toBe('Thread');
      expectProviderSpecificLeakageRemoved(event.payload);
    });

    const outboundSmsEvent = events.find((event) =>
      event.eventType === 'MessageQueued'
      && event.payload?.eventName === 'connectshyft.outbound.sms_appended',
    );
    expect(outboundSmsEvent).toMatchObject({
      payload: {
        direction: 'outbound',
        channel: 'sms',
        actor: 'user',
        eventName: 'connectshyft.outbound.sms_appended',
        lifecycleEvent: 'connectshyft.thread.outbound_message_dispatched',
        outboundMessageArtifact: {
          body: 'Story f2 canonical store test message.',
        },
      },
    });
  });

  it('filters canonical events by event type deterministically across repeated reads', async () => {
    const app = buildApp();
    const headers = buildHeaders({
      'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f2',
      'x-test-connectshyft-orgunit-id': 'org-connectshyft-f2-east',
      'x-test-connectshyft-user-id': 'user-connectshyft-f2-operator',
      'x-test-connectshyft-orgunit-memberships': JSON.stringify(['org-connectshyft-f2-east']),
    });
    const query = {
      orgUnitId: 'org-connectshyft-f2-east',
      aggregateId: 'thread-f2-unclaimed-1001',
      aggregateType: 'Thread',
      eventType: 'CallConnected',
      limit: '50',
    };

    await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(headers)
      .send({
        eventType: 'voice.connected',
        threadId: 'thread-f2-unclaimed-1001',
        orgUnitId: 'org-connectshyft-f2-east',
        tenantId: 'tenant-connectshyft-f2',
        providerKey: 'telnyx',
      });

    const first = await request(app)
      .get('/api/v1/connectshyft/events')
      .query(query)
      .set(headers);
    const second = await request(app)
      .get('/api/v1/connectshyft/events')
      .query(query)
      .set(headers);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.data.events).toEqual(second.body.data.events);

    const events = first.body.data.events as CanonicalEventRecord[];
    events.forEach((event) => {
      expect(event.eventType).toBe('CallConnected');
      expectProviderSpecificLeakageRemoved(event.payload);
    });
  });

  it('records voice-family canonical webhook payloads with channel=voice', async () => {
    const app = buildApp();
    const headers = buildHeaders({
      'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f2',
      'x-test-connectshyft-orgunit-id': 'org-connectshyft-f2-east',
      'x-test-connectshyft-user-id': 'user-connectshyft-f2-operator',
      'x-test-connectshyft-orgunit-memberships': JSON.stringify(['org-connectshyft-f2-east']),
    });

    const threadId = 'thread-f2-unclaimed-1001';
    const webhookResponse = await request(app)
      .post('/api/v1/connectshyft/webhooks/inbound')
      .set(headers)
      .send({
        eventType: 'voice.fallback',
        threadId,
        orgUnitId: 'org-connectshyft-f2-east',
        tenantId: 'tenant-connectshyft-f2',
        providerKey: 'telnyx',
      });

    expect(webhookResponse.status).toBe(200);

    const eventsResponse = await request(app)
      .get('/api/v1/connectshyft/events')
      .query({
        orgUnitId: 'org-connectshyft-f2-east',
        aggregateId: threadId,
        aggregateType: 'Thread',
        eventType: 'VoiceFallback',
        limit: '10',
      })
      .set(headers);

    expect(eventsResponse.status).toBe(200);
    const events = eventsResponse.body.data.events as CanonicalEventRecord[];
    expect(events.length).toBeGreaterThan(0);
    events.forEach((event) => {
      expect(event.eventType).toBe('VoiceFallback');
      expect(event.payload).toMatchObject({
        direction: 'inbound',
        channel: 'voice',
      });
    });
  });

  it('returns the current thread-not-found refusal for canonical-event synthetic thread ids without thread-detail backing', async () => {
    const app = buildApp();
    const headers = buildHeaders({
      'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f2',
      'x-test-connectshyft-orgunit-id': 'org-connectshyft-f2-east',
      'x-test-connectshyft-user-id': 'user-connectshyft-f2-operator',
      'x-test-connectshyft-orgunit-memberships': JSON.stringify(['org-connectshyft-f2-east']),
    });

    const response = await request(app)
      .get('/api/v1/connectshyft/threads/thread-f2-unclaimed-1001')
      .set(headers);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_NOT_FOUND',
      data: {
        context: {
          tenantId: 'tenant-connectshyft-f2',
          orgUnitId: 'org-connectshyft-f2-east',
          bypassedOrgUnitMembership: false,
        },
      },
    });
  });
});
