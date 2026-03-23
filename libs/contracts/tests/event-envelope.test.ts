import { validateEventEnvelope } from '../src/event-envelope';

describe('EventEnvelope contract', () => {
  it('passes with valid shape', () => {
    expect(() =>
      validateEventEnvelope({
        id: '1',
        type: 'test.event',
        source: 'unit',
        tenantId: 'tenant-1',
        orgUnitId: 'org-1',
        subject: { orgUnitId: 'org-1' },
        payload: {},
        createdAt: new Date().toISOString(),
      }),
    ).not.toThrow();
  });

  it('fails with missing id', () => {
    expect(() =>
      validateEventEnvelope({
        type: 'test.event',
        source: 'unit',
        tenantId: 'tenant-1',
        orgUnitId: 'org-1',
        subject: { orgUnitId: 'org-1' },
        payload: {},
        createdAt: new Date().toISOString(),
      } as any),
    ).toThrow('Missing id');
  });

  it('fails when subject carries both person identities', () => {
    expect(() =>
      validateEventEnvelope({
        id: '1',
        type: 'test.event',
        source: 'unit',
        tenantId: 'tenant-1',
        orgUnitId: 'org-1',
        subject: {
          orgUnitId: 'org-1',
          personId: 'person-1',
          provisionalPersonId: 'person-2',
        },
        payload: {},
        createdAt: new Date().toISOString(),
      }),
    ).toThrow('SubjectContext cannot include both personId and provisionalPersonId');
  });
});
