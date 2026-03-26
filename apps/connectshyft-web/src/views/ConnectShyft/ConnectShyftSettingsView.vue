<template>
  <main class="cs-page-shell">
    <section
      data-testid="connectshyft-settings-surface"
      class="cs-page-shell__inner--narrow cs-stack"
    >
      <SurfaceCard padding="default" panel tone="soft">
        <header class="space-y-4">
          <SectionHeader
            eyebrow="Settings"
            title="ConnectShyft Settings"
            description="Choose the phone number ConnectShyft should ring when someone needs you."
            size="md"
          />
          <p class="cs-body">
            Save the number you want ConnectShyft to call first when a conversation needs you.
          </p>
        </header>
        <p
          v-if="settingsRefusalGuidance"
          data-testid="connectshyft-settings-refusal-guidance"
          class="cs-shell-notice cs-shell-notice--warning mt-4"
        >
          {{ settingsRefusalGuidance }}
        </p>
        <p
          v-if="loadError"
          data-testid="connectshyft-settings-load-error"
          class="cs-shell-notice cs-shell-notice--warning mt-4"
        >
          {{ loadError }}
        </p>
      </SurfaceCard>

      <SurfaceCard
        data-testid="connectshyft-callback-settings-card"
        class="min-w-0"
        padding="default"
        panel
        tone="soft"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader
            eyebrow="Call setup"
            title="Callback number"
            description="Use a direct phone number where live calls can reach you."
            size="md"
          />

          <StatusBadge
            data-testid="connectshyft-callback-readiness-chip"
            :tone="statusChipTone"
            :label="statusChipLabel"
          />
        </div>

        <div
          class="mt-4 cs-shell-notice"
          :class="statusPanelClass"
        >
          <p
            data-testid="connectshyft-callback-readiness-message"
            class="font-semibold"
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
          class="cs-shell-notice cs-shell-notice--warning mt-4"
        >
          <p
            data-testid="connectshyft-fallback-indicator"
            class="font-semibold"
          >
            Backup line active
          </p>
          <p class="mt-1">
            ConnectShyft can still reach you, but it is relying on the backup line until you save your own callback number.
          </p>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <SurfaceCard
            data-testid="connectshyft-voice-readiness-card"
            padding="compact"
            :class="readinessCardClass(readiness.voiceReady)"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="cs-heading-md text-base">
                Voice
              </p>
              <StatusBadge
                data-testid="connectshyft-voice-readiness-chip"
                :tone="readiness.voiceReady ? 'success' : 'attention'"
                :label="readiness.voiceReady ? 'Ready' : 'Blocked'"
              />
            </div>
            <p
              data-testid="connectshyft-voice-readiness-detail"
              class="mt-2 cs-body"
            >
              {{ voiceStatusDetail }}
            </p>
          </SurfaceCard>

          <SurfaceCard
            data-testid="connectshyft-sms-readiness-card"
            padding="compact"
            :class="readinessCardClass(readiness.smsReady)"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="cs-heading-md text-base">
                SMS
              </p>
              <StatusBadge
                data-testid="connectshyft-sms-readiness-chip"
                :tone="readiness.smsReady ? 'success' : 'attention'"
                :label="readiness.smsReady ? 'Ready' : 'Blocked'"
              />
            </div>
            <p
              data-testid="connectshyft-sms-readiness-detail"
              class="mt-2 cs-body"
            >
              {{ smsStatusDetail }}
            </p>
          </SurfaceCard>
        </div>

        <SurfaceCard class="mt-4" padding="compact">
          <p class="cs-kicker">
            Current number
          </p>
          <p
            v-if="hasSavedCallbackNumber"
            data-testid="connectshyft-current-callback-number"
            class="mt-2 text-base font-semibold text-stone-900"
          >
            {{ currentCallbackNumberLabel }}
          </p>
          <p
            v-else
            data-testid="connectshyft-callback-number-empty"
            class="mt-2 cs-body"
          >
            No callback number saved yet.
          </p>
        </SurfaceCard>

        <form
          class="mt-4"
          novalidate
          @submit.prevent="handleSave"
        >
          <label class="cs-field-label">
            Callback number
            <input
              v-model="callbackNumberInput"
              data-testid="connectshyft-callback-number-input"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              placeholder="(317) 555-0100"
              :disabled="isInitializing || isSaving"
              class="cs-input"
            >
          </label>

          <p class="mt-2 cs-meta">
            Save the number ConnectShyft should use when a live call needs you.
          </p>

          <p
            v-if="validationError"
            data-testid="connectshyft-callback-validation-error"
            class="cs-shell-notice cs-shell-notice--warning mt-3"
          >
            {{ validationError }}
          </p>

          <p
            v-if="saveSuccessMessage"
            data-testid="connectshyft-callback-save-success"
            class="cs-shell-notice mt-3 border-emerald-200 bg-emerald-50 text-emerald-900"
          >
            {{ saveSuccessMessage }}
          </p>

          <div class="mt-4">
            <ActionButton
              type="submit"
              :disabled="isInitializing || isSaving"
              tone="primary"
            >
              {{ saveButtonLabel }}
            </ActionButton>
          </div>
        </form>
      </SurfaceCard>
    </section>

  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import ActionButton from '@/components/ui/ActionButton.vue';
import SectionHeader from '@/components/ui/SectionHeader.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import SurfaceCard from '@/components/ui/SurfaceCard.vue';
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

  return 'That page is only available to people with the right permissions. Use the settings pages available for your role.';
});

const hasSavedCallbackNumber = computed(() =>
  Boolean(callbackNumber.value.rawInput || callbackNumber.value.value));

const currentCallbackNumberLabel = computed(() =>
  callbackNumber.value.rawInput || callbackNumber.value.value || '');

const statusChipLabel = computed(() => {
  if (readiness.value.degradedMode) {
    return 'Using backup line';
  }

  if (readiness.value.voiceReady && readiness.value.smsReady) {
    return 'Ready';
  }

  if (hasSavedCallbackNumber.value) {
    return 'Number saved';
  }

  return 'Needs setup';
});

const statusChipTone = computed<'attention' | 'success' | 'context'>(() => {
  if (readiness.value.degradedMode) {
    return 'attention';
  }

  if (readiness.value.voiceReady && readiness.value.smsReady) {
    return 'success';
  }

  if (hasSavedCallbackNumber.value) {
    return 'context';
  }

  return 'attention';
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
    return 'Calls can reach you now, and texting is available when a conversation is ready to text. Calls are still using the backup line.';
  }

  if (readiness.value.voiceReady && readiness.value.smsReady) {
    return 'Calls are ready, and texting is available when a conversation is ready to text.';
  }

  if (readiness.value.voiceReady) {
    return 'Calls are ready. Texting still needs setup before a conversation can send texts.';
  }

  if (readiness.value.smsReady) {
    return 'Texting is available when a conversation is ready to text. Calls still need a callback number.';
  }

  if (hasSavedCallbackNumber.value) {
    return 'Your callback number is saved, but calling still needs a little more setup.';
  }

  return 'Calls still need a callback number, and texting still needs setup before a conversation can send texts.';
});

const nextActionMessage = computed(() => {
  if (readiness.value.voiceReady && readiness.value.smsReady && !readiness.value.degradedMode) {
    return '';
  }

  if (readiness.value.degradedMode) {
    return 'Save your callback number to stop using the backup line for calls.';
  }

  if (!readiness.value.voiceReady) {
    return hasSavedCallbackNumber.value
      ? 'Finish the remaining calling setup.'
      : 'Save a callback number so calls can reach you.';
  }

  if (!readiness.value.smsReady) {
    return 'Finish the remaining texting setup for this workspace.';
  }

  return '';
});

const voiceStatusDetail = computed(() => {
  if (readiness.value.degradedMode) {
    return 'Calls can still reach you because the backup line is standing in for your number.';
  }

  if (readiness.value.voiceReady) {
    return 'Calls can reach you on the saved line.';
  }

  if (hasSavedCallbackNumber.value) {
    return 'Calls still need a working callback number.';
  }

  return 'Calls are waiting for a callback number.';
});

const smsStatusDetail = computed(() => {
  if (readiness.value.degradedMode) {
    return 'Texting can still go out when a conversation is ready to text.';
  }

  if (readiness.value.smsReady) {
    return 'This workspace can text when a conversation is ready to text.';
  }

  return 'Texting still needs setup before a conversation can send texts.';
});

const readinessCardClass = (isReady: boolean): string => isReady
  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
  : 'border-amber-200 bg-amber-50 text-amber-900';

const saveButtonLabel = computed(() =>
  hasSavedCallbackNumber.value ? 'Update Number' : 'Save Number');

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
        'Unable to load call and text status right now.',
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
        'Unable to load call and text status right now.',
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
