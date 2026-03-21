import {
  AsyncConnectShyftIdentityAmbiguityEventService,
  createIdentityAmbiguityEvent,
  InMemoryConnectShyftIdentityAmbiguityEventStore,
  listIdentityAmbiguityEvents,
  markIdentityAmbiguityEventReviewed,
  resetIdentityAmbiguityEventsForTests,
} from '../ambiguityEvents';

describe('connectshyft ambiguity events', () => {
  let store: InMemoryConnectShyftIdentityAmbiguityEventStore;
  let service: AsyncConnectShyftIdentityAmbiguityEventService;

  beforeEach(() => {
    resetIdentityAmbiguityEventsForTests();
    store = new InMemoryConnectShyftIdentityAmbiguityEventStore();
    service = new AsyncConnectShyftIdentityAmbiguityEventService(store);
  });

  it('creates ambiguity events with pending status and preserves candidate ordering', async () => {
    const created = await service.createIdentityAmbiguityEvent({
      tenantId: 'tenant-connectshyft-ambiguity',
      orgUnitId: 'org-connectshyft-ambiguity',
      sourceContext: 'connectshyft_identity_match',
      sourceContextId: 'identity-match:disagreement',
      normalizedContactPoint: '+12605551218',
      candidateNeighborIds: ['neighbor-b', 'neighbor-a'],
      ambiguityReasonCode: 'PEOPLECORE_LEGACY_DISAGREEMENT',
      requestedByUserId: 'user-1',
      correlationId: 'corr-ambiguity-1',
      idempotencyKey: 'identity-match:disagreement',
      createdAtUtc: '2026-03-21T12:00:00.000Z',
    });

    expect(created).toMatchObject({
      tenantId: 'tenant-connectshyft-ambiguity',
      orgUnitId: 'org-connectshyft-ambiguity',
      sourceContext: 'connectshyft_identity_match',
      sourceContextId: 'identity-match:disagreement',
      normalizedContactPoint: '+12605551218',
      contactPointType: 'phone',
      candidateNeighborIds: ['neighbor-b', 'neighbor-a'],
      candidateCount: 2,
      ambiguityReasonCode: 'PEOPLECORE_LEGACY_DISAGREEMENT',
      status: 'pending',
      requestedByUserId: 'user-1',
      correlationId: 'corr-ambiguity-1',
      idempotencyKey: 'identity-match:disagreement',
      createdAtUtc: '2026-03-21T12:00:00.000Z',
      updatedAtUtc: '2026-03-21T12:00:00.000Z',
    });
  });

  it('lists ambiguity events newest first with tenant filters and keyset pagination', async () => {
    await service.createIdentityAmbiguityEvent({
      id: '00000000-0000-4000-8000-000000000001',
      tenantId: 'tenant-a',
      orgUnitId: 'org-east',
      sourceContext: 'connectshyft_identity_match',
      normalizedContactPoint: '+12605550001',
      candidateNeighborIds: ['neighbor-a'],
      ambiguityReasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
      createdAtUtc: '2026-03-21T10:00:00.000Z',
    });
    await service.createIdentityAmbiguityEvent({
      id: '00000000-0000-4000-8000-000000000002',
      tenantId: 'tenant-a',
      orgUnitId: 'org-east',
      sourceContext: 'connectshyft_inbound_subject_resolution',
      normalizedContactPoint: '+12605550002',
      candidateNeighborIds: ['neighbor-b'],
      ambiguityReasonCode: 'PEOPLECORE_MULTI_CURRENT_LINKS',
      createdAtUtc: '2026-03-21T11:00:00.000Z',
    });
    await service.createIdentityAmbiguityEvent({
      id: '00000000-0000-4000-8000-000000000003',
      tenantId: 'tenant-b',
      orgUnitId: 'org-west',
      sourceContext: 'connectshyft_identity_match',
      normalizedContactPoint: '+12605550003',
      candidateNeighborIds: ['neighbor-c'],
      ambiguityReasonCode: 'PEOPLECORE_LEGACY_DISAGREEMENT',
      createdAtUtc: '2026-03-21T12:00:00.000Z',
    });

    const firstPage = await service.listIdentityAmbiguityEvents({
      tenantId: 'tenant-a',
      orgUnitId: 'org-east',
      limit: 1,
    });

    expect(firstPage.events).toHaveLength(1);
    expect(firstPage.events[0]).toMatchObject({
      tenantId: 'tenant-a',
      sourceContext: 'connectshyft_inbound_subject_resolution',
      normalizedContactPoint: '+12605550002',
    });
    expect(firstPage.nextCursor).toEqual(expect.any(String));

    const secondPage = await service.listIdentityAmbiguityEvents({
      tenantId: 'tenant-a',
      orgUnitId: 'org-east',
      limit: 1,
      cursor: firstPage.nextCursor,
    });

    expect(secondPage.events).toHaveLength(1);
    expect(secondPage.events[0]).toMatchObject({
      tenantId: 'tenant-a',
      sourceContext: 'connectshyft_identity_match',
      normalizedContactPoint: '+12605550001',
    });
    expect(secondPage.nextCursor).toBeNull();
  });

  it('marks pending ambiguity events reviewed and keeps repeated reviewed updates idempotent', async () => {
    const created = await service.createIdentityAmbiguityEvent({
      tenantId: 'tenant-a',
      orgUnitId: 'org-east',
      sourceContext: 'connectshyft_identity_match',
      normalizedContactPoint: '+12605550004',
      candidateNeighborIds: ['neighbor-d'],
      ambiguityReasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
      createdAtUtc: '2026-03-21T12:00:00.000Z',
    });

    const reviewed = await service.markIdentityAmbiguityEventReviewed({
      tenantId: 'tenant-a',
      ambiguityEventId: created.id,
      reviewedAtUtc: '2026-03-21T12:15:00.000Z',
    });

    expect(reviewed).toMatchObject({
      id: created.id,
      status: 'reviewed',
      updatedAtUtc: '2026-03-21T12:15:00.000Z',
    });

    const reviewedAgain = await service.markIdentityAmbiguityEventReviewed({
      tenantId: 'tenant-a',
      ambiguityEventId: created.id,
      reviewedAtUtc: '2026-03-21T12:30:00.000Z',
    });

    expect(reviewedAgain).toMatchObject({
      id: created.id,
      status: 'reviewed',
      updatedAtUtc: '2026-03-21T12:15:00.000Z',
    });
  });

  it('uses the exported module surface with in-memory persistence for non-uuid test scope ids', async () => {
    const created = await createIdentityAmbiguityEvent({
      tenantId: 'tenant-test-scope',
      orgUnitId: 'org-test-scope',
      sourceContext: 'connectshyft_identity_match',
      sourceContextId: 'identity-match:test-scope',
      normalizedContactPoint: '+12605550005',
      candidateNeighborIds: ['neighbor-e', 'neighbor-f'],
      ambiguityReasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
    });

    const listed = await listIdentityAmbiguityEvents({
      tenantId: 'tenant-test-scope',
      normalizedContactPoint: '+12605550005',
    });

    expect(listed.events).toHaveLength(1);
    expect(listed.events[0]).toMatchObject({
      id: created.id,
      candidateNeighborIds: ['neighbor-e', 'neighbor-f'],
      status: 'pending',
    });

    const reviewed = await markIdentityAmbiguityEventReviewed({
      tenantId: 'tenant-test-scope',
      ambiguityEventId: created.id,
    });

    expect(reviewed).toMatchObject({
      id: created.id,
      status: 'reviewed',
    });
  });
});
