import {
  AsyncConnectShyftIdentityAmbiguityEventService,
  createIdentityAmbiguityEvent,
  getIdentityAmbiguityEvent,
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

  it('consumes linked ambiguity events as resolved and persists resolver outcome linkage', async () => {
    const created = await service.createIdentityAmbiguityEvent({
      tenantId: 'tenant-a',
      orgUnitId: 'org-east',
      sourceContext: 'connectshyft_identity_match',
      sourceContextId: 'identity-match:resolved',
      normalizedContactPoint: '+12605550006',
      candidateNeighborIds: ['neighbor-g'],
      ambiguityReasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
      createdAtUtc: '2026-03-21T12:00:00.000Z',
    });

    const consumed = await service.consumeAmbiguityEventsForResolverOutcome({
      tenantId: 'tenant-a',
      resolverReviewId: 'review-1',
      triggerSourceId: 'identity-match:resolved',
      outcome: 'resolved',
      consumedByUserId: 'resolver-1',
      consumedAtUtc: '2026-03-21T12:20:00.000Z',
      resolverOutcome: {
        reviewId: 'review-1',
        action: 'confirm_existing_person',
        reviewStatus: 'resolved_confirmed_existing',
        actorUserId: 'resolver-1',
        occurredAtUtc: '2026-03-21T12:20:00.000Z',
        reason: 'Matched the existing person.',
        personId: 'person-existing',
        contactPointId: 'contact-point-1',
      },
    });

    expect(consumed.events).toEqual([
      expect.objectContaining({
        id: created.id,
        status: 'resolved',
        resolverReviewId: 'review-1',
        resolverConsumedByUserId: 'resolver-1',
        resolverConsumedAtUtc: '2026-03-21T12:20:00.000Z',
        resolverOutcome: expect.objectContaining({
          action: 'confirm_existing_person',
          reviewStatus: 'resolved_confirmed_existing',
          personId: 'person-existing',
        }),
      }),
    ]);

    const detailed = await service.getIdentityAmbiguityEvent({
      tenantId: 'tenant-a',
      ambiguityEventId: created.id,
    });

    expect(detailed).toMatchObject({
      id: created.id,
      status: 'resolved',
      resolverReviewId: 'review-1',
      resolverOutcome: expect.objectContaining({
        action: 'confirm_existing_person',
      }),
    });
  });

  it('consumes linked ambiguity events as dismissed for dismiss_no_action outcomes', async () => {
    const created = await service.createIdentityAmbiguityEvent({
      tenantId: 'tenant-a',
      orgUnitId: 'org-east',
      sourceContext: 'connectshyft_identity_match',
      sourceContextId: 'identity-match:dismissed',
      normalizedContactPoint: '+12605550007',
      candidateNeighborIds: ['neighbor-h'],
      ambiguityReasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
      createdAtUtc: '2026-03-21T12:00:00.000Z',
    });

    const consumed = await service.consumeAmbiguityEventsForResolverOutcome({
      tenantId: 'tenant-a',
      resolverReviewId: 'review-dismissed',
      triggerSourceId: 'identity-match:dismissed',
      outcome: 'dismissed',
      consumedByUserId: 'resolver-2',
      consumedAtUtc: '2026-03-21T12:25:00.000Z',
      resolverOutcome: {
        reviewId: 'review-dismissed',
        action: 'dismiss_no_action',
        reviewStatus: 'dismissed',
        actorUserId: 'resolver-2',
        occurredAtUtc: '2026-03-21T12:25:00.000Z',
        reason: 'No identity change required.',
        contactPointId: 'contact-point-2',
      },
    });

    expect(consumed.events).toEqual([
      expect.objectContaining({
        id: created.id,
        status: 'dismissed',
        resolverReviewId: 'review-dismissed',
        resolverOutcome: expect.objectContaining({
          action: 'dismiss_no_action',
          reviewStatus: 'dismissed',
        }),
      }),
    ]);
  });

  it('keeps repeated resolver-outcome consumption idempotent', async () => {
    const created = await service.createIdentityAmbiguityEvent({
      tenantId: 'tenant-a',
      orgUnitId: 'org-east',
      sourceContext: 'connectshyft_identity_match',
      sourceContextId: 'identity-match:idempotent',
      normalizedContactPoint: '+12605550008',
      candidateNeighborIds: ['neighbor-i'],
      ambiguityReasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
      createdAtUtc: '2026-03-21T12:00:00.000Z',
    });

    const input = {
      tenantId: 'tenant-a',
      resolverReviewId: 'review-idempotent',
      triggerSourceId: 'identity-match:idempotent',
      outcome: 'resolved' as const,
      consumedByUserId: 'resolver-3',
      consumedAtUtc: '2026-03-21T12:30:00.000Z',
      resolverOutcome: {
        reviewId: 'review-idempotent',
        action: 'merge_people' as const,
        reviewStatus: 'resolved_merged' as const,
        actorUserId: 'resolver-3',
        occurredAtUtc: '2026-03-21T12:30:00.000Z',
        sourcePersonId: 'person-source',
        targetPersonId: 'person-target',
      },
    };

    const first = await service.consumeAmbiguityEventsForResolverOutcome(input);
    const second = await service.consumeAmbiguityEventsForResolverOutcome({
      ...input,
      consumedAtUtc: '2026-03-21T12:45:00.000Z',
    });

    expect(first.events[0]).toMatchObject({
      id: created.id,
      status: 'resolved',
      resolverConsumedAtUtc: '2026-03-21T12:30:00.000Z',
    });
    expect(second.events[0]).toMatchObject({
      id: created.id,
      status: 'resolved',
      resolverConsumedAtUtc: '2026-03-21T12:30:00.000Z',
    });
  });

  it('supports active-list filtering while preserving terminal detail retrieval', async () => {
    const pending = await service.createIdentityAmbiguityEvent({
      tenantId: 'tenant-a',
      orgUnitId: 'org-east',
      sourceContext: 'connectshyft_identity_match',
      sourceContextId: 'identity-match:pending-detail',
      normalizedContactPoint: '+12605550009',
      candidateNeighborIds: ['neighbor-j'],
      ambiguityReasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
      createdAtUtc: '2026-03-21T12:00:00.000Z',
    });
    const resolved = await service.createIdentityAmbiguityEvent({
      tenantId: 'tenant-a',
      orgUnitId: 'org-east',
      sourceContext: 'connectshyft_identity_match',
      sourceContextId: 'identity-match:terminal-detail',
      normalizedContactPoint: '+12605550010',
      candidateNeighborIds: ['neighbor-k'],
      ambiguityReasonCode: 'PEOPLECORE_MULTI_CURRENT_LINKS',
      createdAtUtc: '2026-03-21T12:05:00.000Z',
    });

    await service.consumeAmbiguityEventsForResolverOutcome({
      tenantId: 'tenant-a',
      resolverReviewId: 'review-terminal-detail',
      triggerSourceId: 'identity-match:terminal-detail',
      outcome: 'resolved',
      consumedByUserId: 'resolver-4',
      consumedAtUtc: '2026-03-21T12:40:00.000Z',
      resolverOutcome: {
        reviewId: 'review-terminal-detail',
        action: 'link_without_merge',
        reviewStatus: 'resolved_confirmed_existing',
        actorUserId: 'resolver-4',
        occurredAtUtc: '2026-03-21T12:40:00.000Z',
        personId: 'person-keep-distinct',
      },
    });

    const active = await service.listIdentityAmbiguityEvents({
      tenantId: 'tenant-a',
      status: 'pending',
    });
    const terminalDetail = await service.getIdentityAmbiguityEvent({
      tenantId: 'tenant-a',
      ambiguityEventId: resolved.id,
    });

    expect(active.events).toEqual([
      expect.objectContaining({
        id: pending.id,
        status: 'pending',
      }),
    ]);
    expect(terminalDetail).toMatchObject({
      id: resolved.id,
      status: 'resolved',
      resolverReviewId: 'review-terminal-detail',
      resolverOutcome: expect.objectContaining({
        action: 'link_without_merge',
      }),
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

    const detailed = await getIdentityAmbiguityEvent({
      tenantId: 'tenant-test-scope',
      ambiguityEventId: created.id,
    });

    expect(detailed).toMatchObject({
      id: created.id,
      status: 'reviewed',
    });
  });
});
