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
      threadId: 'cc9bb30e-4b36-4419-8563-819432f4ba14',
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
      threadId: '59b44eb4-c8e7-4cd1-8a22-bbeceb871dd7',
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
      threadId: '06a77807-6575-4c63-8824-38a89f9dae12',
    });

    expect(resolved).toEqual({
      prefersTexting: 'NO',
      neighborId: null,
      source: 'thread-map',
    });
  });

  it('resolves ux-r4 synthetic NO preferences for outbound guardrail UI flows', async () => {
    const service = new AsyncConnectShyftSmsPreferenceOverrideService();

    const unclaimed = await service.resolvePreference({
      tenantId: 'tenant-connectshyft-ux-r4',
      orgUnitId: 'org-connectshyft-ux-r4-east',
      threadId: '21f2866f-37ff-42da-80fc-0b5d2c3bc09d',
    });
    const closed = await service.resolvePreference({
      tenantId: 'tenant-connectshyft-ux-r4',
      orgUnitId: 'org-connectshyft-ux-r4-east',
      threadId: 'e37b00e0-228f-43c0-8c70-b3d0a5bfad40',
    });

    expect(unclaimed).toEqual({
      prefersTexting: 'NO',
      neighborId: null,
      source: 'thread-map',
    });
    expect(closed).toEqual({
      prefersTexting: 'NO',
      neighborId: null,
      source: 'thread-map',
    });
  });

  it('prefers durable neighbor-record preference over thread-map fallback when available', async () => {
    const store = {
      resolvePreference: jest.fn(async () => ({
        prefersTexting: 'YES' as const,
        neighborId: 'neighbor-record-1',
        source: 'neighbor-record' as const,
      })),
    };
    const fallbackStore = {
      resolvePreference: jest.fn(() => ({
        prefersTexting: 'NO' as const,
        neighborId: null,
        source: 'thread-map' as const,
      })),
    };
    const service = new AsyncConnectShyftSmsPreferenceOverrideService(store as any, fallbackStore as any);

    const resolved = await service.resolvePreference({
      tenantId: 'tenant-connectshyft-c4',
      orgUnitId: 'org-connectshyft-c4-east',
      threadId: 'cc9bb30e-4b36-4419-8563-819432f4ba14',
      neighborId: 'neighbor-record-1',
    });

    expect(resolved).toEqual({
      prefersTexting: 'YES',
      neighborId: 'neighbor-record-1',
      source: 'neighbor-record',
    });
    expect(store.resolvePreference).toHaveBeenCalled();
    expect(fallbackStore.resolvePreference).not.toHaveBeenCalled();
  });

  it('uses thread-map fallback when durable neighbor preference is unavailable', async () => {
    const store = {
      resolvePreference: jest.fn(async () => ({
        prefersTexting: 'UNKNOWN' as const,
        neighborId: 'neighbor-record-1',
        source: 'unknown' as const,
      })),
    };
    const fallbackStore = {
      resolvePreference: jest.fn(() => ({
        prefersTexting: 'NO' as const,
        neighborId: null,
        source: 'thread-map' as const,
      })),
    };
    const service = new AsyncConnectShyftSmsPreferenceOverrideService(store as any, fallbackStore as any);

    const resolved = await service.resolvePreference({
      tenantId: 'tenant-connectshyft-c4',
      orgUnitId: 'org-connectshyft-c4-east',
      threadId: 'cc9bb30e-4b36-4419-8563-819432f4ba14',
      neighborId: 'neighbor-record-1',
    });

    expect(resolved).toEqual({
      prefersTexting: 'NO',
      neighborId: null,
      source: 'thread-map',
    });
    expect(store.resolvePreference).toHaveBeenCalled();
    expect(fallbackStore.resolvePreference).toHaveBeenCalled();
  });

  it('uses thread-map fallback when durable preference lookup is unavailable', async () => {
    const missingTableError = Object.assign(
      new Error('relation "connectshyft.cs_neighbors" does not exist'),
      { code: '42P01' },
    );
    const store = {
      resolvePreference: jest.fn(async () => {
        throw missingTableError;
      }),
    };
    const fallbackStore = {
      resolvePreference: jest.fn(() => ({
        prefersTexting: 'NO' as const,
        neighborId: null,
        source: 'thread-map' as const,
      })),
    };
    const service = new AsyncConnectShyftSmsPreferenceOverrideService(store as any, fallbackStore as any);

    const resolved = await service.resolvePreference({
      tenantId: 'tenant-connectshyft-c4',
      orgUnitId: 'org-connectshyft-c4-east',
      threadId: 'cc9bb30e-4b36-4419-8563-819432f4ba14',
      neighborId: 'neighbor-record-1',
    });

    expect(resolved).toEqual({
      prefersTexting: 'NO',
      neighborId: null,
      source: 'thread-map',
    });
    expect(store.resolvePreference).toHaveBeenCalled();
    expect(fallbackStore.resolvePreference).toHaveBeenCalled();
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
        threadId: 'cc9bb30e-4b36-4419-8563-819432f4ba14',
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
        threadId: 'cc9bb30e-4b36-4419-8563-819432f4ba14',
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
      threadId: 'cc9bb30e-4b36-4419-8563-819432f4ba14',
      overrideId: '83fba1aa-2118-4259-a6bc-f8c4086e44ec',
    });

    expect(deleteOverride).toHaveBeenCalledWith({
      tenantId: 'tenant-connectshyft-c4',
      orgUnitId: 'org-connectshyft-c4-east',
      threadId: 'cc9bb30e-4b36-4419-8563-819432f4ba14',
      overrideId: '83fba1aa-2118-4259-a6bc-f8c4086e44ec',
    });
  });
});
