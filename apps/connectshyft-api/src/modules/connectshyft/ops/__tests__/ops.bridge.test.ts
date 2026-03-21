// @ts-nocheck
import request from 'supertest';
import type { BridgeSessionAggregate } from '../../../../../../domains/communication';
import * as BridgeSessionsModule from '../../bridgeSessions';
import {
  buildApp,
  buildHeaders,
  registerProviderRegistryRouteIntegrationHooks,
} from '../../../../routes/api/v1/__tests__/connectshyft.provider-registry.test.shared';

registerProviderRegistryRouteIntegrationHooks();

const buildBridgeAggregate = (): BridgeSessionAggregate => ({
  session: {
    id: 'bridge-session-ops-1001',
    tenantId: 'tenant-connectshyft-f1',
    orgUnitId: 'org-connectshyft-f1-east',
    threadId: 'thread-ops-1001',
    operatorParticipantId: 'user-connectshyft-f1-operator',
    neighborParticipantId: 'neighbor-connectshyft-f1-1001',
    operatorContactPointId: '+12605550155',
    neighborContactPointId: '+12605550111',
    selectedOutboundContactPointId: '+12605550191',
    status: 'bridged',
    failureCode: null,
    failureMessage: null,
    endedBy: null,
    idempotencyKey: null,
    auditCorrelationId: null,
    createdAt: new Date('2026-03-21T12:00:00.000Z'),
    updatedAt: new Date('2026-03-21T12:03:00.000Z'),
    completedAt: null,
  },
  operatorLeg: {
    id: 'bridge-leg-operator-1001',
    tenantId: 'tenant-connectshyft-f1',
    orgUnitId: 'org-connectshyft-f1-east',
    bridgeSessionId: 'bridge-session-ops-1001',
    legRole: 'operator',
    contactPointId: '+12605550155',
    providerCallId: 'provider-leg-operator-1001',
    status: 'answered',
    startedAt: new Date('2026-03-21T12:00:00.000Z'),
    answeredAt: new Date('2026-03-21T12:01:00.000Z'),
    endedAt: null,
    failureCode: null,
    failureMessage: null,
    createdAt: new Date('2026-03-21T12:00:00.000Z'),
    updatedAt: new Date('2026-03-21T12:02:00.000Z'),
  },
  neighborLeg: {
    id: 'bridge-leg-neighbor-1001',
    tenantId: 'tenant-connectshyft-f1',
    orgUnitId: 'org-connectshyft-f1-east',
    bridgeSessionId: 'bridge-session-ops-1001',
    legRole: 'neighbor',
    contactPointId: '+12605550111',
    providerCallId: 'provider-leg-neighbor-1001',
    status: 'answered',
    startedAt: new Date('2026-03-21T12:01:00.000Z'),
    answeredAt: new Date('2026-03-21T12:02:30.000Z'),
    endedAt: null,
    failureCode: null,
    failureMessage: null,
    createdAt: new Date('2026-03-21T12:01:00.000Z'),
    updatedAt: new Date('2026-03-21T12:03:00.000Z'),
  },
});

describe('connectshyft ops bridge visibility route', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('surfaces bridge runtime state from the existing bridge-session seam', async () => {
    jest.spyOn(
      BridgeSessionsModule,
      'loadConnectShyftBridgeAggregateBySessionId',
    ).mockResolvedValue(buildBridgeAggregate());

    const response = await request(buildApp())
      .get('/api/v1/connectshyft/ops/bridge/bridge-session-ops-1001')
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_OPS_BRIDGE_VISIBILITY_LOADED',
      data: {
        bridgeId: 'bridge-session-ops-1001',
        status: 'connected',
        operatorLeg: {
          phone: '+12605550155',
          status: 'answered',
        },
        neighborLeg: {
          phone: '+12605550111',
          status: 'answered',
        },
        provider: 'telnyx',
        lastEventAt: '2026-03-21T12:03:00.000Z',
      },
    });
  });

  it('maps operator dialing bridge state to ringing from the runtime seam', async () => {
    jest.spyOn(
      BridgeSessionsModule,
      'loadConnectShyftBridgeAggregateBySessionId',
    ).mockResolvedValue({
      ...buildBridgeAggregate(),
      session: {
        ...buildBridgeAggregate().session,
        status: 'operator_dialing',
      },
      operatorLeg: {
        ...buildBridgeAggregate().operatorLeg,
        status: 'ringing',
      },
      neighborLeg: {
        ...buildBridgeAggregate().neighborLeg,
        status: 'created',
        startedAt: null,
        answeredAt: null,
        updatedAt: new Date('2026-03-21T12:00:30.000Z'),
      },
    });

    const response = await request(buildApp())
      .get('/api/v1/connectshyft/ops/bridge/bridge-session-ops-1001')
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_OPS_BRIDGE_VISIBILITY_LOADED',
      data: {
        bridgeId: 'bridge-session-ops-1001',
        status: 'ringing',
        operatorLeg: {
          phone: '+12605550155',
          status: 'ringing',
        },
        neighborLeg: {
          phone: '+12605550111',
          status: 'created',
        },
        provider: 'telnyx',
      },
    });
  });
});
