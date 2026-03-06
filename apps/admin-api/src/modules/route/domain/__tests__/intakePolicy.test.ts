import { evaluateSharedIntakePolicy, normalizeRouteScheduleMode } from '../intakePolicy';

const basePayload = {
  tenantId: 'tenant-1',
  orgUnitId: 'org-1',
  requestedAtUtc: '2026-02-26T14:00:00.000Z',
  requestedWindowStartUtc: '2026-02-27T14:00:00.000Z',
  requestedWindowEndUtc: '2026-02-27T16:00:00.000Z',
  channel: 'cashier',
  notes: 'intake policy test',
  forceRefusal: false,
  scheduleMode: 'pickup',
};

describe('route intake policy', () => {
  it('defaults missing or unknown schedule mode to pickup-first behavior', () => {
    expect(normalizeRouteScheduleMode(undefined)).toBe('pickup');
    expect(normalizeRouteScheduleMode(null)).toBe('pickup');
    expect(normalizeRouteScheduleMode('')).toBe('pickup');
    expect(normalizeRouteScheduleMode('something-else')).toBe('pickup');
    expect(normalizeRouteScheduleMode('delivery')).toBe('delivery');
  });

  it('rejects delivery windows that extend past 18:00 UTC by minutes', () => {
    const decision = evaluateSharedIntakePolicy({
      ...basePayload,
      scheduleMode: 'delivery',
      requestedWindowStartUtc: '2026-02-27T17:30:00.000Z',
      requestedWindowEndUtc: '2026-02-27T18:30:00.000Z',
    });

    expect(decision).toMatchObject({
      ok: false,
      refusal: {
        reasonCode: 'MONEYSHYFT_DELIVERY_INSERTION_CONSTRAINT',
      },
    });
  });
});
