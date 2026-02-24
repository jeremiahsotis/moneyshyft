<template>
  <main class="min-h-screen bg-slate-50 px-4 py-8">
    <section class="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header class="mb-6">
        <h1 class="text-2xl font-semibold text-slate-900">
          Neighbor Profile
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          Changes here affect all orgUnits in this tenant immediately.
        </p>
      </header>

      <section
        class="mb-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
      >
        <p class="font-medium text-slate-900">Active scope</p>
        <p class="mt-1">Tenant: {{ scope?.tenantId || 'Resolving from server...' }}</p>
        <p>orgUnit: {{ scope?.orgUnitId || 'Resolving from server...' }}</p>
      </section>

      <section
        v-if="refusalState"
        data-testid="connectshyft-neighbor-profile-refusal-state"
        class="mb-6 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        <p class="font-medium">Unable to load neighbor profile</p>
        <p class="mt-1" data-testid="connectshyft-neighbor-profile-refusal-code">
          {{ refusalState.code }}
        </p>
        <p class="mt-1">{{ refusalState.message }}</p>
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
                Shared across tenant
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
            :disabled="isSubmitting"
            class="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Save Neighbor Profile
          </button>
        </div>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  fetchConnectShyftNeighborProfile,
  type ConnectShyftNeighbor,
  type ConnectShyftNeighborPhone,
  type ConnectShyftNeighborScope,
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
const phones = ref<ConnectShyftNeighborPhone[]>([]);
const refusalState = ref<{ code: string; message: string } | null>(null);

const phoneTestSuffix = (phone: ConnectShyftNeighborPhone): string => {
  const normalizedLabel = phone.label.trim().toLowerCase().replace(/\s+/g, '-');
  return normalizedLabel || String(phone.sortOrder || 0);
};

const hydrateProfileState = (neighbor: ConnectShyftNeighbor): void => {
  profile.value = neighbor;
  firstName.value = neighbor.firstName;
  lastName.value = neighbor.lastName;
  phones.value = neighbor.phones.map((phone) => ({ ...phone }));
};

const loadProfile = async (): Promise<void> => {
  validationError.value = '';
  successMessage.value = '';
  refusalState.value = null;

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
    return;
  }

  refusalState.value = null;
  if (result.scope) {
    scope.value = result.scope;
  }
  hydrateProfileState(result.neighbor);
  successMessage.value = 'Neighbor profile updated';
};

watch(neighborId, async () => {
  await loadProfile();
}, { immediate: true });
</script>
