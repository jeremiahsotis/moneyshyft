import {
  isRouteRefusalReasonCode,
  validateRouteRefusalPayload,
} from '../domain/refusal';

describe('route refusal contract validation', () => {
  it('accepts canonical intake refusal payload with structured alternatives', () => {
    const result = validateRouteRefusalPayload({
      stage: 'intake',
      reasonCode: 'CAPACITY_FULL',
      reasonMessage: 'Morning capacity is full.',
      alternatives: [
        {
          type: 'RESCHEDULE_WINDOW',
          dateLocal: '2026-02-28',
          dayPart: 'afternoon',
          status: 'open',
        },
        {
          type: 'CALLBACK_PATH',
          queue: 'dispatch-review',
          expectedWithinHours: 24,
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected payload to be valid');
    }

    expect(result.value.reasonCode).toBe('CAPACITY_FULL');
    expect(result.value.alternatives).toHaveLength(2);
  });

  it('rejects reason codes that are not valid for the refusal stage', () => {
    const result = validateRouteRefusalPayload({
      stage: 'execution',
      reasonCode: 'NOT_ELIGIBLE_ZIP',
      reasonMessage: 'This request is outside eligibility.',
      alternatives: [
        {
          type: 'PARTNER_REFERRAL',
          partnerName: 'Regional Partner',
          contactPhone: '+12605550199',
        },
      ],
    });

    expect(result).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: 'reasonCode',
        }),
      ]),
    });
  });

  it('rejects free-text alternatives and requires structured objects', () => {
    const result = validateRouteRefusalPayload({
      stage: 'intake',
      reasonCode: 'DAY_PART_NOT_AVAILABLE',
      reasonMessage: 'Requested day part is unavailable.',
      alternatives: ['try next week'],
    });

    expect(result).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: 'alternatives[0]',
        }),
      ]),
    });
  });

  it('requires partner referrals to include contact metadata', () => {
    const result = validateRouteRefusalPayload({
      stage: 'execution',
      reasonCode: 'RESOURCE_UNAVAILABLE',
      reasonMessage: 'No safe loading support is available.',
      alternatives: [
        {
          type: 'PARTNER_REFERRAL',
          partnerName: 'Overflow Partner',
        },
      ],
    });

    expect(result).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: 'alternatives[0]',
        }),
      ]),
    });
  });

  it('exports reason-code type guard for API parsing', () => {
    expect(isRouteRefusalReasonCode('CAPACITY_FULL')).toBe(true);
    expect(isRouteRefusalReasonCode('NOT_A_CODE')).toBe(false);
  });
});
