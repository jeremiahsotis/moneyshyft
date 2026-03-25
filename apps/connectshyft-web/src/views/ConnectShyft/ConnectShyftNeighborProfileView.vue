<template>
  <main class="min-h-screen bg-slate-50 px-4 py-8">
    <section class="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header class="mb-6">
        <h1 class="text-2xl font-semibold text-slate-900">
          Contact Profile
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          Update the details that help everyone respond with confidence.
        </p>
      </header>

      <section
        class="mb-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
      >
        <p class="font-medium text-slate-900">Current workspace</p>
        <p class="mt-1">
          {{
            scope
              ? 'This contact stays available from the current workspace while shared details remain in sync.'
              : 'Confirming your current workspace.'
          }}
        </p>
      </section>

      <section
        v-if="contextOverrideNotice || editPolicyIndicator"
        class="mb-6 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
      >
        <p
          v-if="contextOverrideNotice"
          data-testid="connectshyft-context-override-notice"
          class="font-medium"
        >
          {{ contextOverrideNotice }}
        </p>
        <p
          v-else-if="editPolicyIndicator"
          data-testid="connectshyft-neighbor-edit-policy-indicator"
          class="font-medium"
        >
          {{ editPolicyIndicator }}
        </p>
      </section>

      <section
        v-if="refusalState"
        data-testid="connectshyft-neighbor-profile-refusal-state"
        class="mb-6 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        <p class="font-medium">Unable to load neighbor profile</p>
        <p class="mt-1">{{ refusalState.message }}</p>
        <button
          type="button"
          disabled
          class="mt-3 rounded bg-slate-400 px-3 py-2 text-sm font-medium text-white"
        >
          Save Contact Profile
        </button>
      </section>

      <form
        v-show="!refusalState"
        data-testid="connectshyft-neighbor-profile-form"
        class="rounded-md border border-slate-200 p-4"
        novalidate
        @submit.prevent="handleSave"
      >
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            First name
            <input
              data-testid="connectshyft-neighbor-first-name-input"
              v-model="firstName"
              type="text"
              autocomplete="off"
              :disabled="isSubmitting"
              class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
          </label>

          <label class="flex flex-col gap-1 text-sm text-slate-700">
            Last name
            <input
              data-testid="connectshyft-neighbor-last-name-input"
              v-model="lastName"
              type="text"
              autocomplete="off"
              :disabled="isSubmitting"
              class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
          </label>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            Prefers texting
            <select
              data-testid="connectshyft-neighbor-prefers-texting-select"
              v-model="prefersTexting"
              :disabled="isSubmitting"
              class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="YES">Yes</option>
              <option value="NO">No</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </label>
        </div>

        <section class="mt-4 space-y-3">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Phone indicators</h2>

          <article
            v-for="(phone, index) in phones"
            :key="`${phone.phoneId}-${index}`"
            class="rounded border border-slate-200 p-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-slate-900">
                  {{ phone.label || 'phone' }} · {{ phone.value }}
                </p>
                <p
                  :data-testid="`connectshyft-neighbor-phone-shared-indicator-${phoneTestSuffix(phone)}`"
                  class="mt-1 text-xs font-medium"
                  :class="phone.isShared ? 'text-emerald-700' : 'text-slate-500'"
                >
                  {{ phone.isShared ? 'Shared' : 'Not shared' }}
                </p>
              </div>

              <label class="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  :data-testid="`connectshyft-neighbor-phone-shared-toggle-${phoneTestSuffix(phone)}`"
                  :checked="phone.isShared"
                  :disabled="isSubmitting"
                  type="checkbox"
                  @change="toggleShared(index, $event)"
                >
                Shared number
              </label>
            </div>
          </article>
        </section>

        <p
          v-if="validationError"
          class="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {{ validationError }}
        </p>

        <p
          v-if="successMessage"
          data-testid="connectshyft-neighbor-profile-save-success"
          class="mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
        >
          {{ successMessage }}
        </p>

        <div class="mt-4">
          <button
            type="submit"
            :disabled="isSubmitting || Boolean(refusalState)"
            class="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Save Contact Profile
          </button>
        </div>

        <section
          v-if="provenanceOrgUnit || provenanceActor"
          class="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
        >
          <p class="font-semibold text-slate-900">Recent update</p>
          <p
            data-testid="connectshyft-neighbor-provenance-orgunit"
            class="mt-1"
          >
            {{ provenanceOrgUnit ? 'Saved from the current workspace.' : '' }}
          </p>
          <p
            data-testid="connectshyft-neighbor-provenance-actor"
            class="mt-1"
          >
            {{ provenanceActor ? 'A teammate made the latest update.' : '' }}
          </p>
        </section>

        <section
          v-if="canRenderMergeControls"
          class="mt-6 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
        >
          <p class="font-semibold text-rose-950">Merge duplicate contact</p>
          <p class="mt-1">
            This action is irreversible and folds the selected duplicate into the contact you are viewing.
          </p>

          <section
            v-if="mergeActiveRefusalState"
            data-testid="connectshyft-neighbor-merge-refusal-state"
            class="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900"
          >
            <p class="font-medium">Merge unavailable</p>
            <p class="mt-1">{{ mergeActiveRefusalState.message }}</p>
          </section>

          <p
            v-if="mergeSuccessMessage"
            data-testid="connectshyft-neighbor-merge-success"
            class="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          >
            {{ mergeSuccessMessage }}
          </p>

          <div v-if="!mergeActiveRefusalState" class="mt-3">
            <button
              type="button"
              data-testid="connectshyft-neighbor-merge-action"
              :disabled="!canOpenMergeModal"
              class="rounded bg-rose-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-rose-300"
              @click="openMergeModal"
            >
              Merge Duplicate
            </button>
          </div>
        </section>
      </form>
    </section>

    <section
      v-if="isMergeModalOpen"
      data-testid="connectshyft-neighbor-merge-confirmation-modal"
      class="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4"
    >
      <div class="w-full max-w-lg rounded-lg border border-slate-300 bg-white p-5 shadow-lg">
        <h2 class="text-lg font-semibold text-slate-900">Confirm merge</h2>
        <p class="mt-2 text-sm text-slate-700">
          This action is irreversible. Type the exact confirmation phrase to continue.
        </p>
        <p
          data-testid="connectshyft-neighbor-merge-impact-summary"
          class="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
        >
          The selected duplicate will be merged into this contact.
        </p>

        <label class="mt-4 block text-sm text-slate-700">
          Confirmation phrase
          <input
            data-testid="connectshyft-neighbor-merge-confirmation-input"
            v-model="mergeConfirmationInput"
            type="text"
            autocomplete="off"
            :disabled="isMergeSubmitting"
            class="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
        </label>

        <p v-if="mergeInlineErrorMessage" data-testid="connectshyft-neighbor-merge-confirmation-error" class="mt-2 text-xs text-rose-700">
          {{ mergeInlineErrorMessage }}
        </p>

        <div class="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            :disabled="isMergeSubmitting"
            class="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
            @click="closeMergeModal"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="connectshyft-neighbor-merge-confirmation-submit"
            :disabled="!canSubmitMerge"
            class="rounded bg-rose-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-rose-300"
            @click="handleMerge"
          >
            Merge Contact
          </button>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  fetchConnectShyftNeighborProfile,
  mergeConnectShyftNeighborProfiles,
  type ConnectShyftNeighbor,
  type ConnectShyftNeighborPhone,
  type ConnectShyftNeighborScope,
  type ConnectShyftTextingPreference,
  updateConnectShyftNeighborProfile,
} from '@/features/connectshyft/neighbors';

const route = useRoute();
const neighborId = computed(() => {
  const rawNeighborId = route.params.neighborId;
  return typeof rawNeighborId === 'string' ? rawNeighborId : '';
});

const isSubmitting = ref(false);
const validationError = ref('');
const successMessage = ref('');
const scope = ref<ConnectShyftNeighborScope | null>(null);
const profile = ref<ConnectShyftNeighbor | null>(null);
const firstName = ref('');
const lastName = ref('');
const prefersTexting = ref<ConnectShyftTextingPreference>('YES');
const phones = ref<ConnectShyftNeighborPhone[]>([]);
const refusalState = ref<{ code: string; message: string } | null>(null);
const editPolicyIndicator = ref<string | null>(null);
const contextOverrideNotice = ref<string | null>(null);
const provenanceOrgUnit = ref<string | null>(null);
const provenanceActor = ref<string | null>(null);
const isMergeModalOpen = ref(false);
const isMergeSubmitting = ref(false);
const mergeConfirmationInput = ref('');
const mergeError = ref('');
const mergeSuccessMessage = ref('');
const mergeAuditBeforeId = ref<string | null>(null);
const mergeAuditAfterId = ref<string | null>(null);
const mergeRefusalState = ref<{ code: string; message: string } | null>(null);
const MERGE_CONFIRMATION_PHRASE = 'IRREVERSIBLE MERGE';
const MERGE_FORBIDDEN_CODE = 'CONNECTSHYFT_NEIGHBOR_MERGE_FORBIDDEN';
const MERGE_FORBIDDEN_MESSAGE = 'Merging contacts requires the right permissions.';

const mergeCandidateNeighborId = computed(() => {
  const rawCandidate = route.query.mergeCandidateNeighborId;
  return typeof rawCandidate === 'string' ? rawCandidate.trim() : '';
});

const requestedRole = computed(() => {
  const rawRole = route.query.tenantRole;
  return typeof rawRole === 'string' ? rawRole.trim().toUpperCase() : '';
});

const mergeRoleForbidden = computed(() => {
  if (!requestedRole.value) {
    return false;
  }

  return requestedRole.value !== 'TENANT_ADMIN'
    && requestedRole.value !== 'ORGUNIT_IDENTITY_LEAD';
});

const mergeForbiddenState = computed(() => {
  if (!mergeRoleForbidden.value) {
    return null;
  }

  return {
    code: MERGE_FORBIDDEN_CODE,
    message: MERGE_FORBIDDEN_MESSAGE,
  };
});

const mergeActiveRefusalState = computed(() => mergeRefusalState.value || mergeForbiddenState.value);

const canRenderMergeControls = computed(() => {
  return Boolean(profile.value && mergeCandidateNeighborId.value && !refusalState.value);
});

const mergeConfirmationMismatch = computed(() => {
  return mergeConfirmationInput.value.length > 0
    && mergeConfirmationInput.value !== MERGE_CONFIRMATION_PHRASE;
});

const mergeInlineErrorMessage = computed(() => {
  if (mergeConfirmationMismatch.value) {
    return 'Type the irreversible confirmation phrase exactly';
  }
  return mergeError.value;
});

const canOpenMergeModal = computed(() => {
  return canRenderMergeControls.value
    && !mergeActiveRefusalState.value
    && !isSubmitting.value
    && !isMergeSubmitting.value
    && !mergeSuccessMessage.value;
});

const canSubmitMerge = computed(() => {
  return mergeConfirmationInput.value === MERGE_CONFIRMATION_PHRASE
    && !isMergeSubmitting.value;
});

const phoneTestSuffix = (phone: ConnectShyftNeighborPhone): string => {
  const normalizedLabel = phone.label.trim().toLowerCase().replace(/\s+/g, '-');
  return normalizedLabel || String(phone.sortOrder || 0);
};

const hydrateProfileState = (neighbor: ConnectShyftNeighbor): void => {
  profile.value = neighbor;
  firstName.value = neighbor.firstName;
  lastName.value = neighbor.lastName;
  prefersTexting.value = neighbor.prefersTexting;
  phones.value = neighbor.phones.map((phone) => ({ ...phone }));
};

const loadProfile = async (): Promise<void> => {
  validationError.value = '';
  successMessage.value = '';
  refusalState.value = null;
  editPolicyIndicator.value = null;
  contextOverrideNotice.value = null;
  provenanceOrgUnit.value = null;
  provenanceActor.value = null;
  isMergeModalOpen.value = false;
  isMergeSubmitting.value = false;
  mergeConfirmationInput.value = '';
  mergeError.value = '';
  mergeSuccessMessage.value = '';
  mergeAuditBeforeId.value = null;
  mergeAuditAfterId.value = null;
  mergeRefusalState.value = null;

  if (!neighborId.value) {
    refusalState.value = {
      code: 'CONNECTSHYFT_NEIGHBOR_ID_REQUIRED',
      message: 'neighborId is required',
    };
    return;
  }

  const result = await fetchConnectShyftNeighborProfile(neighborId.value);
  if (!result.ok) {
    refusalState.value = {
      code: result.code,
      message: result.message,
    };

    if (result.scope) {
      scope.value = result.scope;
    }
    return;
  }

  if (result.scope) {
    scope.value = result.scope;
  }
  hydrateProfileState(result.neighbor);
  editPolicyIndicator.value = result.editPolicy?.indicator || null;
  contextOverrideNotice.value = result.contextOverrideNotice;
};

const toggleShared = (index: number, event: Event): void => {
  const target = event.target as HTMLInputElement;
  const current = phones.value[index];
  if (!current) {
    return;
  }

  phones.value[index] = {
    ...current,
    isShared: target.checked,
  };
};

const handleSave = async (): Promise<void> => {
  if (!profile.value) {
    return;
  }

  validationError.value = '';
  successMessage.value = '';

  isSubmitting.value = true;
  const result = await updateConnectShyftNeighborProfile(profile.value.neighborId, {
    orgUnitId: scope.value?.orgUnitId,
    firstName: firstName.value,
    lastName: lastName.value,
    prefersTexting: prefersTexting.value,
    phones: phones.value.map((phone) => ({
      label: phone.label,
      value: phone.value,
      isShared: phone.isShared,
      verificationStatus: phone.verificationStatus,
    })),
  });
  isSubmitting.value = false;

  if (!result.ok) {
    validationError.value = result.message;
    if (result.scope) {
      scope.value = result.scope;
    }
    provenanceOrgUnit.value = null;
    provenanceActor.value = null;
    return;
  }

  refusalState.value = null;
  if (result.scope) {
    scope.value = result.scope;
  }
  hydrateProfileState(result.neighbor);
  editPolicyIndicator.value = result.editPolicy?.indicator || null;
  contextOverrideNotice.value = result.contextOverrideNotice;
  provenanceOrgUnit.value = result.provenance?.orgUnitId || null;
  provenanceActor.value = result.provenance?.actorUserId || null;
  successMessage.value = 'Contact profile updated.';
};

const openMergeModal = (): void => {
  if (!canOpenMergeModal.value || !profile.value) {
    return;
  }

  mergeRefusalState.value = null;
  mergeError.value = '';
  mergeConfirmationInput.value = '';
  isMergeModalOpen.value = true;
};

const closeMergeModal = (): void => {
  if (isMergeSubmitting.value) {
    return;
  }

  isMergeModalOpen.value = false;
  mergeConfirmationInput.value = '';
  mergeError.value = '';
};

const handleMerge = async (): Promise<void> => {
  if (!profile.value || !mergeCandidateNeighborId.value || !scope.value) {
    return;
  }

  mergeError.value = '';
  mergeRefusalState.value = null;

  if (!canSubmitMerge.value) {
    mergeError.value = 'Type the irreversible confirmation phrase exactly';
    return;
  }

  isMergeSubmitting.value = true;
  const result = await mergeConnectShyftNeighborProfiles({
    orgUnitId: scope.value.orgUnitId,
    sourceNeighborId: mergeCandidateNeighborId.value,
    survivorNeighborId: profile.value.neighborId,
    irreversibleConfirmation: {
      acknowledged: true,
      phrase: mergeConfirmationInput.value,
    },
    reason: 'operator-initiated-merge',
  });
  isMergeSubmitting.value = false;

  if (!result.ok) {
    mergeRefusalState.value = {
      code: result.code,
      message: result.message,
    };
    mergeError.value = result.message;
    return;
  }

  isMergeModalOpen.value = false;
  mergeConfirmationInput.value = '';
  mergeError.value = '';
  mergeRefusalState.value = null;
  mergeSuccessMessage.value = 'Contact merge complete.';
  mergeAuditBeforeId.value = result.audit?.beforeNeighborId || result.merge.sourceNeighborId;
  mergeAuditAfterId.value = result.audit?.afterNeighborId || result.merge.survivorNeighborId;
};

watch(neighborId, async () => {
  await loadProfile();
}, { immediate: true });
</script>
