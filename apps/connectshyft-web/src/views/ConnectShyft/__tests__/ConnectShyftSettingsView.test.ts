import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import ConnectShyftEscalationSettingsView from '../ConnectShyftEscalationSettingsView.vue';
import ConnectShyftSettingsView from '../ConnectShyftSettingsView.vue';
import * as escalationModule from '@/features/connectshyft/escalation';
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
    smsReady: false,
    messageDispatchRunnable: false,
    callbackNumber: {
      value: null,
      rawInput: null,
      createdAtUtc: null,
      updatedAtUtc: null,
      persistenceAvailable: true,
    },
    operatorPhoneSource: 'none',
    degradedMode: false,
    blockingReasons: [],
    nextActions: [],
  },
  fetchConnectShyftOperatorCallbackNumber: vi.fn(),
  fetchConnectShyftTelephonyReadiness: vi.fn(),
  saveConnectShyftOperatorCallbackNumber: vi.fn(),
}));

vi.mock('@/features/connectshyft/escalation', () => ({
  connectShyftEscalationRecipientScopes: {
    ORG_UNIT: 'ORG_UNIT',
    TENANT: 'TENANT',
    TEST_ONLY: 'TEST_ONLY',
  },
  fetchConnectShyftEscalationRecipientOptions: vi.fn(),
  fetchConnectShyftEscalationConfig: vi.fn(),
  saveConnectShyftEscalationConfig: vi.fn(),
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
      {
        path: '/app/connectshyft/settings/escalation',
        component: ConnectShyftEscalationSettingsView,
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

const renderEscalationSettingsView = async (
  initialPath = '/app/connectshyft/settings/escalation',
) => {
  const router = await buildRouter(initialPath);
  const wrapper = mount(ConnectShyftEscalationSettingsView, {
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
  smsReady: false,
  messageDispatchRunnable: false,
  callbackNumber: {
    value: null,
    rawInput: null,
    createdAtUtc: null,
    updatedAtUtc: null,
    persistenceAvailable: true,
  },
  operatorPhoneSource: 'none',
  degradedMode: false,
  blockingReasons: [
    {
      code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_MISSING',
      category: 'callback_number',
      message: 'Voice forwarding requires an operator callback number.',
      blocking: true,
      channel: 'both',
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
  smsReady: true,
  messageDispatchRunnable: true,
  callbackNumber: {
    value: '+13175550100',
    rawInput: '(317) 555-0100',
    createdAtUtc: '2026-03-22T11:00:00.000Z',
    updatedAtUtc: '2026-03-22T11:05:00.000Z',
    persistenceAvailable: true,
  },
  operatorPhoneSource: 'callback_number',
  degradedMode: false,
  blockingReasons: [],
  nextActions: [],
});

const createDegradedReadiness = () => ({
  providerReady: true,
  providerSelectionPathActive: true,
  webhookSignatureConfigured: true,
  orgUnitNumberMappingReady: true,
  voiceSupported: true,
  callbackNumberConfigured: false,
  callbackNumberNormalized: false,
  voiceReady: true,
  bridgeCallRunnable: true,
  smsReady: true,
  messageDispatchRunnable: true,
  callbackNumber: {
    value: null,
    rawInput: null,
    createdAtUtc: null,
    updatedAtUtc: null,
    persistenceAvailable: true,
  },
  operatorPhoneSource: 'orgunit_default',
  degradedMode: true,
  blockingReasons: [
    {
      code: 'CONNECTSHYFT_ORGUNIT_DEFAULT_OPERATOR_PHONE_ACTIVE',
      category: 'orgunit_fallback',
      message: 'Using the orgUnit fallback phone until the operator callback number is set.',
      blocking: false,
      channel: 'both',
    },
  ],
  nextActions: [
    {
      code: 'SET_OPERATOR_CALLBACK_NUMBER',
      message: 'Save a callback / forwarding number so telephony no longer depends on the orgUnit fallback phone.',
    },
  ],
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
const fetchEscalationConfigMock = vi.mocked(
  escalationModule.fetchConnectShyftEscalationConfig,
);
const fetchEscalationRecipientOptionsMock = vi.mocked(
  escalationModule.fetchConnectShyftEscalationRecipientOptions,
);
const saveEscalationConfigMock = vi.mocked(
  escalationModule.saveConnectShyftEscalationConfig,
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

  fetchEscalationConfigMock.mockResolvedValue({
    orgUnitId: 'org-connectshyft-alpha-east',
    escalationBaselineHours: 24,
    recipients: {
      primaryOrgUnitAdminUserId: 'user-orgunit-primary',
      secondaryOrgUnitAdminUserId: 'user-orgunit-secondary',
      tenantStaffUserId: 'user-tenant-staff',
    },
    defaultOperatorPhoneE164: '+13175550123',
  });
  fetchEscalationRecipientOptionsMock.mockResolvedValue([
    {
      value: 'user-orgunit-primary',
      label: 'Primary Admin',
      scope: 'ORG_UNIT',
    },
    {
      value: 'user-orgunit-secondary',
      label: 'Secondary Admin',
      scope: 'ORG_UNIT',
    },
    {
      value: 'user-tenant-staff',
      label: 'Tenant Staff',
      scope: 'TENANT',
    },
  ]);
  saveEscalationConfigMock.mockResolvedValue({
    ok: true,
    code: 'CONNECTSHYFT_ESCALATION_CONFIG_SAVED',
    config: {
      orgUnitId: 'org-connectshyft-alpha-east',
      escalationBaselineHours: 6,
      recipients: {
        primaryOrgUnitAdminUserId: 'user-orgunit-primary',
        secondaryOrgUnitAdminUserId: 'user-orgunit-secondary',
        tenantStaffUserId: 'user-tenant-staff',
      },
      defaultOperatorPhoneE164: '+13175550199',
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

describe('ConnectShyftSettingsView', () => {
  it('renders both channel statuses when telephony is fully ready', async () => {
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
    expect(wrapper.get('[data-testid="connectshyft-callback-readiness-chip"]').text()).toContain(
      'Ready',
    );
    expect(wrapper.get('[data-testid="connectshyft-callback-readiness-message"]').text()).toContain(
      'Calls and texts are ready.',
    );
    expect(wrapper.get('[data-testid="connectshyft-voice-readiness-chip"]').text()).toContain(
      'Ready',
    );
    expect(wrapper.get('[data-testid="connectshyft-sms-readiness-chip"]').text()).toContain(
      'Ready',
    );
    expect(wrapper.get('[data-testid="connectshyft-current-callback-number"]').text()).toContain(
      '(317) 555-0100',
    );
    expect(wrapper.find('[data-testid="connectshyft-degraded-mode-banner"]').exists()).toBe(false);
    expect(
      (wrapper.get('[data-testid="connectshyft-callback-number-input"]').element as HTMLInputElement).value,
    ).toBe('(317) 555-0100');
  });

  it('shows the empty state and both blocked channel summaries when callback setup is missing', async () => {
    const wrapper = await renderSettingsView(
      '/app/connectshyft/settings?refusedPath=%2Fapp%2Fconnectshyft%2Fsettings%2Favailability',
    );

    expect(wrapper.get('[data-testid="connectshyft-settings-refusal-guidance"]').text()).toContain(
      'That page is only available to people with the right permissions.',
    );
    expect(wrapper.get('[data-testid="connectshyft-callback-number-empty"]').text()).toContain(
      'No callback number saved yet.',
    );
    expect(wrapper.get('[data-testid="connectshyft-callback-readiness-message"]').text()).toContain(
      'Save a callback number so calls and texts can reach you.',
    );
    expect(wrapper.get('[data-testid="connectshyft-callback-readiness-chip"]').text()).toContain(
      'Needs setup',
    );
    expect(wrapper.get('[data-testid="connectshyft-voice-readiness-chip"]').text()).toContain(
      'Blocked',
    );
    expect(wrapper.get('[data-testid="connectshyft-sms-readiness-chip"]').text()).toContain(
      'Blocked',
    );
    expect(wrapper.get('[data-testid="connectshyft-callback-next-action"]').text()).toContain(
      'Save a callback number to finish setup.',
    );
  });

  it('shows degraded mode when orgUnit fallback is carrying readiness', async () => {
    fetchReadinessMock.mockResolvedValueOnce(createDegradedReadiness());

    const wrapper = await renderSettingsView();

    expect(wrapper.get('[data-testid="connectshyft-callback-readiness-chip"]').text()).toContain(
      'Using backup line',
    );
    expect(wrapper.get('[data-testid="connectshyft-callback-readiness-message"]').text()).toContain(
      'Calls and texts are working, but ConnectShyft is still using the backup line.',
    );
    expect(wrapper.get('[data-testid="connectshyft-degraded-mode-banner"]').text()).toContain(
      'Backup line active',
    );
    expect(wrapper.get('[data-testid="connectshyft-voice-readiness-chip"]').text()).toContain(
      'Ready',
    );
    expect(wrapper.get('[data-testid="connectshyft-sms-readiness-chip"]').text()).toContain(
      'Ready',
    );
    expect(wrapper.get('[data-testid="connectshyft-callback-next-action"]').text()).toContain(
      'Save your own callback number so ConnectShyft no longer needs the backup line.',
    );
  });

  it('saves a callback number and refreshes the readiness surface', async () => {
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

describe('ConnectShyftEscalationSettingsView', () => {
  it('loads the orgUnit fallback phone on the existing escalation settings surface', async () => {
    const wrapper = await renderEscalationSettingsView();

    expect(wrapper.get('[data-testid="connectshyft-escalation-settings-surface"]').text()).toContain(
      'Escalation Settings',
    );
    expect(
      (wrapper.get('[data-testid="connectshyft-escalation-fallback-phone-input"]').element as HTMLInputElement).value,
    ).toBe('+13175550123');
  });

  it('saves the orgUnit fallback phone through the existing escalation helper', async () => {
    const wrapper = await renderEscalationSettingsView();

    await wrapper.get('[data-testid="connectshyft-escalation-baseline-input"]').setValue('6');
    await wrapper.get('[data-testid="connectshyft-escalation-fallback-phone-input"]').setValue('+13175550199');
    await wrapper.get('[data-testid="connectshyft-escalation-settings-form"]').trigger('submit.prevent');
    await flushPromises();

    expect(saveEscalationConfigMock).toHaveBeenCalledWith({
      escalationBaselineHours: 6,
      defaultOperatorPhoneE164: '+13175550199',
      recipients: {
        primaryOrgUnitAdminUserId: 'user-orgunit-primary',
        secondaryOrgUnitAdminUserId: 'user-orgunit-secondary',
        tenantStaffUserId: 'user-tenant-staff',
      },
    });
    expect(wrapper.get('[data-testid="connectshyft-escalation-save-success"]').text()).toContain(
      'Escalation settings saved.',
    );
    expect(
      (wrapper.get('[data-testid="connectshyft-escalation-fallback-phone-input"]').element as HTMLInputElement).value,
    ).toBe('+13175550199');
  });
});
