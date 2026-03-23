import { KnexPeopleCoreStore } from '../store';

type TableFixture = {
  rows: any[];
  returningQueue: any[][];
  inserted: any[];
  whereCalls: Array<Record<string, unknown>>;
  orderByCalls: Array<[string, string]>;
};

const createFixture = (input: Partial<TableFixture> = {}): TableFixture => ({
  rows: input.rows || [],
  returningQueue: input.returningQueue ? [...input.returningQueue] : [],
  inserted: [],
  whereCalls: [],
  orderByCalls: [],
});

const buildKnexMock = (initial: Record<string, Partial<TableFixture>> = {}) => {
  const fixtures = new Map<string, TableFixture>(
    Object.entries(initial).map(([key, value]) => [key, createFixture(value)]),
  );

  const getFixture = (key: string): TableFixture => {
    const existing = fixtures.get(key);
    if (existing) {
      return existing;
    }

    const created = createFixture();
    fixtures.set(key, created);
    return created;
  };

  const knex: any = {
    fn: {
      now: () => 'NOW()',
    },
    withSchema: (schema: string) => ({
      table: (tableName: string) => {
        const fixture = getFixture(`${schema}.${tableName}`);
        const builder: any = {
          where: (clause: Record<string, unknown>) => {
            fixture.whereCalls.push(clause);
            return builder;
          },
          orderBy: (column: string, direction: string = 'asc') => {
            fixture.orderByCalls.push([column, direction]);
            return builder;
          },
          select: async () => fixture.rows,
          insert: (value: Record<string, unknown>) => {
            fixture.inserted.push(value);
            return {
              returning: async () => (fixture.returningQueue.length > 0 ? fixture.returningQueue.shift() || [] : []),
            };
          },
        };

        return builder;
      },
    }),
  };

  return {
    knex,
    getFixture,
  };
};

describe('KnexPeopleCoreStore slice 22 resolver review persistence', () => {
  it('persists candidate ids, confidence reasons, and risk flags for identity-conflict reviews', async () => {
    const reviewRow = {
      id: 'review-slice22-1',
      tenant_id: 'tenant-1',
      org_unit_id: 'org-1',
      review_type: 'identity_conflict',
      review_status: 'pending',
      priority: 'normal',
      trigger_source_type: 'contact_point_resolution',
      trigger_source_id: 'receipt-slice22',
      conversation_id: null,
      provisional_person_id: 'person-provisional',
      candidate_person_ids: ['person-a', 'person-b'],
      contact_point_id: 'contact-point-1',
      confidence_band: 'medium',
      confidence_reasons: ['exact current person link (+60)', 'Resolver review required because inbound identity is not decisive.'],
      risk_flags: ['shared_contact_possible'],
      requested_by_user_id: 'user-1',
      assigned_resolver_user_id: null,
      requested_at_utc: '2026-03-23T12:05:00.000Z',
      started_at_utc: null,
      resolved_at_utc: null,
      resolution_type: null,
      resolution_reason: null,
      resolution_notes: null,
    };
    const { knex, getFixture } = buildKnexMock({
      'people.resolver_reviews': {
        rows: [reviewRow],
        returningQueue: [[reviewRow]],
      },
    });
    const store = new KnexPeopleCoreStore(knex);

    const created = await store.createResolverReview({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      reviewType: 'identity_conflict',
      reviewStatus: 'pending',
      priority: 'normal',
      triggerSourceType: 'contact_point_resolution',
      triggerSourceId: 'receipt-slice22',
      provisionalPersonId: 'person-provisional',
      candidatePersonIds: ['person-a', 'person-b'],
      contactPointId: 'contact-point-1',
      confidenceBand: 'medium',
      confidenceReasons: [
        'exact current person link (+60)',
        'Resolver review required because inbound identity is not decisive.',
      ],
      riskFlags: ['shared_contact_possible'],
      requestedByUserId: 'user-1',
      requestedAt: '2026-03-23T12:05:00.000Z',
    });
    const listed = await store.listResolverReviews({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
    });

    expect(created).toMatchObject({
      id: 'review-slice22-1',
      triggerSourceType: 'contact_point_resolution',
      candidatePersonIds: ['person-a', 'person-b'],
      confidenceReasons: [
        'exact current person link (+60)',
        'Resolver review required because inbound identity is not decisive.',
      ],
      riskFlags: ['shared_contact_possible'],
    });
    expect(listed).toEqual([expect.objectContaining({ id: 'review-slice22-1' })]);
    expect(getFixture('people.resolver_reviews').inserted[0]).toMatchObject({
      tenant_id: 'tenant-1',
      org_unit_id: 'org-1',
      review_type: 'identity_conflict',
      priority: 'normal',
      trigger_source_type: 'contact_point_resolution',
      trigger_source_id: 'receipt-slice22',
      candidate_person_ids: JSON.stringify(['person-a', 'person-b']),
      confidence_reasons: JSON.stringify([
        'exact current person link (+60)',
        'Resolver review required because inbound identity is not decisive.',
      ]),
      risk_flags: JSON.stringify(['shared_contact_possible']),
    });
  });
});
