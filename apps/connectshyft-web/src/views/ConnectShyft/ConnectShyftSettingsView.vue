<template>
  <main class="min-h-screen bg-slate-50 px-4 py-8 pb-32">
    <section
      data-testid="connectshyft-settings-surface"
      class="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header class="mb-6">
        <h1 class="text-2xl font-semibold text-slate-900">
          ConnectShyft Settings
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          Make voice forwarding work for your operator account.
        </p>
        <p
          class="mt-2 text-sm text-slate-600"
        >
          Inbound and bridge calls use this number to reach you, so save the line where you want ConnectShyft to ring.
        </p>
        <p
          v-if="settingsRefusalGuidance"
          data-testid="connectshyft-settings-refusal-guidance"
          class="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {{ settingsRefusalGuidance }}
        </p>
        <p
          v-if="loadError"
          data-testid="connectshyft-settings-load-error"
          class="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {{ loadError }}
        </p>
      </header>

      <section
        data-testid="connectshyft-callback-settings-card"
        class="rounded-xl border border-slate-200 bg-slate-50 p-5"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">
              Callback / forwarding number
            </h2>
            <p class="mt-1 text-sm text-slate-600">
              Use a direct phone number where live voice calls can reach you.
            </p>
          </div>

          <span
            data-testid="connectshyft-callback-readiness-chip"
            class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
            :class="statusChipClass"
          >
            {{ statusChipLabel }}
          </span>
        </div>

        <div
          class="mt-4 rounded-lg border px-4 py-3 text-sm"
          :class="statusPanelClass"
        >
          <p
            data-testid="connectshyft-callback-readiness-message"
            class="font-medium"
          >
            {{ statusMessage }}
          </p>
          <p
            v-if="nextActionMessage"
            data-testid="connectshyft-callback-next-action"
            class="mt-1"
          >
            {{ nextActionMessage }}
          </p>
        </div>

        <div
          v-if="readiness.degradedMode"
          data-testid="connectshyft-degraded-mode-banner"
          class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <p
            data-testid="connectshyft-fallback-indicator"
            class="font-medium"
          >
            OrgUnit fallback active
          </p>
          <p class="mt-1">
            ConnectShyft is routing through the orgUnit fallback phone until a usable personal callback number is available.
          </p>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <article
            data-testid="connectshyft-voice-readiness-card"
            class="rounded-lg border px-4 py-3"
            :class="readinessCardClass(readiness.voiceReady)"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-semibold text-slate-900">
                Voice
              </p>
              <span
                data-testid="connectshyft-voice-readiness-chip"
                class="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                :class="readinessChipClass(readiness.voiceReady)"
              >
                {{ readiness.voiceReady ? 'Ready' : 'Blocked' }}
              </span>
            </div>
            <p
              data-testid="connectshyft-voice-readiness-detail"
              class="mt-2 text-sm"
            >
              {{ voiceStatusDetail }}
            </p>
          </article>

          <article
            data-testid="connectshyft-sms-readiness-card"
            class="rounded-lg border px-4 py-3"
            :class="readinessCardClass(readiness.smsReady)"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-semibold text-slate-900">
                SMS
              </p>
              <span
                data-testid="connectshyft-sms-readiness-chip"
                class="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                :class="readinessChipClass(readiness.smsReady)"
              >
                {{ readiness.smsReady ? 'Ready' : 'Blocked' }}
              </span>
            </div>
            <p
              data-testid="connectshyft-sms-readiness-detail"
              class="mt-2 text-sm"
            >
              {{ smsStatusDetail }}
            </p>
          </article>
        </div>

        <div class="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Current number
          </p>
          <p
            v-if="hasSavedCallbackNumber"
            data-testid="connectshyft-current-callback-number"
            class="mt-1 text-base font-medium text-slate-900"
          >
            {{ currentCallbackNumberLabel }}
          </p>
          <p
            v-else
            data-testid="connectshyft-callback-number-empty"
            class="mt-1 text-sm text-slate-600"
          >
            No callback number saved yet.
          </p>
        </div>

        <form
          class="mt-4"
          novalidate
          @submit.prevent="handleSave"
        >
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            Callback / forwarding number
            <input
              v-model="callbackNumberInput"
              data-testid="connectshyft-callback-number-input"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              placeholder="(317) 555-0100"
              :disabled="isInitializing || isSaving"
              class="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
          </label>

          <p class="mt-2 text-xs text-slate-500">
            Save the number you want ConnectShyft to call when a voice conversation needs you.
          </p>

          <p
            v-if="validationError"
            data-testid="connectshyft-callback-validation-error"
            class="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          >
            {{ validationError }}
          </p>

          <p
            v-if="saveSuccessMessage"
            data-testid="connectshyft-callback-save-success"
            class="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          >
            {{ saveSuccessMessage }}
          </p>

          <div class="mt-4">
            <button
              type="submit"
              :disabled="isInitializing || isSaving"
              class="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {{ saveButtonLabel }}
            </button>
          </div>
        </form>
      </section>
    </section>

    <ConnectShyftPrimaryNav />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import ConnectShyftPrimaryNav from '@/components/connectshyft/ConnectShyftPrimaryNav.vue';
import {
  DEFAULT_CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER,
  DEFAULT_CONNECTSHYFT_TELEPHONY_READINESS,
  fetchConnectShyftOperatorCallbackNumber,
  fetchConnectShyftTelephonyReadiness,
  saveConnectShyftOperatorCallbackNumber,
  type ConnectShyftOperatorCallbackNumber,
  type ConnectShyftTelephonyReadiness,
} from '@/features/connectshyft/telephonySettings';
import { normalizeConnectShyftQueryValue } from '@/features/connectshyft/settingsAccess';
import { sanitizeConnectShyftOperatorCopy } from '@/features/connectshyft/uiContracts';

const route = useRoute();

const callbackNumber = ref<ConnectShyftOperatorCallbackNumber>({
  ...DEFAULT_CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER,
});
const readiness = ref<ConnectShyftTelephonyReadiness>({
  ...DEFAULT_CONNECTSHYFT_TELEPHONY_READINESS,
});
const callbackNumberInput = ref('');
const isInitializing = ref(true);
const isSaving = ref(false);
const loadError = ref('');
const validationError = ref('');
const saveSuccessMessage = ref('');

const appendLoadError = (message: string): void => {
  if (!message) {
    return;
  }

  loadError.value = loadError.value
    ? `${loadError.value} ${message}`
    : message;
};

const settingsRefusalGuidance = computed(() => {
  const refusedPath = normalizeConnectShyftQueryValue(route.query.refusedPath);
  if (!refusedPath) {
    return '';
  }

  return `Access to ${refusedPath} is available to authorized admin users only. Use the approved settings entry points for your role.`;
});

const hasSavedCallbackNumber = computed(() =>
  Boolean(callbackNumber.value.rawInput || callbackNumber.value.value));

const currentCallbackNumberLabel = computed(() =>
  callbackNumber.value.rawInput || callbackNumber.value.value || '');

const callbackBlockingReason = computed(() =>
  readiness.value.blockingReasons.find((reason) => reason.category === 'callback_number') || null);

const orgUnitFallbackReason = computed(() =>
  readiness.value.blockingReasons.find((reason) => reason.category === 'orgunit_fallback') || null);

const smsBlockingReason = computed(() =>
  readiness.value.blockingReasons.find((reason) =>
    reason.category === 'sms'
    || reason.channel === 'sms'
    || reason.channel === 'both') || null);

const fallbackNextAction = computed(() =>
  readiness.value.nextActions[0]?.message || '');

const statusChipLabel = computed(() => {
  if (readiness.value.degradedMode) {
    return 'Degraded Mode';
  }

  if (readiness.value.voiceReady && readiness.value.smsReady) {
    return 'Ready';
  }

  if (hasSavedCallbackNumber.value) {
    return 'Saved';
  }

  return 'Action Needed';
});

const statusChipClass = computed(() => {
  if (readiness.value.degradedMode) {
    return 'border border-amber-200 bg-amber-100 text-amber-800';
  }

  if (readiness.value.voiceReady && readiness.value.smsReady) {
    return 'border border-emerald-200 bg-emerald-100 text-emerald-800';
  }

  if (hasSavedCallbackNumber.value) {
    return 'border border-sky-200 bg-sky-100 text-sky-800';
  }

  return 'border border-amber-200 bg-amber-100 text-amber-800';
});

const statusPanelClass = computed(() => {
  if (readiness.value.degradedMode) {
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }

  if (readiness.value.voiceReady && readiness.value.smsReady) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  }

  if (hasSavedCallbackNumber.value) {
    return 'border-sky-200 bg-sky-50 text-sky-900';
  }

  return 'border-amber-200 bg-amber-50 text-amber-900';
});

const statusMessage = computed(() => {
  if (readiness.value.degradedMode) {
    return 'Voice and SMS are available, but ConnectShyft is relying on the orgUnit fallback phone.';
  }

  if (readiness.value.voiceReady && readiness.value.smsReady) {
    return 'Voice and SMS are ready for this operator.';
  }

  if (readiness.value.voiceReady) {
    return 'Voice is ready, but SMS still needs more setup.';
  }

  if (readiness.value.smsReady) {
    return 'SMS is ready, but voice forwarding still needs more setup.';
  }

  if (callbackBlockingReason.value?.message) {
    return callbackBlockingReason.value.message;
  }

  if (hasSavedCallbackNumber.value) {
    return 'Your callback number is saved, but voice forwarding still needs more setup.';
  }

  return 'Save a callback number so inbound and bridge calls can reach you.';
});

const nextActionMessage = computed(() => {
  if (readiness.value.voiceReady && readiness.value.smsReady && !readiness.value.degradedMode) {
    return '';
  }

  const callbackSpecificAction = readiness.value.nextActions.find((action) =>
    action.code === 'SET_OPERATOR_CALLBACK_NUMBER'
    || action.code === 'REPLACE_OPERATOR_CALLBACK_NUMBER');

  return callbackSpecificAction?.message || fallbackNextAction.value;
});

const voiceStatusDetail = computed(() => {
  if (readiness.value.degradedMode && orgUnitFallbackReason.value?.message) {
    return orgUnitFallbackReason.value.message;
  }

  if (readiness.value.voiceReady) {
    return 'Bridge and inbound voice calls can route to the active operator destination.';
  }

  if (callbackBlockingReason.value?.message) {
    return callbackBlockingReason.value.message;
  }

  return 'Voice forwarding still needs a usable operator destination.';
});

const smsStatusDetail = computed(() => {
  if (readiness.value.degradedMode && orgUnitFallbackReason.value?.message) {
    return 'SMS remains runnable while the orgUnit fallback phone is carrying telephony readiness.';
  }

  if (readiness.value.smsReady) {
    return 'Outbound SMS can route through the current telephony configuration.';
  }

  if (smsBlockingReason.value?.message) {
    return smsBlockingReason.value.message;
  }

  if (callbackBlockingReason.value?.message) {
    return 'SMS is blocked until the operator phone path becomes runnable.';
  }

  return 'SMS still needs more telephony setup before dispatch is allowed.';
});

const readinessCardClass = (isReady: boolean): string => isReady
  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
  : 'border-amber-200 bg-amber-50 text-amber-900';

const readinessChipClass = (isReady: boolean): string => isReady
  ? 'border border-emerald-200 bg-emerald-100 text-emerald-800'
  : 'border border-amber-200 bg-amber-100 text-amber-800';

const saveButtonLabel = computed(() =>
  hasSavedCallbackNumber.value ? 'Update Callback Number' : 'Save Callback Number');

const clearFeedback = (): void => {
  validationError.value = '';
  saveSuccessMessage.value = '';
};

const syncCallbackNumber = (nextValue: ConnectShyftOperatorCallbackNumber): void => {
  callbackNumber.value = nextValue;
  callbackNumberInput.value = nextValue.rawInput || nextValue.value || '';
};

const refreshReadiness = async (): Promise<void> => {
  try {
    readiness.value = await fetchConnectShyftTelephonyReadiness();
  } catch (error: unknown) {
    readiness.value = {
      ...DEFAULT_CONNECTSHYFT_TELEPHONY_READINESS,
    };
    appendLoadError(
      sanitizeConnectShyftOperatorCopy(
        error instanceof Error ? error.message : '',
        'Unable to load telephony readiness right now.',
      ),
    );
  }
};

const loadSettings = async (): Promise<void> => {
  loadError.value = '';

  const [callbackNumberResult, readinessResult] = await Promise.allSettled([
    fetchConnectShyftOperatorCallbackNumber(),
    fetchConnectShyftTelephonyReadiness(),
  ]);

  if (callbackNumberResult.status === 'fulfilled') {
    syncCallbackNumber(callbackNumberResult.value);
  } else {
    appendLoadError(
      sanitizeConnectShyftOperatorCopy(
        callbackNumberResult.reason instanceof Error ? callbackNumberResult.reason.message : '',
        'Unable to load callback settings right now.',
      ),
    );
  }

  if (readinessResult.status === 'fulfilled') {
    readiness.value = readinessResult.value;
  } else {
    readiness.value = {
      ...DEFAULT_CONNECTSHYFT_TELEPHONY_READINESS,
    };
    appendLoadError(
      sanitizeConnectShyftOperatorCopy(
        readinessResult.reason instanceof Error ? readinessResult.reason.message : '',
        'Unable to load telephony readiness right now.',
      ),
    );
  }
};

const handleSave = async (): Promise<void> => {
  if (isInitializing.value) {
    return;
  }

  clearFeedback();
  isSaving.value = true;

  const result = await saveConnectShyftOperatorCallbackNumber({
    callbackNumber: callbackNumberInput.value,
  });

  isSaving.value = false;

  if (!result.ok) {
    validationError.value = sanitizeConnectShyftOperatorCopy(
      result.message,
      'Unable to save the callback number right now.',
    );
    return;
  }

  syncCallbackNumber(result.callbackNumber);
  saveSuccessMessage.value = 'Callback number saved.';
  loadError.value = '';
  await refreshReadiness();
};

onMounted(async () => {
  clearFeedback();

  try {
    await loadSettings();
  } finally {
    isInitializing.value = false;
  }
});
</script>
