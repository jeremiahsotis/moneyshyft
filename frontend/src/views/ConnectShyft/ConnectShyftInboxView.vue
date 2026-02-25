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
        <h2 class="mb-3 text-base font-semibold text-slate-900">
          {{ bucketTitle }} threads
        </h2>

        <p
          v-if="threadLoadError"
          data-testid="connectshyft-inbox-load-error"
          class="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {{ threadLoadError }}
        </p>

        <ul v-else-if="threadItems.length > 0" class="mb-4 space-y-2 text-sm text-slate-700">
          <li
            v-for="item in threadItems"
            :key="item.threadId"
            class="rounded border border-slate-200 px-3 py-2"
            :data-testid="`connectshyft-thread-card-${item.threadId}`"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="font-medium text-slate-900">
                  {{ item.summary || item.threadId }}
                </p>
                <p v-if="item.urgencyLabel" class="mt-1 text-xs font-medium text-amber-800">
                  {{ item.urgencyLabel }}
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <span
                  data-testid="connectshyft-inbox-item-priority-rank"
                  class="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
                >
                  {{ item.priorityRank }}
                </span>
                <span
                  v-if="item.voicemailIndicator"
                  :data-testid="`connectshyft-voicemail-indicator-${item.threadId}`"
                  class="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700"
                >
                  Voicemail
                </span>
                <RouterLink
                  :to="buildThreadDetailPath(item.threadId)"
                  class="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white"
                >
                  Open
                </RouterLink>
              </div>
            </div>
          </li>
        </ul>

        <p v-else class="mb-4 text-sm text-slate-600">
          No threads are currently available in this bucket.
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
            class="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Compose message
          </button>
          <button
            type="button"
            :disabled="!canClaimThread"
            class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Claim thread
          </button>
          <button
            type="button"
            :disabled="!canTakeoverThread"
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
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  DEFAULT_CONNECTSHYFT_AVAILABILITY,
  fetchConnectShyftAvailability,
} from '@/features/connectshyft/flags';
import {
  fetchConnectShyftNeighborsCollection,
  type ConnectShyftNeighbor,
} from '@/features/connectshyft/neighbors';
import {
  fetchConnectShyftThreadBucket,
  type ConnectShyftInboxActions,
  type ConnectShyftThreadSummary,
} from '@/features/connectshyft/readContracts';

const route = useRoute();
const availability = ref({ ...DEFAULT_CONNECTSHYFT_AVAILABILITY });
const neighbors = ref<ConnectShyftNeighbor[]>([]);
const threadItems = ref<ConnectShyftThreadSummary[]>([]);
const threadActions = ref<ConnectShyftInboxActions>({
  claim: false,
  takeover: false,
});
const neighborLoadError = ref('');
const threadLoadError = ref('');

const bucket = computed<'inbox' | 'mine'>(() => {
  return route.path.includes('/app/connectshyft/mine') ? 'mine' : 'inbox';
});

const bucketTitle = computed(() => (bucket.value === 'mine' ? 'Mine' : 'Inbox'));

const loadThreadContracts = async () => {
  if (!availability.value.capabilities.inbox) {
    threadItems.value = [];
    threadActions.value = {
      claim: false,
      takeover: false,
    };
    threadLoadError.value = '';
    return;
  }

  const readResult = await fetchConnectShyftThreadBucket(bucket.value);
  if (!readResult.ok) {
    threadItems.value = [];
    threadActions.value = {
      claim: false,
      takeover: false,
    };
    threadLoadError.value = readResult.message;
    return;
  }

  threadItems.value = readResult.items;
  threadActions.value = readResult.actions;
  threadLoadError.value = '';
};

const loadNeighbors = async () => {
  if (!availability.value.capabilities.inbox) {
    neighbors.value = [];
    neighborLoadError.value = '';
    return;
  }

  const listResult = await fetchConnectShyftNeighborsCollection();
  if (!listResult.ok) {
    neighbors.value = [];
    neighborLoadError.value = listResult.message;
    return;
  }

  neighbors.value = listResult.neighbors;
  neighborLoadError.value = '';
};

const refreshInboxSurface = async () => {
  availability.value = await fetchConnectShyftAvailability();
  await Promise.all([
    loadThreadContracts(),
    loadNeighbors(),
  ]);
};

onMounted(() => {
  void refreshInboxSurface();
});

watch(
  () => route.fullPath,
  () => {
    void refreshInboxSurface();
  },
);

const moduleAvailable = computed(() => availability.value.capabilities.module);
const inboxAvailable = computed(() => availability.value.capabilities.inbox);
const escalationAvailable = computed(() => availability.value.capabilities.escalation);
const webhooksAvailable = computed(() => availability.value.capabilities.webhooks);
const canClaimThread = computed(() => escalationAvailable.value && threadActions.value.claim);
const canTakeoverThread = computed(() => escalationAvailable.value && threadActions.value.takeover);

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

const buildThreadDetailPath = (threadId: string): string => {
  if (typeof window === 'undefined') {
    return `/app/connectshyft/threads/${encodeURIComponent(threadId)}`;
  }

  const currentQuery = new URLSearchParams(window.location.search);
  const queryString = currentQuery.toString();
  const basePath = `/app/connectshyft/threads/${encodeURIComponent(threadId)}`;

  return queryString.length > 0
    ? `${basePath}?${queryString}`
    : basePath;
};
</script>
