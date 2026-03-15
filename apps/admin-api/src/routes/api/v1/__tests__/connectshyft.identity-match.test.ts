import { V1_ROUTE_REGISTRATIONS } from '../../../../api/registerRoutes';

describe('admin-api connectshyft route ownership', () => {
  it('does not mount connectshyft identity-match routes from admin-api', () => {
    expect(
      V1_ROUTE_REGISTRATIONS.some((registration) => registration.path === '/api/v1/connectshyft'),
    ).toBe(false);
  });
});
