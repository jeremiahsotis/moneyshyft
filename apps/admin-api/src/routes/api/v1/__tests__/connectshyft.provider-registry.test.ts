import { V1_ROUTE_REGISTRATIONS } from '../../../../api/registerRoutes';

describe('admin-api connectshyft provider-registry route ownership', () => {
  it('does not mount connectshyft provider-registry routes from admin-api', () => {
    expect(
      V1_ROUTE_REGISTRATIONS.some((registration) => registration.path === '/api/v1/connectshyft'),
    ).toBe(false);
  });
});
