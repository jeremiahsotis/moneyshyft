<template>
  <main class="min-h-screen bg-slate-50 px-4 py-8">
    <section
      data-testid="connectshyft-add-neighbor-surface"
      class="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header class="mb-6">
        <h1 class="text-2xl font-semibold text-slate-900">
          Create Neighbor
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          Create a tenant-scoped neighbor record with conversation-first intake details.
        </p>
      </header>

      <p
        v-if="layoutTestId"
        :data-testid="layoutTestId"
        class="mb-4 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
      >
        {{ layoutLabel }}
      </p>

      <section
        data-testid="connectshyft-add-neighbor-context-panel"
        class="mb-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
      >
        <p class="font-medium text-slate-900">Active scope</p>
        <p class="mt-1">Tenant: {{ scope?.tenantId || 'Resolving from server...' }}</p>
        <p>orgUnit: {{ scope?.orgUnitId || 'Resolving from server...' }}</p>
      </section>

      <form class="rounded-md border border-slate-200 p-4" novalidate @submit.prevent="handleCreate">
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

        <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div data-testid="connectshyft-neighbor-primary-phone-input">
            <label class="flex flex-col gap-1 text-sm text-slate-700">
              Primary phone
              <input
                data-testid="connectshyft-neighbor-phone-input"
                v-model="primaryPhoneValue"
                type="text"
                autocomplete="off"
                placeholder="+1 (260) 555-0199"
                :disabled="isSubmitting"
                class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
            </label>
          </div>

          <label class="flex flex-col gap-1 text-sm text-slate-700">
            Additional phone
            <input
              data-testid="connectshyft-neighbor-additional-phone-input"
              v-model="additionalPhoneValue"
              type="text"
              autocomplete="off"
              placeholder="+1 (260) 555-0120"
              :disabled="isSubmitting"
              class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
          </label>
        </div>

        <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            Phone label
            <select
              data-testid="connectshyft-neighbor-phone-label-select"
              v-model="phoneLabel"
              :disabled="isSubmitting"
              class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="mobile">mobile</option>
              <option value="home">home</option>
              <option value="work">work</option>
              <option value="other">other</option>
            </select>
          </label>

          <label class="flex flex-col gap-1 text-sm text-slate-700">
            Email
            <input
              data-testid="connectshyft-neighbor-email-input"
              v-model="email"
              type="email"
              autocomplete="off"
              :disabled="isSubmitting"
              class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
          </label>
        </div>

        <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            Address line 1
            <input
              data-testid="connectshyft-neighbor-address-line1-input"
              v-model="addressLine1"
              type="text"
              autocomplete="off"
              :disabled="isSubmitting"
              class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
          </label>

          <label class="flex flex-col gap-1 text-sm text-slate-700">
            City
            <input
              data-testid="connectshyft-neighbor-address-city-input"
              v-model="addressCity"
              type="text"
              autocomplete="off"
              :disabled="isSubmitting"
              class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
          </label>
        </div>

        <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            State
            <input
              data-testid="connectshyft-neighbor-address-state-input"
              v-model="addressState"
              type="text"
              autocomplete="off"
              :disabled="isSubmitting"
              class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
          </label>

          <label class="flex flex-col gap-1 text-sm text-slate-700">
            Postal code
            <input
              data-testid="connectshyft-neighbor-address-postal-input"
              v-model="addressPostalCode"
              type="text"
              autocomplete="off"
              :disabled="isSubmitting"
              class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
          </label>
        </div>

        <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            Prefers texting
            <select
              data-testid="connectshyft-neighbor-prefers-texting-toggle"
              v-model="prefersTexting"
              :disabled="isSubmitting"
              class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="YES">Yes</option>
              <option value="NO">No</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </label>

          <label class="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input
              data-testid="connectshyft-neighbor-shared-phone-toggle"
              v-model="additionalPhoneShared"
              type="checkbox"
              :disabled="isSubmitting"
            >
            Additional phone is shared
          </label>
        </div>

        <label class="mt-3 flex flex-col gap-1 text-sm text-slate-700">
          Notes
          <textarea
            data-testid="connectshyft-neighbor-notes-textarea"
            v-model="notes"
            rows="3"
            :disabled="isSubmitting"
            class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <p
          v-if="validationError"
          data-testid="connectshyft-neighbor-validation-error"
          class="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {{ validationError }}
        </p>

        <p
          v-if="successMessage"
          data-testid="connectshyft-neighbor-create-success"
          class="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
        >
          {{ successMessage }}
        </p>

        <p
          v-if="createdNeighbor?.phones?.[0]?.value"
          data-testid="connectshyft-neighbor-phone-value"
          class="mt-2 text-sm text-slate-700"
        >
          {{ createdNeighbor.phones[0].value }}
        </p>

        <div class="mt-4">
          <button
            type="submit"
            data-testid="connectshyft-neighbor-submit-action"
            :disabled="isSubmitting"
            class="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Create Neighbor
          </button>
        </div>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  createConnectShyftNeighbor,
  fetchConnectShyftNeighborScope,
  type ConnectShyftNeighborScope,
  type ConnectShyftNeighbor,
  type ConnectShyftTextingPreference,
} from '@/features/connectshyft/neighbors';
import { CONNECTSHYFT_RESPONSIVE_BREAKPOINTS } from '@/features/connectshyft/uiContracts';

const firstName = ref('');
const lastName = ref('');
const primaryPhoneValue = ref('');
const additionalPhoneValue = ref('');
const phoneLabel = ref('mobile');
const email = ref('');
const addressLine1 = ref('');
const addressCity = ref('');
const addressState = ref('');
const addressPostalCode = ref('');
const prefersTexting = ref<ConnectShyftTextingPreference>('YES');
const additionalPhoneShared = ref(false);
const notes = ref('');
const isSubmitting = ref(false);
const validationError = ref('');
const successMessage = ref('');
const createdNeighbor = ref<ConnectShyftNeighbor | null>(null);
const scope = ref<ConnectShyftNeighborScope | null>(null);
const viewportWidth = ref<number>(typeof window === 'undefined' ? 1280 : window.innerWidth);

const updateViewportWidth = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  viewportWidth.value = window.innerWidth;
};

onMounted(async () => {
  scope.value = await fetchConnectShyftNeighborScope();

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateViewportWidth);
  }
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportWidth);
  }
});

const layoutTestId = computed(() => {
  if (viewportWidth.value <= CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.mobile) {
    return 'connectshyft-add-neighbor-layout-mobile';
  }

  if (viewportWidth.value <= CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.tablet) {
    return 'connectshyft-add-neighbor-layout-tablet';
  }

  return '';
});

const layoutLabel = computed(() => {
  if (layoutTestId.value === 'connectshyft-add-neighbor-layout-mobile') {
    return 'Mobile add-neighbor layout active';
  }

  if (layoutTestId.value === 'connectshyft-add-neighbor-layout-tablet') {
    return 'Tablet add-neighbor layout active';
  }

  return '';
});

const handleCreate = async (): Promise<void> => {
  validationError.value = '';
  successMessage.value = '';

  if (primaryPhoneValue.value.trim().length === 0) {
    validationError.value = 'Provide at least one phone to create or update a neighbor.';
    createdNeighbor.value = null;
    return;
  }

  isSubmitting.value = true;
  const result = await createConnectShyftNeighbor({
    firstName: firstName.value,
    lastName: lastName.value,
    prefersTexting: prefersTexting.value,
    phones: [
      {
        label: phoneLabel.value,
        value: primaryPhoneValue.value,
      },
      ...(additionalPhoneValue.value.trim().length > 0
        ? [
          {
            label: 'other',
            value: additionalPhoneValue.value,
            isShared: additionalPhoneShared.value,
          },
        ]
        : []),
    ],
  });
  isSubmitting.value = false;

  if (!result.ok) {
    validationError.value = result.message;
    if (result.scope) {
      scope.value = result.scope;
    }
    createdNeighbor.value = null;
    return;
  }

  if (result.scope) {
    scope.value = result.scope;
  } else {
    scope.value = {
      tenantId: result.neighbor.tenantId,
      orgUnitId: result.neighbor.orgUnitId,
    };
  }
  createdNeighbor.value = result.neighbor;
  successMessage.value = 'Neighbor created';
};
</script>
