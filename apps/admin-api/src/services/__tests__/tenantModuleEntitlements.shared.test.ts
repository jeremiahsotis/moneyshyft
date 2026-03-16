import type { Knex } from 'knex';
import {
  evaluateActorTenantModuleEntitlement,
  evaluateTenantModuleEntitlement,
  type PlatformAdminActorContext,
} from '../../../../../libs/platform/src/tenantModuleEntitlements';

const makeKnexStub = (result: { enabled: boolean } | undefined): Knex => {
  const first = jest.fn().mockResolvedValue(result);
  const where = jest.fn(() => ({ first }));
  const table = jest.fn(() => ({ where }));
  const withSchema = jest.fn(() => ({ table }));
  return { withSchema } as unknown as Knex;
};

describe('shared tenant module entitlement primitive parity', () => {
  const actor: PlatformAdminActorContext = {
    userId: '11111111-1111-4111-8111-111111111111',
    baseRole: 'ORGUNIT_MEMBER',
    headerRoles: [],
    activeTenantId: '22222222-2222-4222-8222-222222222222',
  };

  it('returns missing for invalid tenant ids without querying the database', async () => {
    const knexStub = makeKnexStub({ enabled: true });

    const decision = await evaluateTenantModuleEntitlement(knexStub, 'not-a-uuid', 'connectshyft');

    expect(decision).toEqual({
      tenantId: 'not-a-uuid',
      moduleKey: 'connectshyft',
      enabled: false,
      reason: 'missing',
      refusalCode: 'CONNECTSHYFT_ENTITLEMENT_MISSING',
      message: 'connectshyft entitlement is not configured for this tenant.',
    });
    expect((knexStub.withSchema as unknown as jest.Mock)).not.toHaveBeenCalled();
  });

  it('returns disabled when the entitlement row is disabled', async () => {
    const knexStub = makeKnexStub({ enabled: false });

    const decision = await evaluateTenantModuleEntitlement(
      knexStub,
      '22222222-2222-4222-8222-222222222222',
      'connectshyft'
    );

    expect(decision.reason).toBe('disabled');
    expect(decision.enabled).toBe(false);
    expect(decision.refusalCode).toBe('CONNECTSHYFT_MODULE_DISABLED');
  });

  it('returns enabled when the entitlement row is enabled', async () => {
    const knexStub = makeKnexStub({ enabled: true });

    const decision = await evaluateTenantModuleEntitlement(
      knexStub,
      '22222222-2222-4222-8222-222222222222',
      'moneyshyft'
    );

    expect(decision.reason).toBe('enabled');
    expect(decision.enabled).toBe(true);
    expect(decision.refusalCode).toBe('MONEYSHYFT_ENTITLEMENT_ENABLED');
  });

  it('allows system admin override without querying the database', async () => {
    const knexStub = makeKnexStub({ enabled: false });

    const decision = await evaluateActorTenantModuleEntitlement(
      knexStub,
      { ...actor, baseRole: 'SYSTEM_ADMIN' },
      '22222222-2222-4222-8222-222222222222',
      'connectshyft'
    );

    expect(decision).toEqual({
      tenantId: '22222222-2222-4222-8222-222222222222',
      moduleKey: 'connectshyft',
      enabled: true,
      reason: 'system-admin-override',
      refusalCode: 'CONNECTSHYFT_ENTITLEMENT_ENABLED',
      message: 'connectshyft entitlement is enabled for this tenant.',
    });
    expect((knexStub.withSchema as unknown as jest.Mock)).not.toHaveBeenCalled();
  });
});
