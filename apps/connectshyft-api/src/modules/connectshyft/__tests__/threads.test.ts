import {
  AsyncConnectShyftThreadService,
  ConnectShyftThreadService,
  InMemoryConnectShyftThreadStore,
  evaluateConnectShyftLifecyclePolicy,
} from '../threads';
import { resolveSenderNumber } from '../senderNumberResolver';

const withRequiredPersonId = <T extends { neighborId: string; personId?: string }>(
  input: T,
): Omit<T, 'personId'> & { personId: string } => ({
  ...input,
  personId: input.personId ?? `person-${input.neighborId}`,
});

const ensureThreadWithPerson = <TService extends { ensureThread: (input: any) => any }>(
  service: TService,
  input: Omit<Parameters<TService['ensureThread']>[0], 'personId'> & {
    neighborId: string;
    personId?: string;
  },
): ReturnType<TService['ensureThread']> => service.ensureThread(withRequiredPersonId(input));

describe('connectshyft thread service', () => {
  let store: InMemoryConnectShyftThreadStore;
  let service: ConnectShyftThreadService;

  beforeEach(() => {
    store = new InMemoryConnectShyftThreadStore();
    service = new ConnectShyftThreadService(store);
  });

  it('ensures canonical UNCLAIMED thread state and required lifecycle metadata fields', () => {
    const result = ensureThreadWithPerson(service, {
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
    const result = ensureThreadWithPerson(service, {
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
    const first = ensureThreadWithPerson(service, {
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      neighborId: 'neighbor-connectshyft-c1-1001',
      source: 'VOICE',
      lastInboundCsNumberId: 'cs-inbound-c1-001',
      preferredOutboundCsNumberId: 'cs-outbound-c1-001',
      threadId: 'thread-c1-duplicate-check',
    });

    const second = ensureThreadWithPerson(service, {
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

  it('preserves existing escalation due timestamp on non-claim ensure updates when nextEvaluationAtUtc is omitted', () => {
    const first = ensureThreadWithPerson(service, {
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      neighborId: 'neighbor-connectshyft-c1-1002',
      source: 'VOICE',
      threadId: 'thread-c1-preserve-due',
      nextEvaluationAtUtc: '2026-02-24T14:30:00.000Z',
      lastInboundCsNumberId: 'cs-inbound-c1-101',
      preferredOutboundCsNumberId: 'cs-outbound-c1-101',
    });

    const second = ensureThreadWithPerson(service, {
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      neighborId: 'neighbor-connectshyft-c1-1002',
      source: 'VOICE',
      threadId: 'thread-c1-preserve-due-secondary',
      lastInboundCsNumberId: 'cs-inbound-c1-102',
      preferredOutboundCsNumberId: 'cs-outbound-c1-102',
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      throw new Error('Expected both ensure attempts to succeed');
    }

    expect(second.data.thread.threadId).toBe(first.data.thread.threadId);
    expect(second.data.thread.escalation.nextEvaluationAtUtc).toBe(
      first.data.thread.escalation.nextEvaluationAtUtc,
    );
  });

  it('rejects non-canonical forced state values with deterministic refusal contracts', () => {
    const result = ensureThreadWithPerson(service, {
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
    ensureThreadWithPerson(service, {
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
    ensureThreadWithPerson(service, {
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
    ensureThreadWithPerson(service, {
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

  it('stores and reloads provider-number sender alignment values for an ensured thread', () => {
    const ensured = ensureThreadWithPerson(service, {
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      neighborId: 'neighbor-connectshyft-c1-provider-1001',
      source: 'SMS',
      threadId: 'thread-c1-provider-1001',
      lastInboundCsNumberId: '  +12605550191  ',
      preferredOutboundCsNumberId: '  +12605550191  ',
    });

    expect(ensured.ok).toBe(true);
    if (!ensured.ok) {
      throw new Error('Expected ensureThread to succeed');
    }

    const reloaded = service.findThreadById({
      tenantId: 'tenant-connectshyft-c1',
      threadId: ensured.data.thread.threadId,
    });

    expect(reloaded).toMatchObject({
      threadId: 'thread-c1-provider-1001',
      lastInboundCsNumberId: '+12605550191',
      preferredOutboundCsNumberId: '+12605550191',
      lastInboundProviderNumberE164: '+12605550191',
      preferredOutboundProviderNumberE164: '+12605550191',
    });
  });

  it('does not overwrite canonical provider-number alignment with symbolic compatibility values', () => {
    const first = ensureThreadWithPerson(service, {
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      neighborId: 'neighbor-connectshyft-c1-provider-1002',
      source: 'SMS',
      threadId: 'thread-c1-provider-1002',
      lastInboundCsNumberId: '+12605550192',
      preferredOutboundCsNumberId: '+12605550192',
    });

    const second = ensureThreadWithPerson(service, {
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      neighborId: 'neighbor-connectshyft-c1-provider-1002',
      source: 'SMS',
      threadId: 'thread-c1-provider-1002-second',
      lastInboundCsNumberId: 'cs-number-c1-902',
      preferredOutboundCsNumberId: 'cs-number-c1-902',
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      throw new Error('Expected both ensureThread calls to succeed');
    }

    expect(second.data.thread.lastInboundCsNumberId).toBe('cs-number-c1-902');
    expect(second.data.thread.preferredOutboundCsNumberId).toBe('cs-number-c1-902');
    expect(second.data.thread.lastInboundProviderNumberE164).toBe('+12605550192');
    expect(second.data.thread.preferredOutboundProviderNumberE164).toBe('+12605550192');
  });

  it('aligns lifecycle nullable fields with canonical state transitions', () => {
    const ensured = ensureThreadWithPerson(service, {
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

describe('connectshyft lifecycle policy matrix', () => {
  it('allows claim only from UNCLAIMED to CLAIMED', () => {
    const allowed = evaluateConnectShyftLifecyclePolicy({
      action: 'claim',
      currentState: 'UNCLAIMED',
      claimedByUserId: null,
      actorUserId: 'user-connectshyft-c4-member',
      actorRoles: ['ORGUNIT_MEMBER'],
    });

    expect(allowed).toEqual({
      ok: true,
      nextState: 'CLAIMED',
    });

    const refused = evaluateConnectShyftLifecyclePolicy({
      action: 'claim',
      currentState: 'CLOSED',
      claimedByUserId: null,
      actorUserId: 'user-connectshyft-c4-member',
      actorRoles: ['ORGUNIT_MEMBER'],
    });

    expect(refused).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_TRANSITION_INVALID',
    });
  });

  it('refuses close when actor is not owner and lacks takeover capability', () => {
    const result = evaluateConnectShyftLifecyclePolicy({
      action: 'close',
      currentState: 'CLAIMED',
      claimedByUserId: 'user-connectshyft-c4-owner',
      actorUserId: 'user-connectshyft-c4-member',
      actorRoles: ['ORGUNIT_MEMBER'],
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_OWNERSHIP_REQUIRED',
    });
  });

  it('allows close when actor has takeover authority', () => {
    const result = evaluateConnectShyftLifecyclePolicy({
      action: 'close',
      currentState: 'CLAIMED',
      claimedByUserId: 'user-connectshyft-c4-owner',
      actorUserId: 'user-connectshyft-c4-admin',
      actorRoles: ['ORGUNIT_ADMIN'],
    });

    expect(result).toEqual({
      ok: true,
      nextState: 'CLOSED',
    });
  });

  it('requires actor attribution for claim, takeover, and close', () => {
    const actions: Array<'claim' | 'takeover' | 'close'> = ['claim', 'takeover', 'close'];

    actions.forEach((action) => {
      const currentState = action === 'claim' ? 'UNCLAIMED' : 'CLAIMED';
      const result = evaluateConnectShyftLifecyclePolicy({
        action,
        currentState,
        claimedByUserId: action === 'claim' ? null : 'user-connectshyft-c4-owner',
        actorUserId: '',
        actorRoles: ['ORGUNIT_ADMIN'],
      });

      expect(result).toMatchObject({
        ok: false,
        code: 'CONNECTSHYFT_THREAD_TRANSITION_INVALID',
      });
    });
  });
});

describe('connectshyft thread persistence guards', () => {
  it('allows a new active thread after the previous one is closed', () => {
    const store = new InMemoryConnectShyftThreadStore();
    const service = new ConnectShyftThreadService(store);

    const first = ensureThreadWithPerson(service, {
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

    const second = ensureThreadWithPerson(service, {
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

describe('connectshyft async thread service persistence guards', () => {
  it('returns persistence unavailable refusal instead of in-memory ensure success when storage is missing', async () => {
    const missingSchemaError = Object.assign(new Error('relation does not exist'), {
      code: '42P01',
    });
    const store = {
      ensureActiveThread: jest.fn().mockRejectedValue(missingSchemaError),
      listDueThreads: jest.fn(),
      transitionThreadState: jest.fn(),
    } as any;

    const service = new AsyncConnectShyftThreadService(store);
    const result = await ensureThreadWithPerson(service, {
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c1',
      orgUnitId: 'org-connectshyft-c1-east',
      neighborId: 'neighbor-connectshyft-c1-5001',
      source: 'VOICE',
      lastInboundCsNumberId: 'cs-inbound-c1-5001',
      preferredOutboundCsNumberId: 'cs-outbound-c1-5001',
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_ENSURE_PERSISTENCE_UNAVAILABLE',
    });
    expect(store.ensureActiveThread).toHaveBeenCalledTimes(1);
  });
});

describe('connectshyft deterministic escalation scheduler', () => {
  let store: InMemoryConnectShyftThreadStore;
  let service: ConnectShyftThreadService;

  beforeEach(() => {
    store = new InMemoryConnectShyftThreadStore();
    service = new ConnectShyftThreadService(store);
  });

  it('progresses due unclaimed threads using deterministic X -> 2X -> 3X offsets from persisted due timestamps', () => {
    const ensured = ensureThreadWithPerson(service, {
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c5',
      orgUnitId: 'org-connectshyft-c5-east',
      neighborId: 'neighbor-connectshyft-c5-1001',
      source: 'VOICE',
      threadId: 'thread-c5-1001',
      nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
      lastInboundCsNumberId: 'cs-inbound-c5-001',
      preferredOutboundCsNumberId: 'cs-outbound-c5-001',
    });
    expect(ensured.ok).toBe(true);

    const first = service.evaluateEscalations({
      actorRoles: ['TENANT_STAFF'],
      tenantId: 'tenant-connectshyft-c5',
      orgUnitId: 'org-connectshyft-c5-east',
      asOfUtc: '2026-03-01T00:00:00.000Z',
      baselineHours: 6,
      limit: 50,
    });
    expect(first).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_ESCALATION_EVALUATED',
      data: {
        baselineHours: 6,
        effects: {
          emittedCount: 1,
        },
      },
    });
    if (!first.ok) {
      throw new Error('Expected first scheduler evaluation to succeed');
    }

    expect(first.data.transitions).toEqual([
      expect.objectContaining({
        threadId: 'thread-c5-1001',
        previousStage: 0,
        stage: 1,
        dueAtUtc: '2026-03-01T00:00:00.000Z',
        nextDueOffsetHours: 6,
        nextDueAtUtc: '2026-03-01T06:00:00.000Z',
      }),
    ]);

    const second = service.evaluateEscalations({
      actorRoles: ['TENANT_STAFF'],
      tenantId: 'tenant-connectshyft-c5',
      orgUnitId: 'org-connectshyft-c5-east',
      asOfUtc: '2026-03-01T06:00:00.000Z',
      baselineHours: 6,
      limit: 50,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) {
      throw new Error('Expected second scheduler evaluation to succeed');
    }
    expect(second.data.transitions).toEqual([
      expect.objectContaining({
        threadId: 'thread-c5-1001',
        previousStage: 1,
        stage: 2,
        dueAtUtc: '2026-03-01T06:00:00.000Z',
        nextDueOffsetHours: 12,
        nextDueAtUtc: '2026-03-01T18:00:00.000Z',
      }),
    ]);

    const third = service.evaluateEscalations({
      actorRoles: ['TENANT_STAFF'],
      tenantId: 'tenant-connectshyft-c5',
      orgUnitId: 'org-connectshyft-c5-east',
      asOfUtc: '2026-03-01T18:00:00.000Z',
      baselineHours: 6,
      limit: 50,
    });
    expect(third.ok).toBe(true);
    if (!third.ok) {
      throw new Error('Expected third scheduler evaluation to succeed');
    }
    expect(third.data.transitions).toEqual([
      expect.objectContaining({
        threadId: 'thread-c5-1001',
        previousStage: 2,
        stage: 3,
        dueAtUtc: '2026-03-01T18:00:00.000Z',
        nextDueOffsetHours: 18,
        nextDueAtUtc: '2026-03-02T12:00:00.000Z',
      }),
    ]);
  });

  it('is replay-safe for repeated due-window evaluation calls', () => {
    const ensured = ensureThreadWithPerson(service, {
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c5',
      orgUnitId: 'org-connectshyft-c5-east',
      neighborId: 'neighbor-connectshyft-c5-2001',
      source: 'VOICE',
      threadId: 'thread-c5-2001',
      nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
      lastInboundCsNumberId: 'cs-inbound-c5-002',
      preferredOutboundCsNumberId: 'cs-outbound-c5-002',
    });
    expect(ensured.ok).toBe(true);

    const first = service.evaluateEscalations({
      actorRoles: ['TENANT_STAFF'],
      tenantId: 'tenant-connectshyft-c5',
      orgUnitId: 'org-connectshyft-c5-east',
      asOfUtc: '2026-03-01T00:00:00.000Z',
      baselineHours: 6,
      limit: 50,
    });
    const second = service.evaluateEscalations({
      actorRoles: ['TENANT_STAFF'],
      tenantId: 'tenant-connectshyft-c5',
      orgUnitId: 'org-connectshyft-c5-east',
      asOfUtc: '2026-03-01T00:00:00.000Z',
      baselineHours: 6,
      limit: 50,
    });

    expect(first.ok).toBe(true);
    expect(second).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_ESCALATION_EVALUATED',
      data: {
        replaySafe: true,
        skippedAlreadyProcessed: true,
        effects: {
          emittedCount: 0,
        },
      },
    });
  });

  it('resets escalation state only on explicit claim transitions', () => {
    const ensured = ensureThreadWithPerson(service, {
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c5',
      orgUnitId: 'org-connectshyft-c5-east',
      neighborId: 'neighbor-connectshyft-c5-3001',
      source: 'VOICE',
      threadId: 'thread-c5-3001',
      nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
      lastInboundCsNumberId: 'cs-inbound-c5-003',
      preferredOutboundCsNumberId: 'cs-outbound-c5-003',
    });
    if (!ensured.ok) {
      throw new Error('Expected ensureThread to succeed');
    }

    const escalated = service.evaluateEscalations({
      actorRoles: ['TENANT_STAFF'],
      tenantId: 'tenant-connectshyft-c5',
      orgUnitId: 'org-connectshyft-c5-east',
      asOfUtc: '2026-03-01T00:00:00.000Z',
      baselineHours: 6,
      limit: 50,
    });
    expect(escalated.ok).toBe(true);

    const closed = service.transitionThreadState({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c5',
      threadId: ensured.data.thread.threadId,
      nextState: 'CLOSED',
      actorUserId: 'user-connectshyft-c5-operator',
    });
    expect(closed.ok).toBe(true);
    if (!closed.ok) {
      throw new Error('Expected close transition to succeed');
    }
    expect(closed.data.thread.escalation.stage).toBe(1);

    const reopened = service.transitionThreadState({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c5',
      threadId: ensured.data.thread.threadId,
      nextState: 'UNCLAIMED',
    });
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) {
      throw new Error('Expected reopen transition to succeed');
    }
    expect(reopened.data.thread.escalation.stage).toBe(1);

    const claimed = service.transitionThreadState({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c5',
      threadId: ensured.data.thread.threadId,
      nextState: 'CLAIMED',
      actorUserId: 'user-connectshyft-c5-operator',
    });
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) {
      throw new Error('Expected claim transition to succeed');
    }
    expect(claimed.data.thread.escalation.stage).toBe(0);
    expect(claimed.data.thread.escalation.nextEvaluationAtUtc).toBeNull();
  });

  it('reuses persisted provider-number alignment for sender resolution on the same thread', async () => {
    const ensured = ensureThreadWithPerson(service, {
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c5',
      orgUnitId: 'org-connectshyft-c5-east',
      neighborId: 'neighbor-connectshyft-c5-sender-1001',
      source: 'SMS',
      threadId: 'thread-c5-sender-1001',
      lastInboundCsNumberId: '+12605550192',
      preferredOutboundCsNumberId: '+12605550192',
    });
    if (!ensured.ok) {
      throw new Error('Expected ensureThread to succeed');
    }

    const resolved = await resolveSenderNumber(
      {
        tenantId: 'tenant-connectshyft-c5',
        orgUnitId: 'org-connectshyft-c5-east',
        threadId: ensured.data.thread.threadId,
        channel: 'sms',
      },
      {
        loadThread: async (request) => service.findThreadById({
          tenantId: request.tenantId,
          threadId: request.threadId,
        }),
        numberMappingService: {
          resolveRoutingMappingByNumber: async () => ({
            status: 'found',
            mapping: {
              mappingId: 'mapping-c5-001',
              tenantId: 'tenant-connectshyft-c5',
              orgUnitId: 'org-connectshyft-c5-east',
              twilioNumberE164: '+12605550192',
              label: 'C5 Primary',
              isActive: true,
              createdAtUtc: '2026-03-19T12:00:00.000Z',
              updatedAtUtc: '2026-03-19T12:00:00.000Z',
            },
          }),
        },
      },
    );

    expect(resolved).toMatchObject({
      ok: true,
      providerNumberE164: '+12605550192',
      mappingId: 'mapping-c5-001',
      routingMetadata: {
        source: 'thread_alignment',
        alignedFrom: 'preferred_outbound',
      },
    });
  });

  it('rejects legacy synthetic sender tokens when resolving from persisted thread alignment', async () => {
    const ensured = ensureThreadWithPerson(service, {
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-c5',
      orgUnitId: 'org-connectshyft-c5-east',
      neighborId: 'neighbor-connectshyft-c5-sender-1002',
      source: 'SMS',
      threadId: 'thread-c5-sender-1002',
      lastInboundCsNumberId: 'cs-number-c5-402',
      preferredOutboundCsNumberId: 'cs-number-c5-402',
    });
    if (!ensured.ok) {
      throw new Error('Expected ensureThread to succeed');
    }

    const resolved = await resolveSenderNumber(
      {
        tenantId: 'tenant-connectshyft-c5',
        orgUnitId: 'org-connectshyft-c5-east',
        threadId: ensured.data.thread.threadId,
        channel: 'sms',
      },
      {
        loadThread: async (request) => service.findThreadById({
          tenantId: request.tenantId,
          threadId: request.threadId,
        }),
        numberMappingService: {
          resolveRoutingMappingByNumber: async () => ({ status: 'not-found' }),
        },
      },
    );

    expect(resolved).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SENDER_ALIGNMENT_INVALID',
      reason: 'sender_alignment_invalid',
      routingMetadata: {
        candidateProviderNumberE164: 'cs-number-c5-402',
      },
    });
  });
});
