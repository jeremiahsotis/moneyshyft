import {
  AsyncConnectShyftSmsPreferenceOverrideService,
  ConnectShyftSmsOverridePersistenceUnavailableError,
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

  it('resolves d-4 synthetic NO preferences for outbound policy UX flows', async () => {
    const service = new AsyncConnectShyftSmsPreferenceOverrideService();

    const resolved = await service.resolvePreference({
      tenantId: 'tenant-connectshyft-d4',
      orgUnitId: 'org-connectshyft-d4-east',
      threadId: 'thread-d4-unclaimed-prefers-no-1004',
    });

    expect(resolved).toEqual({
      prefersTexting: 'NO',
      neighborId: null,
      source: 'thread-map',
    });
  });

  it('resolves d-4 CLOSED synthetic NO preferences for reopen-before-override flows', async () => {
    const service = new AsyncConnectShyftSmsPreferenceOverrideService();

    const resolved = await service.resolvePreference({
      tenantId: 'tenant-connectshyft-d4',
      orgUnitId: 'org-connectshyft-d4-east',
      threadId: 'thread-d4-closed-prefers-no-1005',
    });

    expect(resolved).toEqual({
      prefersTexting: 'NO',
      neighborId: null,
      source: 'thread-map',
    });
  });

  it('fails closed when override persistence is unavailable', async () => {
    const missingTableError = Object.assign(
      new Error('relation "connectshyft.cs_sms_preference_overrides" does not exist'),
      { code: '42P01' },
    );
    const store = {
      resolvePreference: async () => ({
        prefersTexting: 'UNKNOWN' as const,
        neighborId: null,
        source: 'unknown' as const,
      }),
      persistOverride: async () => {
        throw missingTableError;
      },
    };
    const service = new AsyncConnectShyftSmsPreferenceOverrideService(store as any);

    await expect(
      service.persistApprovedOverride({
        tenantId: 'tenant-connectshyft-c4',
        orgUnitId: 'org-connectshyft-c4-east',
        threadId: 'thread-c4-unclaimed-pref-no-1004',
        neighborId: null,
        actorUserId: '00000000-0000-4000-8000-000000000001',
        preferenceValue: 'NO',
        override: {
          reason: 'safety-follow-up',
          note: 'Policy-safe follow-up',
        },
        messageBody: 'Checking in',
        messageEventName: 'connectshyft.thread.outbound_message_dispatched',
      }),
    ).rejects.toBeInstanceOf(ConnectShyftSmsOverridePersistenceUnavailableError);
  });

  it('rolls back a persisted override by id when requested', async () => {
    const deleteOverride = jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined);
    const store = {
      resolvePreference: async () => ({
        prefersTexting: 'UNKNOWN' as const,
        neighborId: null,
        source: 'unknown' as const,
      }),
      persistOverride: async () => ({
        overrideId: '83fba1aa-2118-4259-a6bc-f8c4086e44ec',
        tenantId: 'tenant-connectshyft-c4',
        orgUnitId: 'org-connectshyft-c4-east',
        threadId: 'thread-c4-unclaimed-pref-no-1004',
        neighborId: null,
        actorUserId: '00000000-0000-4000-8000-000000000001',
        preferenceValue: 'NO' as const,
        overrideReason: 'safety-follow-up' as const,
        overrideNote: 'Policy-safe follow-up',
        messageBody: 'Checking in',
        messageEventName: 'connectshyft.thread.outbound_message_dispatched',
        auditMetadata: {},
        createdAtUtc: '2026-03-02T00:00:00.000Z',
        durability: 'database' as const,
      }),
      deleteOverride,
    };
    const service = new AsyncConnectShyftSmsPreferenceOverrideService(store as any);

    await service.rollbackApprovedOverride({
      tenantId: 'tenant-connectshyft-c4',
      orgUnitId: 'org-connectshyft-c4-east',
      threadId: 'thread-c4-unclaimed-pref-no-1004',
      overrideId: '83fba1aa-2118-4259-a6bc-f8c4086e44ec',
    });

    expect(deleteOverride).toHaveBeenCalledWith({
      tenantId: 'tenant-connectshyft-c4',
      orgUnitId: 'org-connectshyft-c4-east',
      threadId: 'thread-c4-unclaimed-pref-no-1004',
      overrideId: '83fba1aa-2118-4259-a6bc-f8c4086e44ec',
    });
  });
});
