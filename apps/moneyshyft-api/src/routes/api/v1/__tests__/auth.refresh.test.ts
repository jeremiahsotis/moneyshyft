import { V1_ROUTE_REGISTRATIONS } from '../../../../api/registerRoutes';

describe('money-api auth ownership boundary', () => {
  it('does not mount /api/v1/auth because admin-api is the canonical owner', () => {
    expect(
      V1_ROUTE_REGISTRATIONS.some((registration) => registration.path === '/api/v1/auth')
    ).toBe(false);
  });
});
