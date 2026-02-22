import {
  ConnectShyftNumberMappingService,
  InMemoryConnectShyftNumberMappingStore,
} from '../numberMappings';

describe('connectshyft number mapping service', () => {
  let store: InMemoryConnectShyftNumberMappingStore;
  let service: ConnectShyftNumberMappingService;

  beforeEach(() => {
    store = new InMemoryConnectShyftNumberMappingStore();
    service = new ConnectShyftNumberMappingService(store);
  });

  it('supports multiple mapped numbers per orgUnit with deterministic read-back', () => {
    const firstCreate = service.createMapping({
      actorRoles: ['ORGUNIT_ADMIN'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      twilioNumberE164: '+12605550111',
      label: 'Primary Dispatch',
      isActive: true,
    });
    const secondCreate = service.createMapping({
      actorRoles: ['ORGUNIT_ADMIN'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      twilioNumberE164: '+12605550112',
      label: 'Overflow Dispatch',
      isActive: true,
    });

    expect(firstCreate.ok).toBe(true);
    expect(secondCreate.ok).toBe(true);

    if (!secondCreate.ok) {
      throw new Error('Expected second mapping create to succeed');
    }

    expect(secondCreate.data.mappings).toHaveLength(2);
    expect(secondCreate.data.mappings.map((mapping) => mapping.twilioNumberE164)).toEqual([
      '+12605550111',
      '+12605550112',
    ]);
  });

  it('rejects non-E.164 number values before persistence', () => {
    const result = service.createMapping({
      actorRoles: ['ORGUNIT_ADMIN'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      twilioNumberE164: '260-555-0111',
      label: 'Invalid',
      isActive: true,
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NUMBER_MAPPING_INVALID_E164',
      data: {
        fieldErrors: expect.arrayContaining([
          expect.objectContaining({
            field: 'twilioNumberE164',
            reason: 'INVALID_E164',
          }),
        ]),
      },
    });
  });

  it('enforces duplicate tenant number prevention across orgUnits', () => {
    const firstCreate = service.createMapping({
      actorRoles: ['ORGUNIT_ADMIN'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      twilioNumberE164: '+12605550123',
      label: 'East Routing',
      isActive: true,
    });

    const duplicateAttempt = service.createMapping({
      actorRoles: ['ORGUNIT_ADMIN'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-west',
      twilioNumberE164: '+12605550123',
      label: 'West Routing',
      isActive: true,
    });

    expect(firstCreate.ok).toBe(true);
    expect(duplicateAttempt).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NUMBER_MAPPING_DUPLICATE',
      data: {
        fieldErrors: expect.arrayContaining([
          expect.objectContaining({
            field: 'twilioNumberE164',
            reason: 'DUPLICATE_TENANT_NUMBER',
          }),
        ]),
      },
    });
  });

  it('updates an existing mapping and keeps orgUnit multi-number support intact', () => {
    const created = service.createMapping({
      actorRoles: ['ORGUNIT_ADMIN'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      twilioNumberE164: '+12605550111',
      label: 'Primary Dispatch',
      isActive: true,
    });
    service.createMapping({
      actorRoles: ['ORGUNIT_ADMIN'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      twilioNumberE164: '+12605550112',
      label: 'Overflow Dispatch',
      isActive: true,
    });

    if (!created.ok) {
      throw new Error('Expected create to succeed');
    }

    const updated = service.updateMapping({
      actorRoles: ['ORGUNIT_ADMIN'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      mappingId: created.data.mappingId,
      twilioNumberE164: '+12605550119',
      label: 'Primary Dispatch Updated',
      isActive: true,
    });

    expect(updated.ok).toBe(true);
    if (!updated.ok) {
      throw new Error('Expected update to succeed');
    }

    expect(updated.code).toBe('CONNECTSHYFT_NUMBER_MAPPING_UPDATED');
    expect(updated.data.orgUnitId).toBe('org-connectshyft-alpha-east');
    expect(updated.data.mappings).toHaveLength(2);
    expect(updated.data.mappings.map((mapping) => mapping.twilioNumberE164)).toEqual([
      '+12605550112',
      '+12605550119',
    ]);
  });

  it('refuses update when mapping id does not exist in tenant scope', () => {
    const updated = service.updateMapping({
      actorRoles: ['ORGUNIT_ADMIN'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      mappingId: 'mapping-a3-1001',
      twilioNumberE164: '+12605550119',
      label: 'Seedless Update',
      isActive: true,
    });

    expect(updated).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NUMBER_MAPPING_NOT_FOUND',
    });
  });

  it('refuses create and update when actor lacks number-mapping capability', () => {
    const createResult = service.createMapping({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      twilioNumberE164: '+12605550111',
      label: 'Primary Dispatch',
      isActive: true,
    });

    expect(createResult).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NUMBER_MAPPING_FORBIDDEN',
    });

    const updateResult = service.updateMapping({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      mappingId: 'mapping-a3-1001',
      twilioNumberE164: '+12605550119',
      label: 'Seedless Update',
      isActive: true,
    });

    expect(updateResult).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NUMBER_MAPPING_FORBIDDEN',
    });
  });
});

describe('connectshyft number mapping persistence guards', () => {
  let store: InMemoryConnectShyftNumberMappingStore;

  beforeEach(() => {
    store = new InMemoryConnectShyftNumberMappingStore();
  });

  it('enforces tenant number uniqueness at persistence create layer', () => {
    const first = store.createMapping({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      twilioNumberE164: '+12605550123',
      label: 'East',
      isActive: true,
    });
    const duplicate = store.createMapping({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-west',
      twilioNumberE164: '+12605550123',
      label: 'West',
      isActive: true,
    });

    expect(first.ok).toBe(true);
    expect(duplicate).toEqual({
      ok: false,
      reason: 'DUPLICATE_TENANT_NUMBER',
    });
  });

  it('enforces tenant number uniqueness at persistence update layer', () => {
    const first = store.createMapping({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      twilioNumberE164: '+12605550111',
      label: 'Primary',
      isActive: true,
    });
    const second = store.createMapping({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      twilioNumberE164: '+12605550112',
      label: 'Secondary',
      isActive: true,
    });

    if (!first.ok || !second.ok) {
      throw new Error('Expected initial creates to succeed');
    }

    const duplicateUpdate = store.updateMapping({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      mappingId: second.mapping.mappingId,
      twilioNumberE164: first.mapping.twilioNumberE164,
      label: 'Secondary',
      isActive: true,
    });

    expect(duplicateUpdate).toEqual({
      ok: false,
      reason: 'DUPLICATE_TENANT_NUMBER',
    });
  });

  it('rejects mapping id collisions at persistence create layer', () => {
    const initial = store.createMapping({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      mappingId: 'mapping-collision-a3',
      twilioNumberE164: '+12605550901',
      label: 'Primary',
      isActive: true,
    });
    const collided = store.createMapping({
      tenantId: 'tenant-connectshyft-bravo',
      orgUnitId: 'org-connectshyft-bravo-north',
      mappingId: 'mapping-collision-a3',
      twilioNumberE164: '+12605550902',
      label: 'Collision',
      isActive: true,
    });

    expect(initial.ok).toBe(true);
    expect(collided).toEqual({
      ok: false,
      reason: 'MAPPING_ID_CONFLICT',
    });
  });
});
