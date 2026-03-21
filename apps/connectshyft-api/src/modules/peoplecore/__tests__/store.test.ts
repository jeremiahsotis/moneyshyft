import { KnexPeopleCoreStore, PeopleCoreScopeViolationError } from '../store';

const PERSON_ID = '11111111-1111-4111-8111-111111111111';
const HOUSEHOLD_ID = '22222222-2222-4222-8222-222222222222';
const MEMBERSHIP_ID = '33333333-3333-4333-8333-333333333333';
const CONTACT_POINT_ID = '44444444-4444-4444-8444-444444444444';
const CONTACT_POINT_LINK_ID = '55555555-5555-4555-8555-555555555555';
const CONTACT_POINT_EVENT_ID = '66666666-6666-4666-8666-666666666666';
const RESOLVER_REVIEW_ID = '77777777-7777-4777-8777-777777777777';

type TableFixture = {
  rows: any[];
  firstQueue: any[];
  returningQueue: any[][];
  inserted: any[];
  whereCalls: Array<Record<string, unknown>>;
  joinCalls: Array<{ table: string; left: string; operator: string; right: string }>;
  orderByCalls: Array<[string, string]>;
  limitCalls: number[];
};

const createFixture = (input: Partial<TableFixture> = {}): TableFixture => ({
  rows: input.rows || [],
  firstQueue: input.firstQueue ? [...input.firstQueue] : [],
  returningQueue: input.returningQueue ? [...input.returningQueue] : [],
  inserted: [],
  whereCalls: [],
  joinCalls: [],
  orderByCalls: [],
  limitCalls: [],
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
          join: (table: string, left: string, operator: string, right: string) => {
            fixture.joinCalls.push({ table, left, operator, right });
            return builder;
          },
          where: (clause: Record<string, unknown>) => {
            fixture.whereCalls.push(clause);
            return builder;
          },
          orderBy: (column: string, direction: string = 'asc') => {
            fixture.orderByCalls.push([column, direction]);
            return builder;
          },
          limit: (value: number) => {
            fixture.limitCalls.push(value);
            return builder;
          },
          select: async () => fixture.rows,
          first: async () => (fixture.firstQueue.length > 0 ? fixture.firstQueue.shift() || null : null),
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

describe('KnexPeopleCoreStore', () => {
  it('creates, gets, and lists tenant-scoped people', async () => {
    const personRow = {
      id: PERSON_ID,
      tenant_id: 'tenant-1',
      org_unit_id: 'org-1',
      first_name: 'Ada',
      last_name: 'Lovelace',
      preferred_name: 'Ada',
      status: 'active_confirmed',
      merged_into_person_id: null,
      created_at_utc: '2026-03-21T12:00:00.000Z',
      updated_at_utc: '2026-03-21T12:00:00.000Z',
    };
    const { knex, getFixture } = buildKnexMock({
      'people.persons': {
        rows: [personRow],
        firstQueue: [personRow],
        returningQueue: [[personRow]],
      },
    });
    const store = new KnexPeopleCoreStore(knex);

    const created = await store.createPerson({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      preferredName: 'Ada',
      status: 'active_confirmed',
    });
    const found = await store.getPerson({
      tenantId: 'tenant-1',
      personId: PERSON_ID,
    });
    const listed = await store.listPersons({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
    });

    expect(created).toMatchObject({
      id: PERSON_ID,
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      firstName: 'Ada',
      status: 'active_confirmed',
    });
    expect(found?.id).toBe(PERSON_ID);
    expect(listed).toEqual([expect.objectContaining({ id: PERSON_ID })]);
    expect(getFixture('people.persons').inserted[0]).toMatchObject({
      tenant_id: 'tenant-1',
      org_unit_id: 'org-1',
      first_name: 'Ada',
      last_name: 'Lovelace',
      preferred_name: 'Ada',
      status: 'active_confirmed',
    });
    expect(getFixture('people.persons').whereCalls).toEqual(expect.arrayContaining([
      { id: PERSON_ID, tenant_id: 'tenant-1' },
      { tenant_id: 'tenant-1' },
      { org_unit_id: 'org-1' },
    ]));
  });

  it('creates households and tenant-scoped household memberships', async () => {
    const householdRow = {
      id: HOUSEHOLD_ID,
      tenant_id: 'tenant-1',
      org_unit_id: 'org-1',
      name: 'Lovelace Home',
      status: 'active',
      created_at_utc: '2026-03-21T12:01:00.000Z',
      updated_at_utc: '2026-03-21T12:01:00.000Z',
    };
    const membershipRow = {
      id: MEMBERSHIP_ID,
      household_id: HOUSEHOLD_ID,
      person_id: PERSON_ID,
      role: 'head',
      is_current: true,
      start_at_utc: null,
      end_at_utc: null,
      created_at_utc: '2026-03-21T12:02:00.000Z',
      updated_at_utc: '2026-03-21T12:02:00.000Z',
    };
    const personRow = {
      id: PERSON_ID,
    };
    const { knex, getFixture } = buildKnexMock({
      'people.households': {
        firstQueue: [householdRow, householdRow],
        returningQueue: [[householdRow]],
      },
      'people.persons': {
        firstQueue: [personRow],
      },
      'people.household_memberships': {
        rows: [membershipRow],
        returningQueue: [[membershipRow]],
      },
    });
    const store = new KnexPeopleCoreStore(knex);

    const household = await store.createHousehold({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      name: 'Lovelace Home',
      status: 'active',
    });
    const membership = await store.createHouseholdMembership({
      tenantId: 'tenant-1',
      householdId: HOUSEHOLD_ID,
      personId: PERSON_ID,
      role: 'head',
      isCurrent: true,
    });
    const memberships = await store.listHouseholdMemberships({
      tenantId: 'tenant-1',
      householdId: HOUSEHOLD_ID,
      isCurrent: true,
    });

    expect(household.id).toBe(HOUSEHOLD_ID);
    expect(membership.householdId).toBe(HOUSEHOLD_ID);
    expect(memberships).toEqual([expect.objectContaining({ id: MEMBERSHIP_ID })]);
    expect(getFixture('people.household_memberships').inserted[0]).toMatchObject({
      household_id: HOUSEHOLD_ID,
      person_id: PERSON_ID,
      role: 'head',
      is_current: true,
    });
    expect(getFixture('people.household_memberships').joinCalls).toEqual([
      {
        table: 'households',
        left: 'households.id',
        operator: '=',
        right: 'household_memberships.household_id',
      },
    ]);
  });

  it('creates, gets, and lists contact points, links, and events within tenant scope', async () => {
    const contactPointRow = {
      id: CONTACT_POINT_ID,
      tenant_id: 'tenant-1',
      type: 'phone',
      normalized_value: '+12605551212',
      raw_value: '(260) 555-1212',
      status: 'active_personal',
      first_seen_at_utc: '2026-03-21T12:03:00.000Z',
      last_seen_at_utc: '2026-03-21T12:03:00.000Z',
      last_inbound_at_utc: null,
      last_outbound_at_utc: null,
      suspected_shared: false,
      confirmed_shared: false,
      reassignment_suspected: false,
      created_at_utc: '2026-03-21T12:03:00.000Z',
      updated_at_utc: '2026-03-21T12:03:00.000Z',
    };
    const linkRow = {
      id: CONTACT_POINT_LINK_ID,
      contact_point_id: CONTACT_POINT_ID,
      subject_type: 'person',
      subject_id: PERSON_ID,
      link_type: 'primary',
      confidence_band: 'high',
      is_current: true,
      is_primary: true,
      manually_confirmed: false,
      confirmation_source: null,
      first_linked_at_utc: '2026-03-21T12:04:00.000Z',
      last_confirmed_at_utc: null,
      last_used_at_utc: null,
      linked_by: 'system',
      linked_by_user_id: null,
      unlink_reason: null,
      unlinked_at_utc: null,
      created_at_utc: '2026-03-21T12:04:00.000Z',
      updated_at_utc: '2026-03-21T12:04:00.000Z',
    };
    const eventRow = {
      id: CONTACT_POINT_EVENT_ID,
      tenant_id: 'tenant-1',
      contact_point_id: CONTACT_POINT_ID,
      event_type: 'inbound_seen',
      event_source: 'peoplecore',
      related_object_type: 'conversation',
      related_object_id: 'conversation-1',
      created_at_utc: '2026-03-21T12:05:00.000Z',
    };
    const { knex, getFixture } = buildKnexMock({
      'people.contact_points': {
        rows: [contactPointRow],
        firstQueue: [contactPointRow, contactPointRow, contactPointRow],
        returningQueue: [[contactPointRow]],
      },
      'people.contact_point_links': {
        rows: [linkRow],
        returningQueue: [[linkRow]],
      },
      'people.contact_point_events': {
        rows: [eventRow],
        returningQueue: [[eventRow]],
      },
    });
    const store = new KnexPeopleCoreStore(knex);

    const contactPoint = await store.createContactPoint({
      tenantId: 'tenant-1',
      type: 'phone',
      normalizedValue: '+12605551212',
      rawValue: '(260) 555-1212',
      status: 'active_personal',
      firstSeenAt: '2026-03-21T12:03:00.000Z',
      lastSeenAt: '2026-03-21T12:03:00.000Z',
      suspectedShared: false,
      confirmedShared: false,
      reassignmentSuspected: false,
    });
    const found = await store.getContactPoint({
      tenantId: 'tenant-1',
      contactPointId: CONTACT_POINT_ID,
    });
    const listed = await store.listContactPointsByNormalizedValue({
      tenantId: 'tenant-1',
      type: 'phone',
      normalizedValue: '+12605551212',
    });
    const link = await store.createContactPointLink({
      tenantId: 'tenant-1',
      contactPointId: CONTACT_POINT_ID,
      subjectType: 'person',
      subjectId: PERSON_ID,
      linkType: 'primary',
      confidenceBand: 'high',
      isCurrent: true,
      isPrimary: true,
      manuallyConfirmed: false,
      firstLinkedAt: '2026-03-21T12:04:00.000Z',
      linkedBy: 'system',
    });
    const links = await store.listCurrentContactPointLinks({
      tenantId: 'tenant-1',
      contactPointId: CONTACT_POINT_ID,
    });
    const event = await store.appendContactPointEvent({
      tenantId: 'tenant-1',
      contactPointId: CONTACT_POINT_ID,
      eventType: 'inbound_seen',
      eventSource: 'peoplecore',
      relatedObjectType: 'conversation',
      relatedObjectId: 'conversation-1',
    });
    const events = await store.listContactPointEvents({
      tenantId: 'tenant-1',
      contactPointId: CONTACT_POINT_ID,
      limit: 10,
    });

    expect(contactPoint.id).toBe(CONTACT_POINT_ID);
    expect(found?.id).toBe(CONTACT_POINT_ID);
    expect(listed).toEqual([expect.objectContaining({ id: CONTACT_POINT_ID })]);
    expect(link.id).toBe(CONTACT_POINT_LINK_ID);
    expect(links).toEqual([expect.objectContaining({ id: CONTACT_POINT_LINK_ID })]);
    expect(event.tenantId).toBe('tenant-1');
    expect(events).toEqual([expect.objectContaining({ id: CONTACT_POINT_EVENT_ID })]);
    expect(getFixture('people.contact_point_links').joinCalls).toEqual([
      {
        table: 'contact_points',
        left: 'contact_points.id',
        operator: '=',
        right: 'contact_point_links.contact_point_id',
      },
    ]);
    expect(getFixture('people.contact_point_events').limitCalls).toEqual([10]);
  });

  it('creates, gets, and lists resolver reviews with JSON-backed arrays', async () => {
    const reviewRow = {
      id: RESOLVER_REVIEW_ID,
      tenant_id: 'tenant-1',
      org_unit_id: 'org-1',
      review_type: 'identity_conflict',
      review_status: 'pending',
      priority: 'normal',
      trigger_source_type: 'conversation',
      trigger_source_id: 'conversation-1',
      conversation_id: 'conversation-1',
      provisional_person_id: PERSON_ID,
      candidate_person_ids: ['person-a', 'person-b'],
      contact_point_id: CONTACT_POINT_ID,
      confidence_band: 'high',
      confidence_reasons: ['exact phone match'],
      risk_flags: ['duplicate_creation_attempt'],
      requested_by_user_id: 'user-1',
      assigned_resolver_user_id: null,
      requested_at_utc: '2026-03-21T12:06:00.000Z',
      started_at_utc: null,
      resolved_at_utc: null,
      resolution_type: null,
      resolution_reason: null,
      resolution_notes: null,
    };
    const { knex, getFixture } = buildKnexMock({
      'people.resolver_reviews': {
        rows: [reviewRow],
        firstQueue: [reviewRow],
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
      triggerSourceType: 'conversation',
      triggerSourceId: 'conversation-1',
      conversationId: 'conversation-1',
      provisionalPersonId: PERSON_ID,
      candidatePersonIds: ['person-a', 'person-b'],
      contactPointId: CONTACT_POINT_ID,
      confidenceBand: 'high',
      confidenceReasons: ['exact phone match'],
      riskFlags: ['duplicate_creation_attempt'],
      requestedByUserId: 'user-1',
      requestedAt: '2026-03-21T12:06:00.000Z',
    });
    const found = await store.getResolverReview({
      tenantId: 'tenant-1',
      reviewId: RESOLVER_REVIEW_ID,
    });
    const listed = await store.listResolverReviews({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
    });

    expect(created.candidatePersonIds).toEqual(['person-a', 'person-b']);
    expect(found?.riskFlags).toEqual(['duplicate_creation_attempt']);
    expect(listed).toEqual([expect.objectContaining({ id: RESOLVER_REVIEW_ID })]);
    expect(getFixture('people.resolver_reviews').inserted[0]).toMatchObject({
      tenant_id: 'tenant-1',
      org_unit_id: 'org-1',
      candidate_person_ids: JSON.stringify(['person-a', 'person-b']),
      confidence_reasons: JSON.stringify(['exact phone match']),
      risk_flags: JSON.stringify(['duplicate_creation_attempt']),
    });
  });

  it('rejects contact point links when the contact point is outside tenant scope', async () => {
    const { knex } = buildKnexMock({
      'people.contact_points': {
        firstQueue: [null],
      },
    });
    const store = new KnexPeopleCoreStore(knex);

    await expect(
      store.createContactPointLink({
        tenantId: 'tenant-1',
        contactPointId: CONTACT_POINT_ID,
        subjectType: 'person',
        subjectId: PERSON_ID,
        linkType: 'primary',
        confidenceBand: 'high',
        isCurrent: true,
        isPrimary: true,
        manuallyConfirmed: false,
        firstLinkedAt: '2026-03-21T12:04:00.000Z',
        linkedBy: 'system',
      }),
    ).rejects.toBeInstanceOf(PeopleCoreScopeViolationError);
  });
});
