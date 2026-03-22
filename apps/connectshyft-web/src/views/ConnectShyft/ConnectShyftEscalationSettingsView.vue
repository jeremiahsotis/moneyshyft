<template>
  <main class="min-h-screen bg-slate-50 px-4 py-8 pb-32">
    <section
      data-testid="connectshyft-escalation-settings-surface"
      class="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header class="mb-6">
        <h1 class="text-2xl font-semibold text-slate-900">
          ConnectShyft Escalation Settings
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          Configure orgUnit escalation baseline and recipient targets.
        </p>
        <p class="mt-2 text-sm text-slate-600">
          Escalation resets only when a thread is claimed. Outbound actions without claim do not reset escalation, and baseline hours directly affect scheduler timing.
        </p>
        <p
          data-testid="connectshyft-admin-settings-context-chip"
          class="mt-3 inline-flex rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700"
        >
          Admin settings context
        </p>
      </header>

      <form
        data-testid="connectshyft-escalation-settings-form"
        class="rounded-md border border-slate-200 p-4"
        novalidate
        @submit.prevent="handleSave"
      >
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Escalation Configuration
        </h2>

        <label class="mb-4 flex flex-col gap-1 text-sm text-slate-700">
          Escalation baseline (hours)
          <input
            data-testid="connectshyft-escalation-baseline-input"
            v-model.number="baselineHoursInput"
            type="number"
            min="1"
            max="24"
            step="1"
            autocomplete="off"
            :disabled="isSaving || isInitializing"
            class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
        </label>

        <label class="mb-4 flex flex-col gap-1 text-sm text-slate-700">
          OrgUnit fallback phone (E.164)
          <input
            data-testid="connectshyft-escalation-fallback-phone-input"
            v-model="defaultOperatorPhoneInput"
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            placeholder="+13175550100"
            :disabled="isSaving || isInitializing"
            class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
          <span class="text-xs text-slate-500">
            Used when an operator callback number is missing or unusable and the orgUnit fallback must carry telephony readiness.
          </span>
        </label>

        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            Primary recipient
            <select
              data-testid="connectshyft-escalation-recipient-primary"
              v-model="primaryRecipientUserId"
              :disabled="isSaving || isInitializing"
              class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">Select recipient</option>
              <option
                v-for="option in primaryRecipientOptions"
                :key="`primary-${option.value}`"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="flex flex-col gap-1 text-sm text-slate-700">
            Secondary recipient
            <select
              data-testid="connectshyft-escalation-recipient-secondary"
              v-model="secondaryRecipientUserId"
              :disabled="isSaving || isInitializing"
              class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">None</option>
              <option
                v-for="option in secondaryRecipientOptions"
                :key="`secondary-${option.value}`"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="flex flex-col gap-1 text-sm text-slate-700">
            Tenant staff recipient
            <select
              data-testid="connectshyft-escalation-recipient-tenant-staff"
              v-model="tenantStaffRecipientUserId"
              :disabled="isSaving || isInitializing"
              class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">None</option>
              <option
                v-for="option in tenantStaffRecipientOptions"
                :key="`tenant-staff-${option.value}`"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <p
          v-if="primaryRecipientError"
          data-testid="connectshyft-escalation-recipient-error-primary"
          class="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {{ primaryRecipientError }}
        </p>

        <p
          v-if="validationError"
          data-testid="connectshyft-escalation-validation-error"
          class="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {{ validationError }}
        </p>

        <p
          v-if="saveSuccessMessage"
          data-testid="connectshyft-escalation-save-success"
          class="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
        >
          {{ saveSuccessMessage }}
        </p>

        <p
          data-testid="connectshyft-escalation-baseline-display"
          class="mt-3 text-sm text-slate-700"
        >
          {{ savedBaselineHours }} hours
        </p>

        <div class="mt-4">
          <button
            type="submit"
            :disabled="isSaving || isInitializing"
            class="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Save Escalation Settings
          </button>
        </div>
      </form>
    </section>

    <ConnectShyftPrimaryNav />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import ConnectShyftPrimaryNav from '@/components/connectshyft/ConnectShyftPrimaryNav.vue';
import {
  connectShyftEscalationRecipientScopes,
  fetchConnectShyftEscalationRecipientOptions,
  fetchConnectShyftEscalationConfig,
  saveConnectShyftEscalationConfig,
  type ConnectShyftEscalationRecipientOption,
} from '@/features/connectshyft/escalation';

const recipientOptions = ref<ConnectShyftEscalationRecipientOption[]>([]);

const baselineHoursInput = ref<number | null>(24);
const savedBaselineHours = ref(24);
const defaultOperatorPhoneInput = ref('');
const primaryRecipientUserId = ref('');
const secondaryRecipientUserId = ref('');
const tenantStaffRecipientUserId = ref('');
const validationError = ref('');
const primaryRecipientError = ref('');
const saveSuccessMessage = ref('');
const isInitializing = ref(true);
const isSaving = ref(false);

const primaryRecipientOptions = computed(() =>
  recipientOptions.value.filter(
    (option) => option.scope === connectShyftEscalationRecipientScopes.ORG_UNIT,
  ));
const secondaryRecipientOptions = computed(() =>
  recipientOptions.value.filter(
    (option) => option.scope === connectShyftEscalationRecipientScopes.ORG_UNIT,
  ));
const tenantStaffRecipientOptions = computed(() =>
  recipientOptions.value.filter(
    (option) => option.scope !== connectShyftEscalationRecipientScopes.TEST_ONLY,
  ));

const clearFeedback = (): void => {
  validationError.value = '';
  primaryRecipientError.value = '';
  saveSuccessMessage.value = '';
};

const syncFromServer = (
  baselineHours: number,
  defaultOperatorPhoneE164: string | null,
  recipients: {
    primaryOrgUnitAdminUserId: string;
    secondaryOrgUnitAdminUserId: string;
    tenantStaffUserId: string;
  },
): void => {
  baselineHoursInput.value = baselineHours;
  savedBaselineHours.value = baselineHours;
  defaultOperatorPhoneInput.value = defaultOperatorPhoneE164 || '';
  primaryRecipientUserId.value = recipients.primaryOrgUnitAdminUserId;
  secondaryRecipientUserId.value = recipients.secondaryOrgUnitAdminUserId;
  tenantStaffRecipientUserId.value = recipients.tenantStaffUserId;
};

const handleSave = async (): Promise<void> => {
  if (isInitializing.value) {
    return;
  }

  clearFeedback();
  isSaving.value = true;

  const parsedBaseline =
    typeof baselineHoursInput.value === 'number' && Number.isFinite(baselineHoursInput.value)
      ? baselineHoursInput.value
      : undefined;

  const result = await saveConnectShyftEscalationConfig({
    escalationBaselineHours: parsedBaseline,
    defaultOperatorPhoneE164: defaultOperatorPhoneInput.value,
    recipients: {
      primaryOrgUnitAdminUserId: primaryRecipientUserId.value,
      secondaryOrgUnitAdminUserId: secondaryRecipientUserId.value,
      tenantStaffUserId: tenantStaffRecipientUserId.value,
    },
  });

  isSaving.value = false;

  if (!result.ok) {
    const primaryRequiredError = result.fieldErrors.find(
      (fieldError) =>
        fieldError.field === 'recipients.primaryOrgUnitAdminUserId'
        && fieldError.reason === 'REQUIRED'
        && fieldError.message.trim().length > 0,
    );

    if (primaryRequiredError) {
      primaryRecipientError.value = primaryRequiredError.message;
      return;
    }

    validationError.value = result.message;
    return;
  }

  syncFromServer(
    result.config.escalationBaselineHours,
    result.config.defaultOperatorPhoneE164,
    result.config.recipients,
  );
  saveSuccessMessage.value = 'Escalation settings saved.';
};

onMounted(async () => {
  clearFeedback();

  try {
    const config = await fetchConnectShyftEscalationConfig();
    syncFromServer(
      config.escalationBaselineHours,
      config.defaultOperatorPhoneE164,
      config.recipients,
    );
  } catch (error: unknown) {
    validationError.value = error instanceof Error
      ? error.message
      : 'Unable to load escalation settings right now.';
  }

  try {
    const options = await fetchConnectShyftEscalationRecipientOptions();
    recipientOptions.value = options;
    if (options.length === 0 && !validationError.value) {
      validationError.value = 'No eligible recipients are available for this orgUnit. Ask a tenant administrator to assign orgUnit or tenant members.';
    }
  } catch (error: unknown) {
    recipientOptions.value = [];
    const message = error instanceof Error
      ? error.message
      : 'Unable to load escalation recipients right now.';
    validationError.value = validationError.value
      ? `${validationError.value} ${message}`
      : message;
  }

  isInitializing.value = false;
});
</script>
