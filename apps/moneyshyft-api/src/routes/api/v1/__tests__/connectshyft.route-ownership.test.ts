import { V1_ROUTE_REGISTRATIONS } from '../../../../api/registerRoutes';

describe('connectshyft route ownership', () => {
  it('does not mount connectshyft routes from moneyshyft-api', () => {
    expect(
      V1_ROUTE_REGISTRATIONS.some((registration) => registration.path === '/api/v1/connectshyft'),
    ).toBe(false);
  });
});
