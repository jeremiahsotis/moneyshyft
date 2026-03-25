<template>
  <main class="min-h-screen bg-slate-50 px-4 py-8 pb-32">
    <section
      data-testid="connectshyft-number-mapping-surface"
      class="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header class="mb-6">
        <h1 class="text-2xl font-semibold text-slate-900">
          Conversation Numbers
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          Manage the phone numbers this workspace uses for calls and messages.
        </p>
        <p
          data-testid="connectshyft-admin-settings-context-chip"
          class="mt-3 inline-flex rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700"
        >
          Workspace settings
        </p>
      </header>

      <form
        data-testid="connectshyft-number-mappings-form"
        class="mb-6 rounded-md border border-slate-200 p-4"
        @submit.prevent="handleSave"
      >
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Phone line
        </h2>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            Phone number
            <input
              data-testid="connectshyft-number-input"
              v-model="twilioNumberE164"
              type="text"
              autocomplete="off"
              placeholder="+12605550111"
              :disabled="isSaving || isInitializing"
              class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
          </label>
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            Label
            <input
              data-testid="connectshyft-number-label-input"
              v-model="label"
              type="text"
              autocomplete="off"
              placeholder="Main line"
              :disabled="isSaving || isInitializing"
              class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
          </label>
        </div>

        <p
          v-if="validationError"
          data-testid="connectshyft-number-validation-error"
          class="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {{ validationError }}
        </p>

        <div class="mt-4 flex items-center gap-3">
          <button
            type="submit"
            :disabled="isSaving || isInitializing"
            class="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Save phone number
          </button>
          <button
            v-if="editingMappingId"
            type="button"
            class="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
            @click="resetForm"
          >
            Cancel
          </button>
        </div>
      </form>

      <section class="rounded-md border border-slate-200 p-4">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Saved phone numbers
        </h2>

        <p v-if="mappings.length === 0" class="text-sm text-slate-600">
          No phone numbers are set up yet.
        </p>

        <ul v-else class="space-y-2">
          <li
            v-for="mapping in mappings"
            :key="mapping.mappingId"
            data-testid="connectshyft-number-mapping-row"
            class="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 px-3 py-2 text-sm text-slate-800"
          >
            <div class="space-y-1">
              <p class="font-medium">{{ mapping.twilioNumberE164 }}</p>
              <p class="text-slate-600">{{ mapping.label || 'No label yet' }}</p>
            </div>
            <button
              type="button"
              class="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700"
              @click="startEdit(mapping)"
            >
              Edit
            </button>
          </li>
        </ul>
      </section>
    </section>

  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  fetchConnectShyftNumberMappings,
  saveConnectShyftNumberMapping,
  type ConnectShyftNumberMapping,
} from '@/features/connectshyft/numbers';

const mappings = ref<ConnectShyftNumberMapping[]>([]);
const twilioNumberE164 = ref('');
const label = ref('');
const isInitializing = ref(true);
const isSaving = ref(false);
const editingMappingId = ref<string | null>(null);
const validationError = ref('');

const resetForm = (): void => {
  twilioNumberE164.value = '';
  label.value = '';
  editingMappingId.value = null;
};

const startEdit = (mapping: ConnectShyftNumberMapping): void => {
  editingMappingId.value = mapping.mappingId;
  twilioNumberE164.value = mapping.twilioNumberE164;
  label.value = mapping.label;
  validationError.value = '';
};

const handleSave = async (): Promise<void> => {
  if (isInitializing.value) {
    return;
  }

  validationError.value = '';
  isSaving.value = true;
  const result = await saveConnectShyftNumberMapping({
    mappingId: editingMappingId.value || undefined,
    twilioNumberE164: twilioNumberE164.value,
    label: label.value,
    isActive: true,
  });
  isSaving.value = false;

  if (!result.ok) {
    validationError.value = result.message;
    return;
  }

  mappings.value = result.mappings;
  resetForm();
};

onMounted(async () => {
  try {
    mappings.value = await fetchConnectShyftNumberMappings();
  } finally {
    isInitializing.value = false;
  }
});
</script>
