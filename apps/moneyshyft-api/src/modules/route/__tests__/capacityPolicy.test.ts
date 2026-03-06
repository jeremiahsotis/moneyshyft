import { evaluateDonorIntakeCapacity } from '../domain/capacityPolicy';

describe('MoneyShyft donor intake capacity policy', () => {
  it('returns deterministic slot ordering when capacity is available', () => {
    const result = evaluateDonorIntakeCapacity(
      {
        requestedWindowStartUtc: '2026-02-27T14:00:00.000Z',
        requestedWindowEndUtc: '2026-02-27T16:00:00.000Z',
        itemCount: 2,
        forceRefusal: false,
      },
      [],
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.slots.length).toBeGreaterThan(0);
    const starts = result.slots.map((slot) => slot.slotStartUtc);
    expect(starts).toEqual([...starts].sort((left, right) => left.localeCompare(right)));
  });

  it('returns structured alternatives when capacity is refused', () => {
    const result = evaluateDonorIntakeCapacity(
      {
        requestedWindowStartUtc: '2026-02-27T14:00:00.000Z',
        requestedWindowEndUtc: '2026-02-27T16:00:00.000Z',
        itemCount: 8,
        forceRefusal: false,
      },
      [],
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.code).toBe('MONEYSHYFT_DONOR_INTAKE_REFUSED_CAPACITY');
    expect(result.alternatives.length).toBeGreaterThan(0);
    expect(result.nextSteps.length).toBeGreaterThan(0);
  });
});
