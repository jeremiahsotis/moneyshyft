<template>
  <main class="min-h-screen bg-slate-50 px-4 py-8">
    <section class="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header class="mb-6">
        <h1 v-if="showUnavailableState" class="text-2xl font-semibold text-slate-900">
          ConnectShyft unavailable
        </h1>
        <h1 v-else class="text-2xl font-semibold text-slate-900">
          ConnectShyft Inbox
        </h1>

        <p
          v-if="showUnavailableState"
          data-testid="connectshyft-unavailable-state"
          class="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {{ unavailableMessage }}
        </p>
      </header>

      <section class="mb-6 rounded-md border border-slate-200 p-4">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Capability Status
        </h2>
        <dl class="grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-3">
          <div class="rounded border border-slate-200 p-3">
            <dt>Inbox</dt>
            <dd
              data-testid="connectshyft-capability-inbox"
              class="mt-1 font-medium"
            >
              {{ inboxAvailable ? 'Available' : 'Unavailable' }}
            </dd>
          </div>
          <div class="rounded border border-slate-200 p-3">
            <dt>Escalation</dt>
            <dd
              data-testid="connectshyft-capability-escalation"
              class="mt-1 font-medium"
            >
              {{ escalationAvailable ? 'Available' : 'Unavailable' }}
            </dd>
          </div>
          <div class="rounded border border-slate-200 p-3">
            <dt>Webhooks</dt>
            <dd
              data-testid="connectshyft-capability-webhooks"
              class="mt-1 font-medium"
            >
              {{ webhooksAvailable ? 'Available' : 'Unavailable' }}
            </dd>
          </div>
        </dl>
      </section>

      <p
        v-if="maintenanceBanner"
        data-testid="connectshyft-capability-maintenance-banner"
        class="mb-6 rounded-md border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700"
      >
        {{ maintenanceBanner }}
      </p>

      <section
        v-if="inboxAvailable"
        data-testid="connectshyft-inbox-list"
        class="rounded-md border border-slate-200 p-4"
      >
        <h2 class="mb-3 text-base font-semibold text-slate-900">Open threads</h2>

        <p
          v-if="threadLoadError"
          class="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {{ threadLoadError }}
        </p>

        <p
          v-if="threadActionError"
          class="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {{ threadActionError }}
        </p>

        <ul v-if="dueThreads.length > 0" class="mb-4 space-y-2 text-sm text-slate-700">
          <li
            v-for="thread in dueThreads"
            :key="thread.threadId"
            data-testid="connectshyft-thread-card"
            class="rounded border border-slate-200 px-3 py-2"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="font-medium text-slate-900">
                {{ thread.threadId }}
              </p>
              <span
                data-testid="connectshyft-thread-state-chip"
                class="rounded bg-slate-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700"
              >
                {{ thread.state }}
              </span>
            </div>
            <p
              data-testid="connectshyft-thread-last-inbound-number"
              class="mt-2 text-xs text-slate-600"
            >
              Last inbound number: {{ thread.lastInboundCsNumberId || 'n/a' }}
            </p>
            <p
              data-testid="connectshyft-thread-preferred-outbound-number"
              class="mt-1 text-xs text-slate-600"
            >
              Preferred outbound number: {{ thread.preferredOutboundCsNumberId || 'n/a' }}
            </p>
          </li>
        </ul>

        <p
          v-else-if="!threadLoadError"
          class="mb-4 rounded border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600"
        >
          No open threads yet.
        </p>

        <section class="mb-4 rounded border border-slate-200 bg-slate-50 p-3">
          <h3 class="text-sm font-semibold text-slate-900">Shared identity context</h3>
          <p class="mt-1 text-xs text-slate-600">
            Shared-phone indicators remain consistent across orgUnits in this tenant.
          </p>

          <p
            v-if="neighborLoadError"
            class="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          >
            {{ neighborLoadError }}
          </p>

          <ul v-else class="mt-3 space-y-2 text-xs text-slate-700">
            <li
              v-for="neighbor in neighbors"
              :key="neighbor.neighborId"
              class="rounded border border-slate-200 bg-white px-3 py-2"
            >
              <p class="font-medium text-slate-900">
                {{ neighbor.firstName || 'Neighbor' }} {{ neighbor.lastName }}
              </p>
              <div class="mt-1 flex flex-wrap gap-2">
                <span
                  v-for="phone in neighbor.phones"
                  :key="`${neighbor.neighborId}-${phone.phoneId}`"
                  data-testid="connectshyft-inbox-shared-phone-indicator"
                  class="rounded px-2 py-1 text-[11px] font-medium"
                  :class="phone.isShared ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'"
                >
                  {{ phone.label }} · {{ phone.isShared ? 'Shared' : 'Not shared' }}
                </span>
              </div>
            </li>
          </ul>
        </section>

        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            :disabled="openingConversation"
            @click="openConversation"
            class="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {{ openingConversation ? 'Opening...' : 'Open Conversation' }}
          </button>
          <button
            type="button"
            class="rounded bg-slate-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Compose message
          </button>
          <button
            type="button"
            :disabled="!escalationAvailable"
            class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Claim thread
          </button>
          <button
            type="button"
            :disabled="!escalationAvailable"
            class="rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Take over thread
          </button>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  DEFAULT_CONNECTSHYFT_AVAILABILITY,
  fetchConnectShyftAvailability,
} from '@/features/connectshyft/flags';
import {
  fetchConnectShyftNeighborsCollection,
  type ConnectShyftNeighbor,
} from '@/features/connectshyft/neighbors';
import {
  ensureConnectShyftThread,
  fetchConnectShyftDueThreads,
  type ConnectShyftThread,
} from '@/features/connectshyft/threads';

const DEFAULT_THREAD_NEIGHBOR_ID = 'neighbor-connectshyft-c1-1001';
const DEFAULT_THREAD_INBOUND_NUMBER_ID = 'cs-inbound-c1-001';
const DEFAULT_THREAD_OUTBOUND_NUMBER_ID = 'cs-outbound-c1-001';

const availability = ref({ ...DEFAULT_CONNECTSHYFT_AVAILABILITY });
const neighbors = ref<ConnectShyftNeighbor[]>([]);
const dueThreads = ref<ConnectShyftThread[]>([]);
const neighborLoadError = ref('');
const threadLoadError = ref('');
const threadActionError = ref('');
const openingConversation = ref(false);

const normalizeQueryValue = (value: string | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const resolveInboxContext = (): {
  orgUnitId: string | null;
  neighborId: string;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
} => {
  if (typeof window === 'undefined') {
    return {
      orgUnitId: null,
      neighborId: DEFAULT_THREAD_NEIGHBOR_ID,
      lastInboundCsNumberId: DEFAULT_THREAD_INBOUND_NUMBER_ID,
      preferredOutboundCsNumberId: DEFAULT_THREAD_OUTBOUND_NUMBER_ID,
    };
  }

  const query = new URLSearchParams(window.location.search);
  const contextMode = normalizeQueryValue(query.get('context'));
  const orgUnitId = contextMode === 'missing-orgunit'
    ? null
    : normalizeQueryValue(query.get('orgUnitId'));

  return {
    orgUnitId,
    neighborId: normalizeQueryValue(query.get('neighborId')) || DEFAULT_THREAD_NEIGHBOR_ID,
    lastInboundCsNumberId: normalizeQueryValue(query.get('lastInboundCsNumberId'))
      || DEFAULT_THREAD_INBOUND_NUMBER_ID,
    preferredOutboundCsNumberId:
      normalizeQueryValue(query.get('preferredOutboundCsNumberId'))
      || DEFAULT_THREAD_OUTBOUND_NUMBER_ID,
  };
};

const loadNeighbors = async (): Promise<void> => {
  const listResult = await fetchConnectShyftNeighborsCollection();
  if (!listResult.ok) {
    neighbors.value = [];
    neighborLoadError.value = listResult.message;
    return;
  }

  neighbors.value = listResult.neighbors;
  neighborLoadError.value = '';
};

const loadDueThreads = async (): Promise<void> => {
  const dueResult = await fetchConnectShyftDueThreads();
  if (!dueResult.ok) {
    dueThreads.value = [];
    threadLoadError.value = dueResult.message;
    return;
  }

  dueThreads.value = dueResult.threads;
  threadLoadError.value = '';
};

onMounted(async () => {
  availability.value = await fetchConnectShyftAvailability();
  if (!availability.value.capabilities.inbox) {
    neighbors.value = [];
    dueThreads.value = [];
    neighborLoadError.value = '';
    threadLoadError.value = '';
    threadActionError.value = '';
    return;
  }

  await Promise.all([
    loadNeighbors(),
    loadDueThreads(),
  ]);
});

const openConversation = async (): Promise<void> => {
  const context = resolveInboxContext();
  if (!context.orgUnitId) {
    threadActionError.value = 'orgUnitId is required to open a ConnectShyft conversation.';
    return;
  }

  openingConversation.value = true;
  threadActionError.value = '';

  const existingThread = dueThreads.value
    .find((thread) => thread.neighborId === context.neighborId)
    || dueThreads.value[0];
  try {
    const ensureResult = await ensureConnectShyftThread({
      orgUnitId: context.orgUnitId,
      neighborId: existingThread?.neighborId || context.neighborId,
      source: 'VOICE',
      lastInboundCsNumberId: existingThread?.lastInboundCsNumberId
        || context.lastInboundCsNumberId,
      preferredOutboundCsNumberId: existingThread?.preferredOutboundCsNumberId
        || context.preferredOutboundCsNumberId,
    });

    if (!ensureResult.ok) {
      threadActionError.value = ensureResult.message;
      return;
    }

    await loadDueThreads();
  } finally {
    openingConversation.value = false;
  }
};

const moduleAvailable = computed(() => availability.value.capabilities.module);
const inboxAvailable = computed(() => availability.value.capabilities.inbox);
const escalationAvailable = computed(() => availability.value.capabilities.escalation);
const webhooksAvailable = computed(() => availability.value.capabilities.webhooks);

const showUnavailableState = computed(() => !moduleAvailable.value || !inboxAvailable.value);

const unavailableMessage = computed(() => {
  if (availability.value.refusal?.message) {
    return availability.value.refusal.message;
  }

  if (!moduleAvailable.value) {
    if (availability.value.entitlement && availability.value.entitlement.enabled === false) {
      return 'ConnectShyft module entitlement is disabled for this tenant.';
    }

    return 'ConnectShyft is currently unavailable for this tenant. Enable connectshyft_enabled to access this module.';
  }

  return 'ConnectShyft inbox is currently unavailable for this tenant.';
});

const maintenanceBanner = computed(() => {
  if (!moduleAvailable.value || !inboxAvailable.value) {
    return '';
  }

  if (!escalationAvailable.value) {
    return 'Escalation controls are temporarily unavailable for this tenant.';
  }

  return '';
});
</script>
