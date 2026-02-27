import {
  AsyncConnectShyftSmsPreferenceOverrideService,
  validateConnectShyftSmsOverride,
} from '../smsPreferenceOverrides';

describe('connectshyft sms preference overrides', () => {
  it('requires override reason when prefers_texting is NO', () => {
    const result = validateConnectShyftSmsOverride({
      prefersTexting: 'NO',
      overrideReason: null,
      overrideNote: null,
    });

    expect(result).toMatchObject({
      ok: false,
      reason: 'required',
    });
  });

  it('rejects invalid override reason when prefers_texting is NO', () => {
    const result = validateConnectShyftSmsOverride({
      prefersTexting: 'NO',
      overrideReason: 'x',
      overrideNote: null,
    });

    expect(result).toMatchObject({
      ok: false,
      reason: 'invalid',
    });
  });

  it('accepts allowed override reason when prefers_texting is NO', () => {
    const result = validateConnectShyftSmsOverride({
      prefersTexting: 'NO',
      overrideReason: 'safety-follow-up',
      overrideNote: 'Operator documented policy exception.',
    });

    expect(result).toEqual({
      ok: true,
      overrideRequired: true,
      override: {
        reason: 'safety-follow-up',
        note: 'Operator documented policy exception.',
      },
    });
  });

  it('resolves synthetic NO preferences without database lookups', async () => {
    const service = new AsyncConnectShyftSmsPreferenceOverrideService();

    const resolved = await service.resolvePreference({
      tenantId: 'tenant-connectshyft-c4',
      orgUnitId: 'org-connectshyft-c4-east',
      threadId: 'thread-c4-unclaimed-pref-no-1004',
    });

    expect(resolved).toEqual({
      prefersTexting: 'NO',
      neighborId: null,
      source: 'thread-map',
    });
  });
});
