<template>
  <main class="mx-auto max-w-5xl px-4 py-8">
    <header class="mb-6">
      <h1 class="text-3xl font-semibold text-slate-900">Request Lifecycle</h1>
      <p class="mt-2 text-sm text-slate-600">
        Reconcile unresolved requests and enforce deterministic terminal outcomes.
      </p>
    </header>

    <section class="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Terminal Status</p>
      <p data-testid="routeshyft-request-terminal-status" class="mt-2 text-lg font-medium text-slate-900">
        {{ terminalStatusLabel }}
      </p>

      <div class="mt-4" data-testid="routeshyft-request-reconciliation-actions">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Reconciliation Actions</p>
        <ul v-if="reconciliationActions.length > 0" class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li v-for="action in reconciliationActions" :key="action">
            {{ action }}
          </li>
        </ul>
        <p v-else class="mt-2 text-sm text-slate-600">
          No unresolved reconciliation actions at this time.
        </p>
      </div>
    </section>

    <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <button
        type="button"
        class="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
        data-testid="routeshyft-request-finalize-submit"
        :disabled="submitting"
        @click="submitFinalizeRequest"
      >
        {{ submitting ? 'Finalizing...' : 'Finalize Request' }}
      </button>

      <p class="mt-4 text-sm font-medium text-slate-800" data-testid="routeshyft-request-refusal-banner">
        {{ refusalBanner }}
      </p>

      <p class="mt-2 text-sm text-slate-700" data-testid="routeshyft-request-refusal-code">
        {{ refusalCode }}
      </p>

      <pre
        class="mt-4 max-h-72 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700"
        data-testid="routeshyft-request-lifecycle-details"
      >{{ lifecycleDetails }}</pre>
    </section>
  </main>
</template>

<script setup lang="ts">
import api from '@/services/api';
import { computed, onMounted, ref } from 'vue';

type ReconciliationItem = {
  requestLifecycleStatus?: string;
  reconciliationActions?: string[];
};

const submitting = ref(false);
const terminalStatus = ref('unknown');
const reconciliationActions = ref<string[]>([]);
const refusalBanner = ref('No finalize action submitted yet.');
const refusalCode = ref('ROUTE_FINALIZE_NOT_SUBMITTED');
const lifecycleDetails = ref('{}');

const terminalStatusLabel = computed(() => {
  if (terminalStatus.value === 'unknown') {
    return 'Awaiting reconciliation data';
  }

  if (terminalStatus.value === 'clear') {
    return 'All requests are terminalized';
  }

  return terminalStatus.value;
});

const setLifecycleDetails = (value: unknown): void => {
  lifecycleDetails.value = JSON.stringify(value ?? {}, null, 2);
};

const loadReconciliationQueue = async (): Promise<void> => {
  try {
    const response = await api.get('/route/intake/reconciliation/unresolved', {
      params: { staleMinutes: 60 },
    });
    const body = response.data;
    const items = Array.isArray(body?.data?.items) ? body.data.items as ReconciliationItem[] : [];
    const firstItem = items[0];

    terminalStatus.value = firstItem?.requestLifecycleStatus || body?.data?.guardrailStatus || 'clear';
    reconciliationActions.value = Array.isArray(firstItem?.reconciliationActions)
      ? firstItem?.reconciliationActions
      : [];
    setLifecycleDetails(body?.data || {});
  } catch (error: unknown) {
    terminalStatus.value = 'unavailable';
    reconciliationActions.value = ['Reconciliation queue request failed. Retry after verifying tenant scope.'];
    const err = error as { response?: { data?: unknown } };
    setLifecycleDetails(err.response?.data || { error: String(error) });
  }
};

const submitFinalizeRequest = async (): Promise<void> => {
  submitting.value = true;
  try {
    const response = await api.post('/route/intake/requests', {
      requestedAtUtc: '2026-02-26T14:00:00.000Z',
      requestedWindowStartUtc: '2026-02-27T02:00:00.000Z',
      requestedWindowEndUtc: '2026-02-27T02:30:00.000Z',
      channel: '2-4-request-to-commitment-linkage-and-terminal-enforcement',
      notes: 'Route lifecycle finalize action',
      forceRefusal: true,
      scheduleMode: 'pickup',
    });

    const body = response.data;
    refusalCode.value = String(body?.code || 'ROUTE_FINALIZE_UNKNOWN');
    refusalBanner.value = body?.ok === false
      ? 'Finalize request produced explicit refusal outcome.'
      : 'Finalize request produced explicit acceptance outcome.';
    setLifecycleDetails(body?.data || body);
  } catch (error: unknown) {
    const err = error as { response?: { data?: { code?: string } } };
    refusalCode.value = String(err.response?.data?.code || 'ROUTE_FINALIZE_REQUEST_FAILED');
    refusalBanner.value = 'Finalize request failed; see lifecycle details.';
    setLifecycleDetails(err.response?.data || { error: String(error) });
  } finally {
    submitting.value = false;
    await loadReconciliationQueue();
  }
};

onMounted(async () => {
  await loadReconciliationQueue();
});
</script>
