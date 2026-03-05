import { RouteRefusalService } from '../application/refusalService';
import { InMemoryRouteRefusalStore } from '../infrastructure/refusalStore';

describe('route refusal service', () => {
  let store: InMemoryRouteRefusalStore;
  let service: RouteRefusalService;

  beforeEach(() => {
    store = new InMemoryRouteRefusalStore();
    service = new RouteRefusalService(store);
  });

  it('persists intake refusal outcomes for requests and records lifecycle history', async () => {
    const result = await service.issueRequestRefusal({
      tenantId: 'tenant-route-alpha',
      requestId: 'request-route-100',
      reasonCode: 'CAPACITY_FULL',
      reasonMessage: 'Requested slot is fully booked.',
      alternatives: [
        {
          type: 'RESCHEDULE_WINDOW',
          dateLocal: '2026-03-02',
          dayPart: 'morning',
          status: 'open',
        },
      ],
      actorUserId: 'user-staff-1',
      idempotencyKey: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected refusal to persist');
    }

    const history = await service.getRequestHistory({
      tenantId: 'tenant-route-alpha',
      scopeId: 'request-route-100',
    });

    expect(history).toMatchObject({
      ok: true,
      code: 'ROUTE_REQUEST_HISTORY_RESOLVED',
      data: {
        requestId: 'request-route-100',
        events: [
          expect.objectContaining({
            eventType: 'ROUTE_REFUSAL_RECORDED',
            stage: 'intake',
            reasonCode: 'CAPACITY_FULL',
          }),
        ],
      },
    });
  });

  it('persists execution-stage commitment refusals and links them into request history', async () => {
    const result = await service.issueCommitmentRefusal({
      tenantId: 'tenant-route-alpha',
      commitmentId: 'commitment-route-901',
      requestId: 'request-route-901',
      reasonCode: 'RESOURCE_UNAVAILABLE',
      reasonMessage: 'Required crew/resource is unavailable.',
      alternatives: [
        {
          type: 'PARTNER_REFERRAL',
          partnerName: 'Regional Overflow Team',
          contactPhone: '+12605550188',
        },
      ],
      actorUserId: 'user-dispatch-5',
      idempotencyKey: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected commitment refusal to persist');
    }

    const commitmentHistory = await service.getCommitmentHistory({
      tenantId: 'tenant-route-alpha',
      scopeId: 'commitment-route-901',
    });
    expect(commitmentHistory).toMatchObject({
      ok: true,
      data: {
        commitmentId: 'commitment-route-901',
        events: [
          expect.objectContaining({
            eventType: 'ROUTE_REFUSAL_RECORDED',
            stage: 'execution',
            reasonCode: 'RESOURCE_UNAVAILABLE',
          }),
        ],
      },
    });

    const requestHistory = await service.getRequestHistory({
      tenantId: 'tenant-route-alpha',
      scopeId: 'request-route-901',
    });
    expect(requestHistory).toMatchObject({
      ok: true,
      data: {
        requestId: 'request-route-901',
        events: [
          expect.objectContaining({
            eventType: 'ROUTE_COMMITMENT_REFUSAL_LINKED',
            commitmentId: 'commitment-route-901',
          }),
        ],
      },
    });
  });

  it('treats duplicate writes with identical idempotency key as replay without additional history rows', async () => {
    const first = await service.issueRequestRefusal({
      tenantId: 'tenant-route-alpha',
      requestId: 'request-route-200',
      reasonCode: 'DAY_PART_NOT_AVAILABLE',
      reasonMessage: 'Morning window is unavailable.',
      alternatives: [
        {
          type: 'RESCHEDULE_WINDOW',
          dateLocal: '2026-03-05',
          dayPart: 'afternoon',
          status: 'open',
        },
      ],
      actorUserId: 'user-staff-9',
      idempotencyKey: 'idem-route-200',
    });
    const replay = await service.issueRequestRefusal({
      tenantId: 'tenant-route-alpha',
      requestId: 'request-route-200',
      reasonCode: 'DAY_PART_NOT_AVAILABLE',
      reasonMessage: 'Morning window is unavailable.',
      alternatives: [
        {
          type: 'RESCHEDULE_WINDOW',
          dateLocal: '2026-03-05',
          dayPart: 'afternoon',
          status: 'open',
        },
      ],
      actorUserId: 'user-staff-9',
      idempotencyKey: 'idem-route-200',
    });

    expect(first).toMatchObject({
      ok: true,
      data: {
        replayed: false,
      },
    });
    expect(replay).toMatchObject({
      ok: true,
      data: {
        replayed: true,
      },
    });

    const history = await service.getRequestHistory({
      tenantId: 'tenant-route-alpha',
      scopeId: 'request-route-200',
    });
    expect(history).toMatchObject({
      ok: true,
      data: {
        events: [expect.any(Object)],
      },
    });

    if (!history.ok) {
      throw new Error('Expected history to resolve');
    }
    expect((history.data.events as unknown[]).length).toBe(1);
  });

  it('returns business refusal envelope metadata when payload validation fails', async () => {
    const result = await service.issueCommitmentRefusal({
      tenantId: 'tenant-route-alpha',
      commitmentId: 'commitment-route-300',
      requestId: null,
      reasonCode: 'NOT_ELIGIBLE_ZIP',
      reasonMessage: 'Invalid execution refusal reason for this stage.',
      alternatives: [
        {
          type: 'PARTNER_REFERRAL',
          partnerName: 'Regional Partner',
          contactPhone: '+12605550120',
        },
      ],
      actorUserId: 'user-dispatch-2',
      idempotencyKey: null,
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'ROUTE_REFUSAL_VALIDATION_FAILED',
      refusalType: 'business',
      httpStatus: 200,
    });
  });

  it('returns deterministic conflict when idempotency key is reused with a different payload', async () => {
    await service.issueRequestRefusal({
      tenantId: 'tenant-route-alpha',
      requestId: 'request-route-400',
      reasonCode: 'CAPACITY_FULL',
      reasonMessage: 'Capacity is full.',
      alternatives: [
        {
          type: 'RESCHEDULE_WINDOW',
          dateLocal: '2026-03-10',
          dayPart: 'afternoon',
          status: 'open',
        },
      ],
      actorUserId: 'user-staff-10',
      idempotencyKey: 'idem-route-400',
    });

    const conflict = await service.issueRequestRefusal({
      tenantId: 'tenant-route-alpha',
      requestId: 'request-route-400',
      reasonCode: 'DAY_PART_NOT_AVAILABLE',
      reasonMessage: 'Different payload with same key.',
      alternatives: [
        {
          type: 'CALLBACK_PATH',
          queue: 'dispatch-review',
          expectedWithinHours: 24,
        },
      ],
      actorUserId: 'user-staff-10',
      idempotencyKey: 'idem-route-400',
    });

    expect(conflict).toMatchObject({
      ok: false,
      code: 'ROUTE_IDEMPOTENCY_KEY_PAYLOAD_CONFLICT',
      refusalType: 'client',
      httpStatus: 409,
    });
  });
});
