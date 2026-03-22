import {
  buildConnectShyftWebhookVerificationInput,
  mapConnectShyftWebhookVerificationResult,
  resolveConnectShyftProviderAdapter,
  type ConnectShyftProviderResolution,
} from './providerRegistry';
import {
  connectShyftNumberMappingServiceAsync,
  type AsyncConnectShyftNumberMappingService,
  type ConnectShyftNumberMapping,
} from './numberMappings';
import {
  ConnectShyftOperatorCallbackNumberPersistenceUnavailableError,
  connectShyftOperatorCallbackNumberServiceAsync,
  type AsyncConnectShyftOperatorCallbackNumberService,
  type ConnectShyftOperatorCallbackNumber,
} from './operatorCallbackNumbers';
import { validatePhoneForChannel } from '../../../../../domains/communication';

export type ConnectShyftTelephonyReadinessBlockingReason = {
  code:
    | 'CONNECTSHYFT_PROVIDER_DISABLED'
    | 'CONNECTSHYFT_PROVIDER_UNAVAILABLE'
    | 'CONNECTSHYFT_WEBHOOK_SIGNATURE_NOT_CONFIGURED'
    | 'CONNECTSHYFT_TELEPHONY_NUMBER_MAPPING_REQUIRED'
    | 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_MISSING'
    | 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_INVALID'
    | 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_PERSISTENCE_UNAVAILABLE';
  category:
    | 'provider'
    | 'webhook_signature'
    | 'number_mapping'
    | 'callback_number';
  message: string;
  blocking: true;
};

export type ConnectShyftTelephonyReadinessNextAction = {
  code:
    | 'CONFIGURE_PROVIDER_SELECTION'
    | 'CONFIGURE_WEBHOOK_SIGNATURE_VALIDATION'
    | 'ADD_OR_ACTIVATE_NUMBER_MAPPING'
    | 'SET_OPERATOR_CALLBACK_NUMBER'
    | 'REPLACE_OPERATOR_CALLBACK_NUMBER'
    | 'RESTORE_CALLBACK_NUMBER_PERSISTENCE';
  message: string;
};

export type ConnectShyftTelephonyReadiness = {
  providerReady: boolean;
  providerSelectionPathActive: boolean;
  webhookSignatureConfigured: boolean;
  orgUnitNumberMappingReady: boolean;
  voiceSupported: boolean;
  callbackNumberConfigured: boolean;
  callbackNumberNormalized: boolean;
  voiceReady: boolean;
  bridgeCallRunnable: boolean;
  provider: ConnectShyftProviderResolution & {
    adapterInterfaceVersion: 'v1' | null;
  };
  orgUnitNumberMappings: {
    activeCount: number;
    mappings: Array<Pick<ConnectShyftNumberMapping, 'mappingId' | 'twilioNumberE164' | 'label'>>;
  };
  callbackNumber: {
    value: string | null;
    rawInput: string | null;
    persistenceAvailable: boolean;
  };
  blockingReasons: ConnectShyftTelephonyReadinessBlockingReason[];
  nextActions: ConnectShyftTelephonyReadinessNextAction[];
};

export type ConnectShyftTelephonyReadinessInput = {
  tenantId: string;
  orgUnitId: string;
  userId: string;
  requestedProvider?: string | null;
  providerRegistryHeaders?: Record<string, string | undefined>;
};

type ProviderResolutionState = {
  providerReady: boolean;
  voiceSupported: boolean;
  provider: ConnectShyftTelephonyReadiness['provider'];
  webhookSignatureConfigured: boolean;
  webhookSignatureBlockingReason: ConnectShyftTelephonyReadinessBlockingReason | null;
  providerBlockingReason: ConnectShyftTelephonyReadinessBlockingReason | null;
};

const normalizeHeaders = (
  headers: Record<string, string | undefined> | undefined,
): Record<string, string> => {
  const normalized: Record<string, string> = {};

  Object.entries(headers || {}).forEach(([key, value]) => {
    if (typeof value !== 'string') {
      return;
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return;
    }

    normalized[key.toLowerCase()] = trimmedValue;
  });

  return normalized;
};

const shouldForceWebhookSignatureValidation = (): boolean =>
  process.env.NODE_ENV === 'test'
  && process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS === 'true';

const buildProviderRegistryRequest = (
  input: ConnectShyftTelephonyReadinessInput,
): {
  body: Record<string, unknown>;
  headers: Record<string, string>;
  originalUrl: string;
  protocol: string;
  tenantId: string;
  orgUnitId: string;
  header: (name: string) => string | undefined;
} => {
  const headers = normalizeHeaders(input.providerRegistryHeaders);
  if (
    shouldForceWebhookSignatureValidation()
    && !headers['x-test-connectshyft-enforce-webhook-signature']
  ) {
    headers['x-test-connectshyft-enforce-webhook-signature'] = 'true';
  }

  return {
    body: input.requestedProvider ? { providerKey: input.requestedProvider } : {},
    headers,
    originalUrl: '/api/v1/connectshyft/telephony-readiness',
    protocol: 'https',
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    header(name: string) {
      return headers[name.toLowerCase()];
    },
  };
};

const buildBlockingReason = (
  code: ConnectShyftTelephonyReadinessBlockingReason['code'],
  category: ConnectShyftTelephonyReadinessBlockingReason['category'],
  message: string,
): ConnectShyftTelephonyReadinessBlockingReason => ({
  code,
  category,
  message,
  blocking: true,
});

const buildNextAction = (
  code: ConnectShyftTelephonyReadinessNextAction['code'],
  message: string,
): ConnectShyftTelephonyReadinessNextAction => ({
  code,
  message,
});

const pushUniqueBlockingReason = (
  target: ConnectShyftTelephonyReadinessBlockingReason[],
  reason: ConnectShyftTelephonyReadinessBlockingReason | null,
): void => {
  if (!reason || target.some((entry) => entry.code === reason.code)) {
    return;
  }

  target.push(reason);
};

const pushUniqueNextAction = (
  target: ConnectShyftTelephonyReadinessNextAction[],
  action: ConnectShyftTelephonyReadinessNextAction,
): void => {
  if (target.some((entry) => entry.code === action.code)) {
    return;
  }

  target.push(action);
};

const mapProviderReadiness = (
  input: ConnectShyftTelephonyReadinessInput,
): ProviderResolutionState => {
  const providerRegistryRequest = buildProviderRegistryRequest(input);
  const resolution = resolveConnectShyftProviderAdapter({
    req: providerRegistryRequest,
    requestedProvider: input.requestedProvider,
    operation: 'call',
  });

  if (!resolution.ok) {
    return {
      providerReady: false,
      voiceSupported: false,
      provider: {
        ...resolution.refusal.data.providerResolution,
        adapterInterfaceVersion: null,
      },
      webhookSignatureConfigured: false,
      webhookSignatureBlockingReason: null,
      providerBlockingReason: buildBlockingReason(
        resolution.refusal.code,
        'provider',
        resolution.refusal.message,
      ),
    };
  }

  const webhookVerification = mapConnectShyftWebhookVerificationResult(
    resolution.adapter.verifyWebhook(
      buildConnectShyftWebhookVerificationInput({
        req: providerRegistryRequest,
        providerKey: resolution.providerResolution.resolvedProvider,
      }),
    ),
  );

  const webhookSignatureConfigured = webhookVerification.ok
    || webhookVerification.refusal.code !== 'CONNECTSHYFT_WEBHOOK_SIGNATURE_NOT_CONFIGURED';

  return {
    providerReady: true,
    voiceSupported: true,
    provider: {
      ...resolution.providerResolution,
      adapterInterfaceVersion: resolution.adapter.adapterInterfaceVersion,
    },
    webhookSignatureConfigured,
    webhookSignatureBlockingReason: webhookSignatureConfigured
      ? null
      : buildBlockingReason(
        'CONNECTSHYFT_WEBHOOK_SIGNATURE_NOT_CONFIGURED',
        'webhook_signature',
        webhookVerification.refusal.message,
      ),
    providerBlockingReason: null,
  };
};

const mapActiveMappings = (
  mappings: ConnectShyftNumberMapping[],
): ConnectShyftTelephonyReadiness['orgUnitNumberMappings'] => {
  const activeMappings = mappings
    .filter((mapping) => mapping.isActive)
    .map((mapping) => ({
      mappingId: mapping.mappingId,
      twilioNumberE164: mapping.twilioNumberE164,
      label: mapping.label,
    }));

  return {
    activeCount: activeMappings.length,
    mappings: activeMappings,
  };
};

const mapCallbackNumberReadiness = (
  callbackNumber: ConnectShyftOperatorCallbackNumber | null,
  persistenceAvailable: boolean,
): {
  callbackNumberConfigured: boolean;
  callbackNumberNormalized: boolean;
  callbackNumber: ConnectShyftTelephonyReadiness['callbackNumber'];
  blockingReason: ConnectShyftTelephonyReadinessBlockingReason | null;
} => {
  if (!persistenceAvailable) {
    return {
      callbackNumberConfigured: false,
      callbackNumberNormalized: false,
      callbackNumber: {
        value: null,
        rawInput: null,
        persistenceAvailable: false,
      },
      blockingReason: buildBlockingReason(
        'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_PERSISTENCE_UNAVAILABLE',
        'callback_number',
        'Operator callback number storage is unavailable. Voice forwarding readiness cannot be confirmed.',
      ),
    };
  }

  if (!callbackNumber) {
    return {
      callbackNumberConfigured: false,
      callbackNumberNormalized: false,
      callbackNumber: {
        value: null,
        rawInput: null,
        persistenceAvailable: true,
      },
      blockingReason: buildBlockingReason(
        'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_MISSING',
        'callback_number',
        'Voice forwarding requires an operator callback number.',
      ),
    };
  }

  const voiceValidation = validatePhoneForChannel(callbackNumber.callbackNumberE164, 'voice');
  if (!voiceValidation.ok) {
    return {
      callbackNumberConfigured: true,
      callbackNumberNormalized: false,
      callbackNumber: {
        value: callbackNumber.callbackNumberE164,
        rawInput: callbackNumber.callbackNumberRawInput,
        persistenceAvailable: true,
      },
      blockingReason: buildBlockingReason(
        'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_INVALID',
        'callback_number',
        'Operator callback number must be a dialable voice number.',
      ),
    };
  }

  return {
    callbackNumberConfigured: true,
    callbackNumberNormalized: true,
    callbackNumber: {
      value: callbackNumber.callbackNumberE164,
      rawInput: callbackNumber.callbackNumberRawInput,
      persistenceAvailable: true,
    },
    blockingReason: null,
  };
};

const buildNextActions = (
  blockingReasons: ConnectShyftTelephonyReadinessBlockingReason[],
): ConnectShyftTelephonyReadinessNextAction[] => {
  const nextActions: ConnectShyftTelephonyReadinessNextAction[] = [];

  blockingReasons.forEach((reason) => {
    switch (reason.code) {
      case 'CONNECTSHYFT_PROVIDER_DISABLED':
      case 'CONNECTSHYFT_PROVIDER_UNAVAILABLE':
        pushUniqueNextAction(
          nextActions,
          buildNextAction(
            'CONFIGURE_PROVIDER_SELECTION',
            'Enable or allow-list a registered telephony provider for this tenant and orgUnit.',
          ),
        );
        break;
      case 'CONNECTSHYFT_WEBHOOK_SIGNATURE_NOT_CONFIGURED':
        pushUniqueNextAction(
          nextActions,
          buildNextAction(
            'CONFIGURE_WEBHOOK_SIGNATURE_VALIDATION',
            'Configure webhook signature validation for the active telephony provider.',
          ),
        );
        break;
      case 'CONNECTSHYFT_TELEPHONY_NUMBER_MAPPING_REQUIRED':
        pushUniqueNextAction(
          nextActions,
          buildNextAction(
            'ADD_OR_ACTIVATE_NUMBER_MAPPING',
            'Add or activate a ConnectShyft number mapping for this orgUnit.',
          ),
        );
        break;
      case 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_MISSING':
        pushUniqueNextAction(
          nextActions,
          buildNextAction(
            'SET_OPERATOR_CALLBACK_NUMBER',
            'Save a callback / forwarding number for the current operator.',
          ),
        );
        break;
      case 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_INVALID':
        pushUniqueNextAction(
          nextActions,
          buildNextAction(
            'REPLACE_OPERATOR_CALLBACK_NUMBER',
            'Replace the current callback number with a valid dialable phone number.',
          ),
        );
        break;
      case 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_PERSISTENCE_UNAVAILABLE':
        pushUniqueNextAction(
          nextActions,
          buildNextAction(
            'RESTORE_CALLBACK_NUMBER_PERSISTENCE',
            'Restore operator callback number storage before using voice forwarding.',
          ),
        );
        break;
      default:
        break;
    }
  });

  return nextActions;
};

export class AsyncConnectShyftTelephonyReadinessService {
  constructor(
    private readonly numberMappingService: Pick<AsyncConnectShyftNumberMappingService, 'listMappings'> = connectShyftNumberMappingServiceAsync,
    private readonly callbackNumberService: Pick<AsyncConnectShyftOperatorCallbackNumberService, 'getCurrentCallbackNumber'> = connectShyftOperatorCallbackNumberServiceAsync,
  ) {}

  async inspectReadiness(
    input: ConnectShyftTelephonyReadinessInput,
  ): Promise<ConnectShyftTelephonyReadiness> {
    const providerReadiness = mapProviderReadiness(input);
    const numberMappings = mapActiveMappings(
      await this.numberMappingService.listMappings(input.tenantId, input.orgUnitId),
    );

    let callbackNumber: ConnectShyftOperatorCallbackNumber | null = null;
    let callbackNumberPersistenceAvailable = true;
    try {
      callbackNumber = await this.callbackNumberService.getCurrentCallbackNumber({
        tenantId: input.tenantId,
        userId: input.userId,
      });
    } catch (error) {
      if (!(error instanceof ConnectShyftOperatorCallbackNumberPersistenceUnavailableError)) {
        throw error;
      }

      callbackNumberPersistenceAvailable = false;
    }

    const callbackReadiness = mapCallbackNumberReadiness(
      callbackNumber,
      callbackNumberPersistenceAvailable,
    );

    const blockingReasons: ConnectShyftTelephonyReadinessBlockingReason[] = [];
    pushUniqueBlockingReason(blockingReasons, providerReadiness.providerBlockingReason);
    pushUniqueBlockingReason(blockingReasons, providerReadiness.webhookSignatureBlockingReason);

    if (numberMappings.activeCount === 0) {
      pushUniqueBlockingReason(
        blockingReasons,
        buildBlockingReason(
          'CONNECTSHYFT_TELEPHONY_NUMBER_MAPPING_REQUIRED',
          'number_mapping',
          'Voice routing requires at least one active ConnectShyft number mapping for this orgUnit.',
        ),
      );
    }

    pushUniqueBlockingReason(blockingReasons, callbackReadiness.blockingReason);

    const bridgeCallRunnable = providerReadiness.providerReady
      && providerReadiness.webhookSignatureConfigured
      && numberMappings.activeCount > 0
      && providerReadiness.voiceSupported
      && callbackReadiness.callbackNumberConfigured
      && callbackReadiness.callbackNumberNormalized;

    return {
      providerReady: providerReadiness.providerReady,
      providerSelectionPathActive: providerReadiness.providerReady,
      webhookSignatureConfigured: providerReadiness.webhookSignatureConfigured,
      orgUnitNumberMappingReady: numberMappings.activeCount > 0,
      voiceSupported: providerReadiness.voiceSupported,
      callbackNumberConfigured: callbackReadiness.callbackNumberConfigured,
      callbackNumberNormalized: callbackReadiness.callbackNumberNormalized,
      voiceReady: bridgeCallRunnable,
      bridgeCallRunnable,
      provider: providerReadiness.provider,
      orgUnitNumberMappings: numberMappings,
      callbackNumber: callbackReadiness.callbackNumber,
      blockingReasons,
      nextActions: buildNextActions(blockingReasons),
    };
  }
}

export const connectShyftTelephonyReadinessServiceAsync =
  new AsyncConnectShyftTelephonyReadinessService();
