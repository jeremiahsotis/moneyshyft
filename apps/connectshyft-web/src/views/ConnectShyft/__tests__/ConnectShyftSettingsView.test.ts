import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import ConnectShyftSettingsView from '../ConnectShyftSettingsView.vue';
import * as telephonySettingsModule from '@/features/connectshyft/telephonySettings';

vi.mock('@/features/connectshyft/telephonySettings', () => ({
  DEFAULT_CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER: {
    value: null,
    rawInput: null,
    createdAtUtc: null,
    updatedAtUtc: null,
  },
  DEFAULT_CONNECTSHYFT_TELEPHONY_READINESS: {
    providerReady: false,
    providerSelectionPathActive: false,
    webhookSignatureConfigured: false,
    orgUnitNumberMappingReady: false,
    voiceSupported: false,
    callbackNumberConfigured: false,
    callbackNumberNormalized: false,
    voiceReady: false,
    bridgeCallRunnable: false,
    callbackNumber: {
      value: null,
      rawInput: null,
      persistenceAvailable: true,
    },
    blockingReasons: [],
    nextActions: [],
  },
  fetchConnectShyftOperatorCallbackNumber: vi.fn(),
  fetchConnectShyftTelephonyReadiness: vi.fn(),
  saveConnectShyftOperatorCallbackNumber: vi.fn(),
}));

const buildRouter = async (initialPath: string) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/login',
        component: {
          template: '<div>Login</div>',
        },
      },
      {
        path: '/app/connectshyft/more',
        component: {
          template: '<div>More</div>',
        },
      },
      {
        path: '/app/connectshyft/settings',
        component: ConnectShyftSettingsView,
      },
    ],
  });

  await router.push(initialPath);
  await router.isReady();
  return router;
};

const renderSettingsView = async (initialPath = '/app/connectshyft/settings') => {
  const router = await buildRouter(initialPath);
  const wrapper = mount(ConnectShyftSettingsView, {
    global: {
      plugins: [router],
    },
  });

  await flushPromises();
  return wrapper;
};

const createMissingReadiness = () => ({
  providerReady: true,
  providerSelectionPathActive: true,
  webhookSignatureConfigured: true,
  orgUnitNumberMappingReady: true,
  voiceSupported: true,
  callbackNumberConfigured: false,
  callbackNumberNormalized: false,
  voiceReady: false,
  bridgeCallRunnable: false,
  callbackNumber: {
    value: null,
    rawInput: null,
    persistenceAvailable: true,
  },
  blockingReasons: [
    {
      code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_MISSING',
      category: 'callback_number',
      message: 'Voice forwarding requires an operator callback number.',
      blocking: true,
    },
  ],
  nextActions: [
    {
      code: 'SET_OPERATOR_CALLBACK_NUMBER',
      message: 'Save a callback / forwarding number for the current operator.',
    },
  ],
});

const createReadyReadiness = () => ({
  providerReady: true,
  providerSelectionPathActive: true,
  webhookSignatureConfigured: true,
  orgUnitNumberMappingReady: true,
  voiceSupported: true,
  callbackNumberConfigured: true,
  callbackNumberNormalized: true,
  voiceReady: true,
  bridgeCallRunnable: true,
  callbackNumber: {
    value: '+13175550100',
    rawInput: '(317) 555-0100',
    persistenceAvailable: true,
  },
  blockingReasons: [],
  nextActions: [],
});

const fetchCallbackNumberMock = vi.mocked(
  telephonySettingsModule.fetchConnectShyftOperatorCallbackNumber,
);
const fetchReadinessMock = vi.mocked(
  telephonySettingsModule.fetchConnectShyftTelephonyReadiness,
);
const saveCallbackNumberMock = vi.mocked(
  telephonySettingsModule.saveConnectShyftOperatorCallbackNumber,
);

beforeEach(() => {
  fetchCallbackNumberMock.mockResolvedValue({
    value: null,
    rawInput: null,
    createdAtUtc: null,
    updatedAtUtc: null,
  });
  fetchReadinessMock.mockResolvedValue(createMissingReadiness());
  saveCallbackNumberMock.mockResolvedValue({
    ok: true,
    code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_SAVED',
    callbackNumber: {
      value: '+13175550100',
      rawInput: '(317) 555-0100',
      createdAtUtc: '2026-03-22T11:00:00.000Z',
      updatedAtUtc: '2026-03-22T11:05:00.000Z',
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

describe('ConnectShyftSettingsView', () => {
  it('renders the current callback number and ready status when voice forwarding is configured', async () => {
    fetchCallbackNumberMock.mockResolvedValueOnce({
      value: '+13175550100',
      rawInput: '(317) 555-0100',
      createdAtUtc: '2026-03-22T11:00:00.000Z',
      updatedAtUtc: '2026-03-22T11:05:00.000Z',
    });
    fetchReadinessMock.mockResolvedValueOnce(createReadyReadiness());

    const wrapper = await renderSettingsView();

    expect(wrapper.get('[data-testid="connectshyft-settings-surface"]').text()).toContain(
      'ConnectShyft Settings',
    );
    expect(wrapper.text()).toContain('Make voice forwarding work for your operator account.');
    expect(wrapper.get('[data-testid="connectshyft-callback-readiness-chip"]').text()).toContain(
      'Ready',
    );
    expect(wrapper.get('[data-testid="connectshyft-callback-readiness-message"]').text()).toContain(
      'Voice forwarding is ready for this operator.',
    );
    expect(wrapper.get('[data-testid="connectshyft-current-callback-number"]').text()).toContain(
      '(317) 555-0100',
    );
    expect(
      (wrapper.get('[data-testid="connectshyft-callback-number-input"]').element as HTMLInputElement).value,
    ).toBe('(317) 555-0100');
  });

  it('shows the empty state, next action, and admin refusal guidance when callback setup is missing', async () => {
    const wrapper = await renderSettingsView(
      '/app/connectshyft/settings?refusedPath=%2Fapp%2Fconnectshyft%2Fsettings%2Favailability',
    );

    expect(wrapper.get('[data-testid="connectshyft-settings-refusal-guidance"]').text()).toContain(
      'Access to /app/connectshyft/settings/availability is available to authorized admin users only.',
    );
    expect(wrapper.get('[data-testid="connectshyft-callback-number-empty"]').text()).toContain(
      'No callback number saved yet.',
    );
    expect(wrapper.get('[data-testid="connectshyft-callback-readiness-message"]').text()).toContain(
      'Voice forwarding requires an operator callback number.',
    );
    expect(wrapper.get('[data-testid="connectshyft-callback-next-action"]').text()).toContain(
      'Save a callback / forwarding number for the current operator.',
    );
  });

  it('saves a callback number and shows explicit success messaging', async () => {
    fetchReadinessMock
      .mockResolvedValueOnce(createMissingReadiness())
      .mockResolvedValueOnce(createReadyReadiness());

    const wrapper = await renderSettingsView();
    await wrapper.get('[data-testid="connectshyft-callback-number-input"]').setValue('(317) 555-0100');
    await wrapper.get('form').trigger('submit.prevent');
    await flushPromises();

    expect(saveCallbackNumberMock).toHaveBeenCalledWith({
      callbackNumber: '(317) 555-0100',
    });
    expect(wrapper.get('[data-testid="connectshyft-callback-save-success"]').text()).toContain(
      'Callback number saved.',
    );
    expect(wrapper.get('[data-testid="connectshyft-current-callback-number"]').text()).toContain(
      '(317) 555-0100',
    );
    expect(wrapper.get('[data-testid="connectshyft-callback-readiness-chip"]').text()).toContain(
      'Ready',
    );
  });

  it('shows explicit failure messaging when the callback number save is refused', async () => {
    saveCallbackNumberMock.mockResolvedValueOnce({
      ok: false,
      code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_INVALID',
      message: 'Operator callback number must be a dialable voice number.',
      fieldErrors: [
        {
          field: 'callbackNumber',
          reason: 'VOICE_UNSUPPORTED',
          message: 'Operator callback number must be a dialable voice number.',
        },
      ],
    });

    const wrapper = await renderSettingsView();
    await wrapper.get('[data-testid="connectshyft-callback-number-input"]').setValue('12345');
    await wrapper.get('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.get('[data-testid="connectshyft-callback-validation-error"]').text()).toContain(
      'Operator callback number must be a dialable voice number.',
    );
  });
});
