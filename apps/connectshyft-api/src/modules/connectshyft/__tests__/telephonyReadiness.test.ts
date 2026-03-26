import { generateKeyPairSync } from 'node:crypto';
import {
  AsyncConnectShyftTelephonyReadinessService,
} from '../telephonyReadiness';
import {
  AsyncConnectShyftOperatorCallbackNumberService,
  InMemoryConnectShyftOperatorCallbackNumberStore,
} from '../operatorCallbackNumbers';
import type { ConnectShyftTelephonyOperatorPhoneResolution } from '../operatorDestinationResolver';

describe('connectshyft telephony readiness', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousOverrideFlag = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;
  const previousTelnyxPublicKey = process.env.TELNYX_PUBLIC_KEY;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
  });

  afterEach(() => {
    delete process.env.TELNYX_PUBLIC_KEY;
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = previousOverrideFlag;
    process.env.TELNYX_PUBLIC_KEY = previousTelnyxPublicKey;
  });

  const buildOperatorPhoneResolver = (
    resolution: ConnectShyftTelephonyOperatorPhoneResolution,
  ) => jest.fn(async () => resolution);

  it('reports callback-number missing for calling while texting stays ready when provider and number mappings are otherwise ready', async () => {
    const readinessService = new AsyncConnectShyftTelephonyReadinessService(
      {
        listMappings: jest.fn(async () => [
          {
            mappingId: 'mapping-f1-001',
            tenantId: 'tenant-connectshyft-f1',
            orgUnitId: 'org-connectshyft-f1-east',
            twilioNumberE164: '+12605550191',
            label: 'Front Desk',
            isActive: true,
            createdAtUtc: '2026-03-22T12:00:00.000Z',
            updatedAtUtc: '2026-03-22T12:00:00.000Z',
          },
        ]),
      },
      {
        getCurrentCallbackNumber: jest.fn(async () => null),
      } as any,
      buildOperatorPhoneResolver({
        value: null,
        source: 'none',
        normalized: false,
        callbackNumberStatus: 'missing',
        orgUnitDefaultStatus: 'missing',
      }),
    );
    const publicKeyPem = generateKeyPairSync('ed25519').publicKey.export({
      type: 'spki',
      format: 'pem',
    }).toString();

    const readiness = await readinessService.inspectReadiness({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      userId: 'user-connectshyft-operator-1',
      providerRegistryHeaders: {
        'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
        'x-test-connectshyft-provider-public-key': publicKeyPem,
      },
    });

    expect(readiness).toMatchObject({
      providerReady: true,
      providerSelectionPathActive: true,
      webhookSignatureConfigured: true,
      orgUnitNumberMappingReady: true,
      voiceSupported: true,
      callbackNumberConfigured: false,
      callbackNumberNormalized: false,
      voiceReady: false,
      bridgeCallRunnable: false,
      smsReady: true,
      messageDispatchRunnable: true,
      operatorPhoneSource: 'none',
      degradedMode: false,
      provider: {
        resolvedProvider: 'telnyx',
        adapterInterfaceVersion: 'v1',
      },
      orgUnitNumberMappings: {
        activeCount: 1,
      },
      callbackNumber: {
        value: null,
        rawInput: null,
        createdAtUtc: null,
        updatedAtUtc: null,
        persistenceAvailable: true,
      },
      blockingReasons: expect.arrayContaining([
        expect.objectContaining({
          code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_MISSING',
          channel: 'voice',
        }),
      ]),
      nextActions: expect.arrayContaining([
        expect.objectContaining({
          code: 'SET_OPERATOR_CALLBACK_NUMBER',
        }),
      ]),
    });
  });

  it('reports bridge-call runnable when callback number is present and prerequisites are configured', async () => {
    const callbackStore = new InMemoryConnectShyftOperatorCallbackNumberStore();
    const callbackNumberService = new AsyncConnectShyftOperatorCallbackNumberService(callbackStore);
    await callbackNumberService.setCallbackNumber({
      tenantId: 'tenant-connectshyft-f1',
      userId: 'user-connectshyft-operator-1',
      callbackNumber: '260-555-0123',
    });

    const readinessService = new AsyncConnectShyftTelephonyReadinessService(
      {
        listMappings: jest.fn(async () => [
          {
            mappingId: 'mapping-f1-001',
            tenantId: 'tenant-connectshyft-f1',
            orgUnitId: 'org-connectshyft-f1-east',
            twilioNumberE164: '+12605550191',
            label: 'Front Desk',
            isActive: true,
            createdAtUtc: '2026-03-22T12:00:00.000Z',
            updatedAtUtc: '2026-03-22T12:00:00.000Z',
          },
        ]),
      },
      callbackNumberService,
      buildOperatorPhoneResolver({
        value: '+12605550123',
        source: 'callback_number',
        normalized: true,
        callbackNumberStatus: 'valid',
        orgUnitDefaultStatus: 'missing',
      }),
    );
    const publicKeyPem = generateKeyPairSync('ed25519').publicKey.export({
      type: 'spki',
      format: 'pem',
    }).toString();

    const readiness = await readinessService.inspectReadiness({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      userId: 'user-connectshyft-operator-1',
      providerRegistryHeaders: {
        'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
        'x-test-connectshyft-provider-public-key': publicKeyPem,
      },
    });

    expect(readiness).toMatchObject({
      providerReady: true,
      webhookSignatureConfigured: true,
      orgUnitNumberMappingReady: true,
      voiceSupported: true,
      callbackNumberConfigured: true,
      callbackNumberNormalized: true,
      voiceReady: true,
      bridgeCallRunnable: true,
      smsReady: true,
      messageDispatchRunnable: true,
      operatorPhoneSource: 'callback_number',
      degradedMode: false,
      callbackNumber: {
        value: '+12605550123',
        rawInput: '(260) 555-0123',
        createdAtUtc: expect.any(String),
        updatedAtUtc: expect.any(String),
        persistenceAvailable: true,
      },
    });
    expect(readiness.blockingReasons).toEqual([]);
    expect(readiness.nextActions).toEqual([]);
  });

  it('reports webhook signature readiness as blocked when provider signature validation is not configured', async () => {
    const callbackStore = new InMemoryConnectShyftOperatorCallbackNumberStore();
    const callbackNumberService = new AsyncConnectShyftOperatorCallbackNumberService(callbackStore);
    await callbackNumberService.setCallbackNumber({
      tenantId: 'tenant-connectshyft-f1',
      userId: 'user-connectshyft-operator-1',
      callbackNumber: '260-555-0123',
    });

    const readinessService = new AsyncConnectShyftTelephonyReadinessService(
      {
        listMappings: jest.fn(async () => [
          {
            mappingId: 'mapping-f1-001',
            tenantId: 'tenant-connectshyft-f1',
            orgUnitId: 'org-connectshyft-f1-east',
            twilioNumberE164: '+12605550191',
            label: 'Front Desk',
            isActive: true,
            createdAtUtc: '2026-03-22T12:00:00.000Z',
            updatedAtUtc: '2026-03-22T12:00:00.000Z',
          },
        ]),
      },
      callbackNumberService,
      buildOperatorPhoneResolver({
        value: '+12605550123',
        source: 'callback_number',
        normalized: true,
        callbackNumberStatus: 'valid',
        orgUnitDefaultStatus: 'missing',
      }),
    );

    const readiness = await readinessService.inspectReadiness({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      userId: 'user-connectshyft-operator-1',
      providerRegistryHeaders: {
        'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
      },
    });

    expect(readiness).toMatchObject({
      providerReady: true,
      webhookSignatureConfigured: false,
      orgUnitNumberMappingReady: true,
      callbackNumberConfigured: true,
      callbackNumberNormalized: true,
      voiceReady: false,
      bridgeCallRunnable: false,
      smsReady: false,
      messageDispatchRunnable: false,
      operatorPhoneSource: 'callback_number',
      degradedMode: false,
      blockingReasons: expect.arrayContaining([
        expect.objectContaining({
          code: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_NOT_CONFIGURED',
          category: 'provider',
        }),
      ]),
      nextActions: expect.arrayContaining([
        expect.objectContaining({
          code: 'CONFIGURE_WEBHOOK_SIGNATURE_VALIDATION',
        }),
      ]),
    });
  });

  it('reports degraded mode when orgUnit fallback keeps both channels runnable', async () => {
    const readinessService = new AsyncConnectShyftTelephonyReadinessService(
      {
        listMappings: jest.fn(async () => [
          {
            mappingId: 'mapping-f1-001',
            tenantId: 'tenant-connectshyft-f1',
            orgUnitId: 'org-connectshyft-f1-east',
            twilioNumberE164: '+12605550191',
            label: 'Front Desk',
            isActive: true,
            createdAtUtc: '2026-03-22T12:00:00.000Z',
            updatedAtUtc: '2026-03-22T12:00:00.000Z',
          },
        ]),
      },
      {
        getCurrentCallbackNumber: jest.fn(async () => null),
      } as any,
      buildOperatorPhoneResolver({
        value: '+12605550333',
        source: 'orgunit_default',
        normalized: true,
        callbackNumberStatus: 'missing',
        orgUnitDefaultStatus: 'valid',
      }),
    );
    const publicKeyPem = generateKeyPairSync('ed25519').publicKey.export({
      type: 'spki',
      format: 'pem',
    }).toString();

    const readiness = await readinessService.inspectReadiness({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      userId: 'user-connectshyft-operator-1',
      providerRegistryHeaders: {
        'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
        'x-test-connectshyft-provider-public-key': publicKeyPem,
      },
    });

    expect(readiness).toMatchObject({
      providerReady: true,
      webhookSignatureConfigured: true,
      orgUnitNumberMappingReady: true,
      callbackNumberConfigured: false,
      callbackNumberNormalized: false,
      voiceReady: true,
      bridgeCallRunnable: true,
      smsReady: true,
      messageDispatchRunnable: true,
      operatorPhoneSource: 'orgunit_default',
      degradedMode: true,
      blockingReasons: expect.arrayContaining([
        expect.objectContaining({
          code: 'CONNECTSHYFT_ORGUNIT_DEFAULT_OPERATOR_PHONE_ACTIVE',
          category: 'orgunit_fallback',
          blocking: false,
          channel: 'voice',
        }),
      ]),
      nextActions: expect.arrayContaining([
        expect.objectContaining({
          code: 'SET_OPERATOR_CALLBACK_NUMBER',
        }),
      ]),
    });
  });
});
