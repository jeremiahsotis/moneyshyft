<template>
  <main class="min-h-screen bg-slate-50 px-4 py-8">
    <section class="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header class="mb-6">
        <h1 v-if="showUnavailableState" class="text-2xl font-semibold text-slate-900">
          ConnectShyft unavailable
        </h1>
        <h1 v-else class="text-2xl font-semibold text-slate-900">
          ConnectShyft Thread Detail
        </h1>

        <p
          v-if="showUnavailableState"
          class="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {{ unavailableMessage }}
        </p>
      </header>

      <section
        v-if="!showUnavailableState"
        data-testid="connectshyft-thread-detail"
        class="rounded-md border border-slate-200 p-4"
      >
        <p
          v-if="detailLoadError"
          class="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {{ detailLoadError }}
        </p>

        <template v-else-if="threadDetail">
          <p class="text-sm font-medium text-slate-900">
            {{ threadDetail.summary || threadDetail.threadId }}
          </p>
          <p class="mt-1 text-xs text-slate-600">
            State: {{ threadDetail.state }}
          </p>
          <p
            data-testid="connectshyft-thread-metadata-last-inbound-number"
            class="mt-3 text-sm text-slate-700"
          >
            Last inbound number: {{ threadDetail.lastInboundCsNumberId }}
          </p>
          <p
            data-testid="connectshyft-thread-metadata-preferred-outbound-number"
            class="mt-1 text-sm text-slate-700"
          >
            Preferred outbound number: {{ threadDetail.preferredOutboundCsNumberId }}
            <span v-if="threadDetail.preferredOutboundContext.label">
              · {{ threadDetail.preferredOutboundContext.label }}
            </span>
          </p>

          <div class="mt-4 flex flex-wrap gap-2">
            <button
              v-for="action in threadDetail.actions"
              :key="action"
              type="button"
              class="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
            >
              {{ action }}
            </button>
          </div>
        </template>

        <p v-else class="text-sm text-slate-600">Loading thread detail...</p>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  DEFAULT_CONNECTSHYFT_AVAILABILITY,
  fetchConnectShyftAvailability,
} from '@/features/connectshyft/flags';
import {
  fetchConnectShyftThreadDetail,
  type ConnectShyftThreadDetail,
} from '@/features/connectshyft/readContracts';

const route = useRoute();
const availability = ref({ ...DEFAULT_CONNECTSHYFT_AVAILABILITY });
const threadDetail = ref<ConnectShyftThreadDetail | null>(null);
const detailLoadError = ref('');

const threadId = computed(() => {
  const rawValue = route.params.threadId;
  return typeof rawValue === 'string' ? rawValue.trim() : '';
});

const moduleAvailable = computed(() => availability.value.capabilities.module);
const inboxAvailable = computed(() => availability.value.capabilities.inbox);
const showUnavailableState = computed(() => !moduleAvailable.value || !inboxAvailable.value);

const unavailableMessage = computed(() => {
  if (availability.value.refusal?.message) {
    return availability.value.refusal.message;
  }

  if (!moduleAvailable.value) {
    return 'ConnectShyft is currently unavailable for this tenant. Enable connectshyft_enabled to access this module.';
  }

  return 'ConnectShyft inbox is currently unavailable for this tenant.';
});

const refreshThreadDetail = async () => {
  availability.value = await fetchConnectShyftAvailability();
  if (showUnavailableState.value) {
    threadDetail.value = null;
    detailLoadError.value = '';
    return;
  }

  const detailResult = await fetchConnectShyftThreadDetail(threadId.value);
  if (!detailResult.ok) {
    threadDetail.value = null;
    detailLoadError.value = detailResult.message;
    return;
  }

  threadDetail.value = detailResult.thread;
  detailLoadError.value = '';
};

onMounted(() => {
  void refreshThreadDetail();
});

watch(
  () => route.fullPath,
  () => {
    void refreshThreadDetail();
  },
);
</script>
