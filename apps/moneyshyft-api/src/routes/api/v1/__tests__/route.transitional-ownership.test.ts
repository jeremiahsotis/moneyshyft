import { V1_ROUTE_REGISTRATIONS } from '../../../../api/registerRoutes';

describe('RouteShyft transitional ownership', () => {
  it('keeps RouteShyft runtime routes mounted in moneyshyft-api during convergence', () => {
    const registeredPaths = V1_ROUTE_REGISTRATIONS.map((registration) => registration.path);

    expect(registeredPaths).toContain('/api/v1/route');
    expect(registeredPaths).toContain('/api/v1/route-bridge');
  });
});
