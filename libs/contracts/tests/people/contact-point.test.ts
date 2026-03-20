import type { ContactPoint, ContactPointLink } from '../../src/people';

describe('people contact point contracts', () => {
  it('allows a first-class contact point shape', () => {
    const cp: ContactPoint = {
      id: 'cp_1',
      tenantId: 'tenant_1',
      type: 'phone',
      normalizedValue: '+12605551212',
      status: 'active_personal',
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      suspectedShared: false,
      confirmedShared: false,
      reassignmentSuspected: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(cp.type).toBe('phone');
  });

  it('allows links without assuming permanent ownership', () => {
    const link: ContactPointLink = {
      id: 'cpl_1',
      contactPointId: 'cp_1',
      subjectType: 'person',
      subjectId: 'person_1',
      linkType: 'primary',
      confidenceBand: 'high',
      isCurrent: true,
      isPrimary: true,
      manuallyConfirmed: true,
      confirmationSource: 'user',
      firstLinkedAt: new Date().toISOString(),
      linkedBy: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(link.subjectType).toBe('person');
  });
});
