import {
  ConnectShyftThreadService,
  InMemoryConnectShyftThreadStore,
} from '../threads';

describe('connectshyft thread service', () => {
  let store: InMemoryConnectShyftThreadStore;
  let service: ConnectShyftThreadService;

  beforeEach(() => {
    store = new InMemoryConnectShyftThreadStore();
    service = new ConnectShyftThreadService(store);
  });

  it('ensures canonical UNCLAIMED thread state and required lifecycle metadata fields', () => {
    const result = service.ensureThread({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      neighborId: 'neighbor-connectshyft-c1-1001',
      source: 'VOICE',
      lastInboundCsNumberId: 'cs-inbound-c1-001',
      preferredOutboundCsNumberId: 'cs-outbound-c1-001',
    });

    expect(result).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_ENSURED',
      httpStatus: 201,
      data: {
        thread: {
          tenantId: 'tenant-connectshyft-c1',
          orgUnitId: 'org-connectshyft-c1-east',
          neighborId: 'neighbor-connectshyft-c1-1001',
          state: 'UNCLAIMED',
          lastInboundCsNumberId: 'cs-inbound-c1-001',
          preferredOutboundCsNumberId: 'cs-outbound-c1-001',
          claimedByUserId: null,
          claimedAtUtc: null,
          closedByUserId: null,
          closedAtUtc: null,
          escalation: {
            stage: 0,
            nextEvaluationAtUtc: expect.any(String),
          },
        },
      },
    });

    if (!result.ok) {
      throw new Error('Expected ensureThread to succeed');
    }

    expect(['UNCLAIMED', 'CLAIMED', 'CLOSED']).toContain(result.data.thread.state);
    expect(result.data.thread.escalation.nextEvaluationAtUtc).toEqual(expect.any(String));
    const dueTimestamp = result.data.thread.escalation.nextEvaluationAtUtc as string;
    expect(new Date(dueTimestamp).toISOString()).toBe(dueTimestamp);
  });

  it('refuses lifecycle state transitions through ensureThread even for valid canonical states', () => {
    const result = service.ensureThread({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      neighborId: 'neighbor-connectshyft-c1-1001',
      source: 'VOICE',
      forcedState: 'CLAIMED',
      actorUserId: 'user-connectshyft-c1-operator',
      lastInboundCsNumberId: 'cs-inbound-c1-001',
      preferredOutboundCsNumberId: 'cs-outbound-c1-001',
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_TRANSITION_FORBIDDEN',
      message: expect.stringContaining('POST /threads only supports UNCLAIMED'),
    });
  });

  it('keeps one active thread identity under duplicate ensure attempts for the same tenant-orgUnit-neighbor tuple', () => {
    const first = service.ensureThread({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      neighborId: 'neighbor-connectshyft-c1-1001',
      source: 'VOICE',
      lastInboundCsNumberId: 'cs-inbound-c1-001',
      preferredOutboundCsNumberId: 'cs-outbound-c1-001',
      threadId: 'thread-c1-duplicate-check',
    });

    const second = service.ensureThread({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      neighborId: 'neighbor-connectshyft-c1-1001',
      source: 'VOICE',
      lastInboundCsNumberId: 'cs-inbound-c1-002',
      preferredOutboundCsNumberId: 'cs-outbound-c1-002',
      threadId: 'thread-c1-duplicate-check-secondary',
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      throw new Error('Expected both ensure attempts to succeed');
    }

    expect(first.data.thread.threadId).toBe(second.data.thread.threadId);
    expect(second.data.thread.state).toBe('UNCLAIMED');

    const dueThreads = service.listDueThreads({
      actorRoles: ['TENANT_STAFF'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      limit: 50,
    });

    expect(dueThreads.ok).toBe(true);
    if (!dueThreads.ok) {
      throw new Error('Expected due-thread listing to succeed');
    }
    expect(dueThreads.data.threads).toHaveLength(1);
  });

  it('rejects non-canonical forced state values with deterministic refusal contracts', () => {
    const result = service.ensureThread({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      neighborId: 'neighbor-connectshyft-c1-1001',
      source: 'VOICE',
      forcedState: 'PAUSED',
      lastInboundCsNumberId: 'cs-inbound-c1-001',
      preferredOutboundCsNumberId: 'cs-outbound-c1-001',
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_STATE_INVALID',
      message: expect.stringContaining('canonical lifecycle state'),
    });
  });

  it('returns due-thread scans in deterministic next_evaluation_at_utc then thread_id order', () => {
    service.ensureThread({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      neighborId: 'neighbor-connectshyft-c1-2001',
      source: 'VOICE',
      threadId: 'thread-c1-b',
      nextEvaluationAtUtc: '2026-02-24T14:00:00.000Z',
      lastInboundCsNumberId: 'cs-inbound-c1-010',
      preferredOutboundCsNumberId: 'cs-outbound-c1-010',
    });
    service.ensureThread({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      neighborId: 'neighbor-connectshyft-c1-2002',
      source: 'VOICE',
      threadId: 'thread-c1-a',
      nextEvaluationAtUtc: '2026-02-24T14:00:00.000Z',
      lastInboundCsNumberId: 'cs-inbound-c1-011',
      preferredOutboundCsNumberId: 'cs-outbound-c1-011',
    });
    service.ensureThread({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      neighborId: 'neighbor-connectshyft-c1-2003',
      source: 'VOICE',
      threadId: 'thread-c1-c',
      nextEvaluationAtUtc: '2026-02-24T13:30:00.000Z',
      lastInboundCsNumberId: 'cs-inbound-c1-012',
      preferredOutboundCsNumberId: 'cs-outbound-c1-012',
    });

    const dueThreads = service.listDueThreads({
      actorRoles: ['TENANT_STAFF'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      limit: 50,
    });

    expect(dueThreads.ok).toBe(true);
    if (!dueThreads.ok) {
      throw new Error('Expected due-thread listing to succeed');
    }

    expect(dueThreads.data.threads.map((thread) => thread.threadId)).toEqual([
      'thread-c1-c',
      'thread-c1-a',
      'thread-c1-b',
    ]);
  });

  it('aligns lifecycle nullable fields with canonical state transitions', () => {
    const ensured = service.ensureThread({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      neighborId: 'neighbor-connectshyft-c1-3001',
      source: 'VOICE',
      threadId: 'thread-c1-lifecycle',
      lastInboundCsNumberId: 'cs-inbound-c1-020',
      preferredOutboundCsNumberId: 'cs-outbound-c1-020',
    });

    if (!ensured.ok) {
      throw new Error('Expected ensureThread to succeed');
    }

    const claimed = service.transitionThreadState({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      threadId: ensured.data.thread.threadId,
      nextState: 'CLAIMED',
      actorUserId: 'user-connectshyft-c1-operator',
    });

    expect(claimed.ok).toBe(true);
    if (!claimed.ok) {
      throw new Error('Expected CLAIMED transition to succeed');
    }
    expect(claimed.data.thread.state).toBe('CLAIMED');
    expect(claimed.data.thread.claimedByUserId).toBe('user-connectshyft-c1-operator');
    expect(claimed.data.thread.claimedAtUtc).toEqual(expect.any(String));
    expect(claimed.data.thread.closedByUserId).toBeNull();
    expect(claimed.data.thread.closedAtUtc).toBeNull();
    expect(claimed.data.thread.escalation.nextEvaluationAtUtc).toBeNull();

    const closed = service.transitionThreadState({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      threadId: ensured.data.thread.threadId,
      nextState: 'CLOSED',
      actorUserId: 'user-connectshyft-c1-supervisor',
    });

    expect(closed.ok).toBe(true);
    if (!closed.ok) {
      throw new Error('Expected CLOSED transition to succeed');
    }
    expect(closed.data.thread.state).toBe('CLOSED');
    expect(closed.data.thread.closedByUserId).toBe('user-connectshyft-c1-supervisor');
    expect(closed.data.thread.closedAtUtc).toEqual(expect.any(String));
    expect(closed.data.thread.escalation.nextEvaluationAtUtc).toBeNull();

    const reopened = service.transitionThreadState({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      threadId: ensured.data.thread.threadId,
      nextState: 'UNCLAIMED',
    });

    expect(reopened.ok).toBe(true);
    if (!reopened.ok) {
      throw new Error('Expected UNCLAIMED transition to succeed');
    }
    expect(reopened.data.thread.state).toBe('UNCLAIMED');
    expect(reopened.data.thread.claimedByUserId).toBeNull();
    expect(reopened.data.thread.claimedAtUtc).toBeNull();
    expect(reopened.data.thread.closedByUserId).toBeNull();
    expect(reopened.data.thread.closedAtUtc).toBeNull();
    expect(reopened.data.thread.escalation.nextEvaluationAtUtc).toEqual(expect.any(String));
  });
});

describe('connectshyft thread persistence guards', () => {
  it('allows a new active thread after the previous one is closed', () => {
    const store = new InMemoryConnectShyftThreadStore();
    const service = new ConnectShyftThreadService(store);

    const first = service.ensureThread({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      neighborId: 'neighbor-connectshyft-c1-4001',
      source: 'VOICE',
      threadId: 'thread-c1-first',
      lastInboundCsNumberId: 'cs-inbound-c1-030',
      preferredOutboundCsNumberId: 'cs-outbound-c1-030',
    });

    if (!first.ok) {
      throw new Error('Expected first ensure to succeed');
    }

    const closed = service.transitionThreadState({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      threadId: first.data.thread.threadId,
      nextState: 'CLOSED',
      actorUserId: 'user-connectshyft-c1-supervisor',
    });

    expect(closed.ok).toBe(true);

    const second = service.ensureThread({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      neighborId: 'neighbor-connectshyft-c1-4001',
      source: 'VOICE',
      threadId: 'thread-c1-second',
      lastInboundCsNumberId: 'cs-inbound-c1-031',
      preferredOutboundCsNumberId: 'cs-outbound-c1-031',
    });

    expect(second.ok).toBe(true);
    if (!second.ok) {
      throw new Error('Expected second ensure to succeed');
    }

    expect(second.data.thread.threadId).toBe('thread-c1-second');
  });
});
