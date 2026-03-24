import { AsyncPeopleCoreService } from '../service';
import { KnexPeopleCoreStore } from '../store';

const FIXED_NOW = '2026-03-24T15:30:00.000Z';
const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const ORG_UNIT_ID = '22222222-2222-4222-8222-222222222222';
const PROVISIONAL_PERSON_ID = '33333333-3333-4333-8333-333333333333';
const CANONICAL_PERSON_ID = '44444444-4444-4444-8444-444444444444';
const OTHER_HOUSEHOLD_ID = '55555555-5555-4555-8555-555555555555';
const PROVISIONAL_HOUSEHOLD_ID = '66666666-6666-4666-8666-666666666666';
const CONTACT_POINT_ID = '77777777-7777-4777-8777-777777777777';
const PROVISIONAL_LINK_ID = '88888888-8888-4888-8888-888888888888';
const CANONICAL_LINK_ID = '99999999-9999-4999-8999-999999999999';
const MERGE_USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

type QueryRow = Record<string, any>;
type QueryTables = Record<string, QueryRow[]>;

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const normalizeColumn = (column: string): string => column.split('.').pop() || column;

const projectRow = <T extends QueryRow>(row: T, columns?: readonly string[]): T => {
  if (!columns || columns.length === 0) {
    return deepClone(row);
  }

  return columns.reduce((projected, column) => {
    projected[normalizeColumn(column)] = row[normalizeColumn(column)];
    return projected;
  }, {} as QueryRow) as T;
};

const buildInsertedRow = (tableKey: string, input: QueryRow, nextId: () => string): QueryRow => {
  switch (tableKey) {
    case 'people.persons':
      return {
        id: input.id ?? nextId(),
        tenant_id: input.tenant_id,
        org_unit_id: input.org_unit_id,
        first_name: input.first_name ?? '',
        last_name: input.last_name ?? '',
        preferred_name: input.preferred_name ?? null,
        status: input.status ?? 'active_provisional',
        merged_into_person_id: input.merged_into_person_id ?? null,
        created_at_utc: input.created_at_utc ?? FIXED_NOW,
        updated_at_utc: input.updated_at_utc ?? FIXED_NOW,
      };
    case 'people.contact_point_links':
      return {
        id: input.id ?? nextId(),
        contact_point_id: input.contact_point_id,
        subject_type: input.subject_type,
        subject_id: input.subject_id,
        link_type: input.link_type,
        confidence_band: input.confidence_band,
        is_current: input.is_current,
        is_primary: input.is_primary,
        manually_confirmed: input.manually_confirmed,
        confirmation_source: input.confirmation_source ?? null,
        first_linked_at_utc: input.first_linked_at_utc,
        last_confirmed_at_utc: input.last_confirmed_at_utc ?? null,
        last_used_at_utc: input.last_used_at_utc ?? null,
        linked_by: input.linked_by,
        linked_by_user_id: input.linked_by_user_id ?? null,
        unlink_reason: input.unlink_reason ?? null,
        unlinked_at_utc: input.unlinked_at_utc ?? null,
        merged_into_subject_id: input.merged_into_subject_id ?? null,
        merged_at_utc: input.merged_at_utc ?? null,
        merged_by_user_id: input.merged_by_user_id ?? null,
        merge_class: input.merge_class ?? 'auto',
        merge_reason: input.merge_reason ?? null,
        created_at_utc: input.created_at_utc ?? FIXED_NOW,
        updated_at_utc: input.updated_at_utc ?? FIXED_NOW,
      };
    case 'people.resolver_reviews':
      return {
        id: input.id ?? nextId(),
        tenant_id: input.tenant_id,
        org_unit_id: input.org_unit_id,
        review_type: input.review_type,
        review_status: input.review_status,
        priority: input.priority,
        trigger_source_type: input.trigger_source_type,
        trigger_source_id: input.trigger_source_id,
        conversation_id: input.conversation_id ?? null,
        provisional_person_id: input.provisional_person_id ?? null,
        candidate_person_ids: typeof input.candidate_person_ids === 'string'
          ? JSON.parse(input.candidate_person_ids)
          : (input.candidate_person_ids ?? []),
        contact_point_id: input.contact_point_id ?? null,
        confidence_band: input.confidence_band,
        confidence_reasons: typeof input.confidence_reasons === 'string'
          ? JSON.parse(input.confidence_reasons)
          : (input.confidence_reasons ?? []),
        risk_flags: typeof input.risk_flags === 'string'
          ? JSON.parse(input.risk_flags)
          : (input.risk_flags ?? []),
        requested_by_user_id: input.requested_by_user_id,
        assigned_resolver_user_id: input.assigned_resolver_user_id ?? null,
        requested_at_utc: input.requested_at_utc ?? FIXED_NOW,
        started_at_utc: input.started_at_utc ?? null,
        resolved_at_utc: input.resolved_at_utc ?? null,
        resolution_type: input.resolution_type ?? null,
        resolution_reason: input.resolution_reason ?? null,
        resolution_notes: input.resolution_notes ?? null,
      };
    default:
      return {
        id: input.id ?? nextId(),
        ...input,
      };
  }
};

const createStatefulKnexMock = (initialTables: QueryTables) => {
  const tables: QueryTables = Object.fromEntries(
    Object.entries(initialTables).map(([key, rows]) => [key, deepClone(rows)]),
  );
  const idCounters = new Map<string, number>();

  const nextIdForTable = (tableKey: string): string => {
    const next = (idCounters.get(tableKey) ?? 0) + 1;
    idCounters.set(tableKey, next);
    return `${tableKey.replace(/[.]/g, '_')}_${next}`;
  };

  const getRows = (tableKey: string): QueryRow[] => {
    if (!tables[tableKey]) {
      tables[tableKey] = [];
    }

    return tables[tableKey];
  };

  const knex: any = {
    fn: {
      now: () => FIXED_NOW,
    },
    transaction: async (callback: (trx: any) => Promise<unknown>) => callback(knex),
    withSchema: (schema: string) => ({
      table: (tableName: string) => {
        const tableKey = `${schema}.${tableName}`;
        const filters: Array<(row: QueryRow) => boolean> = [];
        const orderings: Array<{ column: string; direction: 'asc' | 'desc' }> = [];

        const applyFilters = (): QueryRow[] => {
          const filtered = getRows(tableKey).filter((row) => filters.every((filter) => filter(row)));

          return [...filtered].sort((left, right) => {
            for (const ordering of orderings) {
              const column = normalizeColumn(ordering.column);
              const leftValue = left[column];
              const rightValue = right[column];
              if (leftValue === rightValue) {
                continue;
              }

              if (leftValue == null) {
                return ordering.direction === 'asc' ? -1 : 1;
              }

              if (rightValue == null) {
                return ordering.direction === 'asc' ? 1 : -1;
              }

              if (leftValue < rightValue) {
                return ordering.direction === 'asc' ? -1 : 1;
              }

              if (leftValue > rightValue) {
                return ordering.direction === 'asc' ? 1 : -1;
              }
            }

            return 0;
          });
        };

        const builder: any = {
          where: (clause: QueryRow) => {
            filters.push((row) =>
              Object.entries(clause).every(([column, value]) => row[normalizeColumn(column)] === value));
            return builder;
          },
          whereIn: (column: string, values: readonly unknown[]) => {
            const normalizedColumn = normalizeColumn(column);
            filters.push((row) => values.includes(row[normalizedColumn]));
            return builder;
          },
          orderBy: (column: string, direction: 'asc' | 'desc' = 'asc') => {
            orderings.push({ column, direction });
            return builder;
          },
          first: async (columns?: readonly string[]) => {
            const row = applyFilters()[0];
            return row ? projectRow(row, columns) : null;
          },
          select: async (columns?: readonly string[]) => applyFilters().map((row) => projectRow(row, columns)),
          insert: (value: QueryRow | QueryRow[]) => {
            const inputs = Array.isArray(value) ? value : [value];
            const insertedRows = inputs.map((row) =>
              buildInsertedRow(tableKey, row, () => nextIdForTable(tableKey)));
            getRows(tableKey).push(...insertedRows);

            return {
              returning: async (columns?: readonly string[]) =>
                insertedRows.map((row) => projectRow(row, columns)),
            };
          },
          update: async (patch: QueryRow) => {
            const rows = applyFilters();
            rows.forEach((row) => {
              Object.assign(row, patch);
            });
            return rows.length;
          },
        };

        return builder;
      },
    }),
  };

  return {
    knex,
    tables,
  };
};

const basePersonRow = (input: {
  id: string;
  status: string;
  mergedIntoPersonId?: string | null;
}): QueryRow => ({
  id: input.id,
  tenant_id: TENANT_ID,
  org_unit_id: ORG_UNIT_ID,
  first_name: input.id === PROVISIONAL_PERSON_ID ? 'Provisional' : 'Canonical',
  last_name: 'Person',
  preferred_name: null,
  status: input.status,
  merged_into_person_id: input.mergedIntoPersonId ?? null,
  created_at_utc: '2026-03-24T10:00:00.000Z',
  updated_at_utc: '2026-03-24T10:00:00.000Z',
});

const baseContactPointRow = (): QueryRow => ({
  id: CONTACT_POINT_ID,
  tenant_id: TENANT_ID,
  type: 'phone',
  normalized_value: '+12605551212',
  raw_value: '(260) 555-1212',
  status: 'active_personal',
  first_seen_at_utc: '2026-03-24T10:05:00.000Z',
  last_seen_at_utc: '2026-03-24T10:05:00.000Z',
  last_inbound_at_utc: null,
  last_outbound_at_utc: null,
  suspected_shared: false,
  confirmed_shared: false,
  reassignment_suspected: false,
  created_at_utc: '2026-03-24T10:05:00.000Z',
  updated_at_utc: '2026-03-24T10:05:00.000Z',
});

const baseContactPointLinkRow = (input: {
  id: string;
  subjectId: string;
  isPrimary?: boolean;
  isCurrent?: boolean;
}): QueryRow => ({
  id: input.id,
  contact_point_id: CONTACT_POINT_ID,
  subject_type: 'person',
  subject_id: input.subjectId,
  link_type: 'primary',
  confidence_band: 'high',
  is_current: input.isCurrent ?? true,
  is_primary: input.isPrimary ?? true,
  manually_confirmed: false,
  confirmation_source: null,
  first_linked_at_utc: '2026-03-24T10:10:00.000Z',
  last_confirmed_at_utc: null,
  last_used_at_utc: null,
  linked_by: 'system',
  linked_by_user_id: null,
  unlink_reason: null,
  unlinked_at_utc: null,
  merged_into_subject_id: null,
  merged_at_utc: null,
  merged_by_user_id: null,
  merge_class: 'auto',
  merge_reason: null,
  created_at_utc: '2026-03-24T10:10:00.000Z',
  updated_at_utc: '2026-03-24T10:10:00.000Z',
});

const buildService = (initialTables: QueryTables) => {
  const { knex, tables } = createStatefulKnexMock(initialTables);
  const publisher = {
    publishPersonMerged: jest.fn(async () => undefined),
  };
  const store = new KnexPeopleCoreStore(knex);
  const service = new AsyncPeopleCoreService(store, publisher);

  return {
    service,
    store,
    publisher,
    tables,
  };
};

describe('PeopleCore mergePerson', () => {
  it('marks the provisional person merged, preserves the canonical person, and copies auto-merged links', async () => {
    const { service, store, publisher, tables } = buildService({
      'people.persons': [
        basePersonRow({ id: PROVISIONAL_PERSON_ID, status: 'active_provisional' }),
        basePersonRow({ id: CANONICAL_PERSON_ID, status: 'active_confirmed' }),
      ],
      'people.contact_points': [baseContactPointRow()],
      'people.contact_point_links': [
        baseContactPointLinkRow({ id: PROVISIONAL_LINK_ID, subjectId: PROVISIONAL_PERSON_ID }),
      ],
      'people.household_memberships': [],
      'people.households': [],
      'people.resolver_reviews': [],
    });

    await expect(service.getPersonMergeStatus({
      tenantId: TENANT_ID,
      personId: PROVISIONAL_PERSON_ID,
    })).resolves.toBe('provisional');

    const result = await service.mergePerson({
      tenantId: TENANT_ID,
      orgUnitId: ORG_UNIT_ID,
      provisionalPersonId: PROVISIONAL_PERSON_ID,
      canonicalPersonId: CANONICAL_PERSON_ID,
      performedByUserId: MERGE_USER_ID,
      mergeReason: 'resolver duplicate cleanup',
    });

    expect(result).toMatchObject({
      mergedProvisionalPersonId: PROVISIONAL_PERSON_ID,
      canonicalPersonId: CANONICAL_PERSON_ID,
      autoMergedContactPointLinkIds: [PROVISIONAL_LINK_ID],
      reviewContactPointLinkIds: [],
      resolverReviewId: undefined,
      didPersistMerge: true,
    });

    const provisionalPerson = await store.getPerson({
      tenantId: TENANT_ID,
      personId: PROVISIONAL_PERSON_ID,
    });
    const canonicalPerson = await store.getPerson({
      tenantId: TENANT_ID,
      personId: CANONICAL_PERSON_ID,
    });

    expect(provisionalPerson).toMatchObject({
      id: PROVISIONAL_PERSON_ID,
      status: 'merged',
      mergedIntoPersonId: CANONICAL_PERSON_ID,
    });
    expect(canonicalPerson).toMatchObject({
      id: CANONICAL_PERSON_ID,
      status: 'active_confirmed',
      mergedIntoPersonId: undefined,
    });
    await expect(service.getPersonMergeStatus({
      tenantId: TENANT_ID,
      personId: PROVISIONAL_PERSON_ID,
    })).resolves.toBe('merged');
    await expect(service.getPersonMergeStatus({
      tenantId: TENANT_ID,
      personId: CANONICAL_PERSON_ID,
    })).resolves.toBe('canonical');

    const updatedProvisionalLink = tables['people.contact_point_links']
      .find((row) => row.id === PROVISIONAL_LINK_ID);
    const insertedCanonicalLinks = tables['people.contact_point_links']
      .filter((row) => row.subject_id === CANONICAL_PERSON_ID);

    expect(updatedProvisionalLink).toMatchObject({
      id: PROVISIONAL_LINK_ID,
      is_current: false,
      merged_into_subject_id: CANONICAL_PERSON_ID,
      merged_by_user_id: MERGE_USER_ID,
      merge_class: 'auto',
      merge_reason: 'resolver duplicate cleanup',
    });
    expect(insertedCanonicalLinks).toHaveLength(1);
    expect(insertedCanonicalLinks[0]).toMatchObject({
      contact_point_id: CONTACT_POINT_ID,
      subject_id: CANONICAL_PERSON_ID,
      is_current: true,
      is_primary: true,
      first_linked_at_utc: '2026-03-24T10:10:00.000Z',
      merge_class: 'auto',
    });

    expect(publisher.publishPersonMerged).toHaveBeenCalledTimes(1);
    expect(publisher.publishPersonMerged).toHaveBeenCalledWith(expect.objectContaining({
      provisionalPersonId: PROVISIONAL_PERSON_ID,
      canonicalPersonId: CANONICAL_PERSON_ID,
      autoMergedContactPointLinkIds: [PROVISIONAL_LINK_ID],
      reviewContactPointLinkIds: [],
      mergeReason: 'resolver duplicate cleanup',
    }));
  });

  it('returns review items and creates a merge review when the same contact point has competing primaries', async () => {
    const { service, publisher, tables } = buildService({
      'people.persons': [
        basePersonRow({ id: PROVISIONAL_PERSON_ID, status: 'active_provisional' }),
        basePersonRow({ id: CANONICAL_PERSON_ID, status: 'active_confirmed' }),
      ],
      'people.contact_points': [baseContactPointRow()],
      'people.contact_point_links': [
        baseContactPointLinkRow({ id: PROVISIONAL_LINK_ID, subjectId: PROVISIONAL_PERSON_ID }),
        baseContactPointLinkRow({ id: CANONICAL_LINK_ID, subjectId: CANONICAL_PERSON_ID }),
      ],
      'people.household_memberships': [],
      'people.households': [],
      'people.resolver_reviews': [],
    });

    const result = await service.mergePerson({
      tenantId: TENANT_ID,
      orgUnitId: ORG_UNIT_ID,
      provisionalPersonId: PROVISIONAL_PERSON_ID,
      canonicalPersonId: CANONICAL_PERSON_ID,
      performedByUserId: MERGE_USER_ID,
    });

    expect(result.autoMergedContactPointLinkIds).toEqual([]);
    expect(result.reviewContactPointLinkIds).toEqual([PROVISIONAL_LINK_ID]);
    expect(result.resolverReviewId).toBeDefined();

    const provisionalLink = tables['people.contact_point_links']
      .find((row) => row.id === PROVISIONAL_LINK_ID);
    expect(provisionalLink).toMatchObject({
      id: PROVISIONAL_LINK_ID,
      is_current: true,
      merged_into_subject_id: null,
      merged_at_utc: null,
    });

    expect(tables['people.contact_point_links']
      .filter((row) => row.subject_id === CANONICAL_PERSON_ID)).toHaveLength(1);

    expect(tables['people.resolver_reviews']).toHaveLength(1);
    expect(tables['people.resolver_reviews'][0]).toMatchObject({
      id: result.resolverReviewId,
      review_type: 'merge_review',
      trigger_source_type: 'person_merge',
      contact_point_id: CONTACT_POINT_ID,
      provisional_person_id: PROVISIONAL_PERSON_ID,
    });

    expect(publisher.publishPersonMerged).toHaveBeenCalledTimes(1);
    expect(publisher.publishPersonMerged).toHaveBeenCalledWith(expect.objectContaining({
      reviewContactPointLinkIds: [PROVISIONAL_LINK_ID],
      resolverReviewId: result.resolverReviewId,
    }));
  });

  it('creates a merge review for household ambiguity while still auto-merging non-conflicting contact links', async () => {
    const { service, tables } = buildService({
      'people.persons': [
        basePersonRow({ id: PROVISIONAL_PERSON_ID, status: 'active_provisional' }),
        basePersonRow({ id: CANONICAL_PERSON_ID, status: 'active_confirmed' }),
      ],
      'people.contact_points': [baseContactPointRow()],
      'people.contact_point_links': [
        baseContactPointLinkRow({ id: PROVISIONAL_LINK_ID, subjectId: PROVISIONAL_PERSON_ID }),
      ],
      'people.households': [
        {
          id: PROVISIONAL_HOUSEHOLD_ID,
          tenant_id: TENANT_ID,
          org_unit_id: ORG_UNIT_ID,
          name: 'Provisional household',
          status: 'active',
          created_at_utc: FIXED_NOW,
          updated_at_utc: FIXED_NOW,
        },
        {
          id: OTHER_HOUSEHOLD_ID,
          tenant_id: TENANT_ID,
          org_unit_id: ORG_UNIT_ID,
          name: 'Canonical household',
          status: 'active',
          created_at_utc: FIXED_NOW,
          updated_at_utc: FIXED_NOW,
        },
      ],
      'people.household_memberships': [
        {
          id: 'membership_provisional',
          household_id: PROVISIONAL_HOUSEHOLD_ID,
          person_id: PROVISIONAL_PERSON_ID,
          role: 'member',
          is_current: true,
          start_at_utc: FIXED_NOW,
          end_at_utc: null,
          created_at_utc: FIXED_NOW,
          updated_at_utc: FIXED_NOW,
        },
        {
          id: 'membership_canonical',
          household_id: OTHER_HOUSEHOLD_ID,
          person_id: CANONICAL_PERSON_ID,
          role: 'member',
          is_current: true,
          start_at_utc: FIXED_NOW,
          end_at_utc: null,
          created_at_utc: FIXED_NOW,
          updated_at_utc: FIXED_NOW,
        },
      ],
      'people.resolver_reviews': [],
    });

    const result = await service.mergePerson({
      tenantId: TENANT_ID,
      orgUnitId: ORG_UNIT_ID,
      provisionalPersonId: PROVISIONAL_PERSON_ID,
      canonicalPersonId: CANONICAL_PERSON_ID,
      performedByUserId: MERGE_USER_ID,
    });

    expect(result.autoMergedContactPointLinkIds).toEqual([PROVISIONAL_LINK_ID]);
    expect(result.reviewContactPointLinkIds).toEqual([]);
    expect(result.resolverReviewId).toBeDefined();
    expect(tables['people.resolver_reviews']).toHaveLength(1);
    expect(tables['people.resolver_reviews'][0].confidence_reasons).toEqual(expect.arrayContaining([
      'Manual review required because the people have ambiguous current household memberships.',
    ]));
  });

  it('is idempotent for the same provisional and canonical pair', async () => {
    const { service, publisher, tables } = buildService({
      'people.persons': [
        basePersonRow({ id: PROVISIONAL_PERSON_ID, status: 'active_provisional' }),
        basePersonRow({ id: CANONICAL_PERSON_ID, status: 'active_confirmed' }),
      ],
      'people.contact_points': [baseContactPointRow()],
      'people.contact_point_links': [
        baseContactPointLinkRow({ id: PROVISIONAL_LINK_ID, subjectId: PROVISIONAL_PERSON_ID }),
      ],
      'people.household_memberships': [],
      'people.households': [],
      'people.resolver_reviews': [],
    });

    const firstResult = await service.mergePerson({
      tenantId: TENANT_ID,
      orgUnitId: ORG_UNIT_ID,
      provisionalPersonId: PROVISIONAL_PERSON_ID,
      canonicalPersonId: CANONICAL_PERSON_ID,
      performedByUserId: MERGE_USER_ID,
    });
    const linkCountAfterFirstMerge = tables['people.contact_point_links'].length;

    const secondResult = await service.mergePerson({
      tenantId: TENANT_ID,
      orgUnitId: ORG_UNIT_ID,
      provisionalPersonId: PROVISIONAL_PERSON_ID,
      canonicalPersonId: CANONICAL_PERSON_ID,
      performedByUserId: MERGE_USER_ID,
    });

    expect(firstResult.autoMergedContactPointLinkIds).toEqual([PROVISIONAL_LINK_ID]);
    expect(secondResult).toMatchObject({
      mergedProvisionalPersonId: PROVISIONAL_PERSON_ID,
      canonicalPersonId: CANONICAL_PERSON_ID,
      autoMergedContactPointLinkIds: [PROVISIONAL_LINK_ID],
      reviewContactPointLinkIds: [],
      didPersistMerge: false,
    });
    expect(tables['people.contact_point_links']).toHaveLength(linkCountAfterFirstMerge);
    expect(publisher.publishPersonMerged).toHaveBeenCalledTimes(1);
  });
});
