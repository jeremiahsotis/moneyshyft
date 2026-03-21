import type { Household, HouseholdMembership, Person } from '../../src/people';

describe('people person contracts', () => {
  it('supports first-class person and household identity records', () => {
    const person: Person = {
      id: 'person_1',
      tenantId: 'tenant_1',
      orgUnitId: 'org_1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      preferredName: 'Ada',
      status: 'active_confirmed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const household: Household = {
      id: 'household_1',
      tenantId: 'tenant_1',
      orgUnitId: 'org_1',
      name: 'Lovelace Home',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const membership: HouseholdMembership = {
      id: 'membership_1',
      householdId: household.id,
      personId: person.id,
      role: 'head',
      isCurrent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(person.status).toBe('active_confirmed');
    expect(household.status).toBe('active');
    expect(membership.role).toBe('head');
  });
});
