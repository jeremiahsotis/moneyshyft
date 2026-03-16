import { V1_ROUTE_REGISTRATIONS } from '../../../../api/registerRoutes';

describe('money-api platform-admin console ownership boundary', () => {
  it('does not mount platform admin console routes through MoneyShyft', () => {
    const platformAdminRegistrations = V1_ROUTE_REGISTRATIONS.filter(
      (registration) => registration.path === '/api/v1/platform/admin'
    );

    expect(platformAdminRegistrations).toHaveLength(0);
  });
});
