import type {
  ContactPointReassignmentSuspectedEvent,
  PersonConfirmedEvent,
  PersonProvisionalCreatedEvent,
  ResolverReviewCreatedEvent,
} from '../../src/people';

describe('people event contracts', () => {
  it('supports first PeopleCore event shapes', () => {
    const createdAt = new Date().toISOString();

    const provisionalCreated: PersonProvisionalCreatedEvent = {
      id: 'evt_1',
      type: 'person.provisional_created',
      source: 'peoplecore',
      tenantId: 'tenant_1',
      orgUnitId: 'org_1',
      subject: { orgUnitId: 'org_1' },
      createdAt,
      payload: {
        id: 'person_1',
        tenantId: 'tenant_1',
        orgUnitId: 'org_1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        status: 'active_provisional',
        contactPointId: 'cp_1',
      },
    };

    const confirmed: PersonConfirmedEvent = {
      id: 'evt_2',
      type: 'person.confirmed',
      source: 'peoplecore',
      tenantId: 'tenant_1',
      orgUnitId: 'org_1',
      subject: { orgUnitId: 'org_1' },
      createdAt,
      payload: {
        personId: 'person_1',
        tenantId: 'tenant_1',
        orgUnitId: 'org_1',
        previousStatus: 'active_provisional',
        currentStatus: 'active_confirmed',
        confirmedBy: 'resolver',
      },
    };

    const reassignmentSuspected: ContactPointReassignmentSuspectedEvent = {
      id: 'evt_3',
      type: 'contact_point.reassignment_suspected',
      source: 'peoplecore',
      tenantId: 'tenant_1',
      orgUnitId: 'org_1',
      subject: { orgUnitId: 'org_1' },
      createdAt,
      payload: {
        id: 'cp_1',
        normalizedValue: '+12605551212',
        status: 'reassignment_suspected',
        reassignmentSuspected: true,
        reasons: ['rapid_contact_reuse'],
      },
    };

    const resolverReviewCreated: ResolverReviewCreatedEvent = {
      id: 'evt_4',
      type: 'resolver_review.created',
      source: 'peoplecore',
      tenantId: 'tenant_1',
      orgUnitId: 'org_1',
      subject: { orgUnitId: 'org_1' },
      createdAt,
      payload: {
        id: 'rr_1',
        tenantId: 'tenant_1',
        orgUnitId: 'org_1',
        reviewType: 'identity_conflict',
        reviewStatus: 'pending',
        priority: 'high',
        triggerSourceType: 'conversation',
        triggerSourceId: 'conv_1',
        candidatePersonIds: ['person_1', 'person_2'],
        contactPointId: 'cp_1',
        confidenceBand: 'high',
        riskFlags: ['duplicate_creation_attempt'],
        requestedAt: createdAt,
      },
    };

    expect(provisionalCreated.type).toBe('person.provisional_created');
    expect(confirmed.payload.currentStatus).toBe('active_confirmed');
    expect(reassignmentSuspected.payload.reassignmentSuspected).toBe(true);
    expect(resolverReviewCreated.type).toBe('resolver_review.created');
  });
});
