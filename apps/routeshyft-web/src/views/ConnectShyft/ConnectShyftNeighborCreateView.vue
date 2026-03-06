<template>
  <main class="min-h-screen bg-slate-50 px-4 py-8">
    <section class="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header class="mb-6">
        <h1 class="text-2xl font-semibold text-slate-900">
          Create Neighbor
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          Create a tenant-scoped neighbor record with at least one phone value.
        </p>
      </header>

      <section class="mb-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
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
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            Phone value
            <input
              data-testid="connectshyft-neighbor-phone-input"
              v-model="phoneValue"
              type="text"
              autocomplete="off"
              placeholder="+1 (260) 555-0199"
              :disabled="isSubmitting"
              class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
          </label>

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
        </div>

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
import { onMounted, ref } from 'vue';
import {
  createConnectShyftNeighbor,
  fetchConnectShyftNeighborScope,
  type ConnectShyftNeighborScope,
  type ConnectShyftNeighbor,
} from '@/features/connectshyft/neighbors';

const firstName = ref('');
const lastName = ref('');
const phoneValue = ref('');
const phoneLabel = ref('mobile');
const isSubmitting = ref(false);
const validationError = ref('');
const successMessage = ref('');
const createdNeighbor = ref<ConnectShyftNeighbor | null>(null);
const scope = ref<ConnectShyftNeighborScope | null>(null);

onMounted(async () => {
  scope.value = await fetchConnectShyftNeighborScope();
});

const handleCreate = async (): Promise<void> => {
  validationError.value = '';
  successMessage.value = '';

  if (phoneValue.value.trim().length === 0) {
    validationError.value = 'Provide at least one phone to create a neighbor.';
    createdNeighbor.value = null;
    return;
  }

  isSubmitting.value = true;
  const result = await createConnectShyftNeighbor({
    firstName: firstName.value,
    lastName: lastName.value,
    phones: [
      {
        label: phoneLabel.value,
        value: phoneValue.value,
      },
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
