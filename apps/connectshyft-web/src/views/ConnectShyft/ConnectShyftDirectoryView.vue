<template>
  <main class="min-h-screen bg-slate-50 px-4 py-8">
    <section
      data-testid="connectshyft-directory-surface"
      class="mx-auto max-w-5xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header class="mb-6">
        <h1 class="text-2xl font-semibold text-slate-900">
          Neighbor Directory
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          Find people by name or phone and start the right conversation quickly.
        </p>
      </header>

      <p
        v-if="layoutMarkerTestId"
        :data-testid="layoutMarkerTestId"
        class="mb-4 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
      >
        {{ layoutMarkerCopy }}
      </p>

      <section
        data-testid="connectshyft-directory-context-panel"
        class="mb-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
      >
        <p class="font-medium text-slate-900">Active conference scope</p>
        <p class="mt-1">Tenant context: {{ scope ? 'Resolved' : 'Resolving from server...' }}</p>
        <p>Conference context: {{ activeOrgUnitId ? 'Active' : 'Resolving from server...' }}</p>
      </section>

      <section class="rounded-md border border-slate-200 p-4">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-[auto_1fr] md:items-end">
          <div class="inline-flex rounded border border-slate-300 p-1 text-sm text-slate-700">
            <button
              type="button"
              data-testid="connectshyft-directory-search-mode-name"
              class="min-h-[44px] rounded px-3 py-2"
              :class="searchMode === 'name' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'"
              :disabled="isLoading"
              @click="searchMode = 'name'"
            >
              Name
            </button>
            <button
              type="button"
              data-testid="connectshyft-directory-search-mode-phone"
              class="min-h-[44px] rounded px-3 py-2"
              :class="searchMode === 'phone' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'"
              :disabled="isLoading"
              @click="searchMode = 'phone'"
            >
              Phone
            </button>
          </div>

          <label class="flex flex-col gap-1 text-sm text-slate-700">
            <span>Search</span>
            <input
              data-testid="connectshyft-directory-search-input"
              v-model="searchQuery"
              type="text"
              autocomplete="off"
              :placeholder="searchMode === 'name' ? 'Search by first or last name' : 'Search by phone number'"
              :disabled="isLoading"
              class="min-h-[44px] rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
          </label>
        </div>

        <p
          v-if="loadError"
          class="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {{ loadError }}
        </p>

        <ul class="mt-4 space-y-3">
          <li
            v-for="neighbor in visibleNeighbors"
            :key="neighbor.neighborId"
            data-testid="connectshyft-directory-result-card"
            class="rounded border border-slate-200 bg-white p-3"
          >
            <div
              :data-testid="`connectshyft-directory-result-card-${neighbor.neighborId}`"
              class="flex flex-wrap items-start justify-between gap-3"
            >
              <div>
                <p class="text-base font-semibold text-slate-900">
                  {{ formatNeighborName(neighbor) }}
                </p>
                <p class="mt-1 text-sm text-slate-600">
                  {{ firstPhoneLabel(neighbor) }}
                </p>
                <p
                  data-testid="connectshyft-directory-result-conference-chip"
                  class="mt-2 inline-flex rounded-full border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700"
                >
                  Conference scoped
                </p>
              </div>

              <button
                type="button"
                data-testid="connectshyft-directory-start-conversation-action"
                class="min-h-[44px] rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                :disabled="isEnsuringThread"
                @click="startConversation(neighbor.neighborId)"
              >
                {{ isEnsuringThread ? 'Opening...' : 'Start Conversation' }}
              </button>
            </div>
          </li>
        </ul>

        <p
          v-if="!isLoading && !loadError && visibleNeighbors.length === 0"
          class="mt-4 text-sm text-slate-600"
        >
          No conference-scoped neighbors match your search.
        </p>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  fetchConnectShyftNeighborScope,
  fetchConnectShyftNeighborsCollection,
  type ConnectShyftNeighbor,
  type ConnectShyftNeighborScope,
} from '@/features/connectshyft/neighbors';
import { ensureConnectShyftThread } from '@/features/connectshyft/threads';
import {
  CONNECTSHYFT_RESPONSIVE_BREAKPOINTS,
  sanitizeConnectShyftOperatorCopy,
} from '@/features/connectshyft/uiContracts';
import { buildConnectThreadPath } from '@/shell/routes';

const DEFAULT_THREAD_INBOUND_NUMBER_ID = 'cs-number-default-inbound';
const DEFAULT_THREAD_OUTBOUND_NUMBER_ID = 'cs-number-default-outbound';
type ConnectShyftNeighborSearchMode = 'name' | 'phone';

const route = useRoute();
const router = useRouter();

const scope = ref<ConnectShyftNeighborScope | null>(null);
const allNeighbors = ref<ConnectShyftNeighbor[]>([]);
const isLoading = ref(false);
const isEnsuringThread = ref(false);
const loadError = ref('');
const searchMode = ref<ConnectShyftNeighborSearchMode>('name');
const searchQuery = ref('');
const viewportWidth = ref<number>(typeof window === 'undefined' ? 1280 : window.innerWidth);
let searchQueryReloadTimer: ReturnType<typeof setTimeout> | null = null;
let directoryLoadRequestId = 0;

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const normalizePhoneDigits = (value: string): string => {
  return value.replace(/\D/g, '');
};

const activeOrgUnitId = computed<string>(() => {
  return scope.value?.orgUnitId || '';
});

const scopedNeighbors = computed<ConnectShyftNeighbor[]>(() => {
  const orgUnitId = activeOrgUnitId.value;
  if (!orgUnitId) {
    return [];
  }

  return allNeighbors.value.filter((neighbor) => neighbor.orgUnitId === orgUnitId);
});

const visibleNeighbors = computed<ConnectShyftNeighbor[]>(() => {
  const query = normalizeString(searchQuery.value);
  if (!query) {
    return scopedNeighbors.value;
  }

  if (searchMode.value === 'phone') {
    const normalizedQuery = normalizePhoneDigits(query);
    if (!normalizedQuery) {
      return scopedNeighbors.value;
    }

    return scopedNeighbors.value.filter((neighbor) => {
      return neighbor.phones.some((phone) => {
        return normalizePhoneDigits(phone.value).includes(normalizedQuery);
      });
    });
  }

  const loweredQuery = query.toLowerCase();
  return scopedNeighbors.value.filter((neighbor) => {
    const fullName = `${neighbor.firstName} ${neighbor.lastName}`.toLowerCase();
    return fullName.includes(loweredQuery);
  });
});

const layoutMarkerTestId = computed<string | null>(() => {
  if (viewportWidth.value <= CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.mobile) {
    return 'connectshyft-directory-layout-mobile';
  }

  if (viewportWidth.value <= CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.tablet) {
    return 'connectshyft-directory-layout-tablet';
  }

  return null;
});

const layoutMarkerCopy = computed<string>(() => {
  if (layoutMarkerTestId.value === 'connectshyft-directory-layout-mobile') {
    return 'Mobile directory layout active';
  }

  if (layoutMarkerTestId.value === 'connectshyft-directory-layout-tablet') {
    return 'Tablet directory layout active';
  }

  return 'Desktop directory layout active';
});

const formatNeighborName = (neighbor: ConnectShyftNeighbor): string => {
  const first = normalizeString(neighbor.firstName);
  const last = normalizeString(neighbor.lastName);
  const full = `${first} ${last}`.trim();
  return full || 'Neighbor';
};

const firstPhoneLabel = (neighbor: ConnectShyftNeighbor): string => {
  const firstPhone = neighbor.phones[0];
  if (!firstPhone) {
    return 'No phone on file';
  }

  return `${firstPhone.label || 'phone'} · ${firstPhone.value}`;
};

const updateViewportWidth = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  viewportWidth.value = window.innerWidth;
};

const readDirectoryContext = (): {
  orgUnitId: string;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
} | null => {
  const orgUnitId = activeOrgUnitId.value;
  if (!orgUnitId) {
    return null;
  }

  const lastInboundCsNumberId = normalizeString(route.query.lastInboundCsNumberId)
    || DEFAULT_THREAD_INBOUND_NUMBER_ID;
  const preferredOutboundCsNumberId = normalizeString(route.query.preferredOutboundCsNumberId)
    || DEFAULT_THREAD_OUTBOUND_NUMBER_ID;

  return {
    orgUnitId,
    lastInboundCsNumberId,
    preferredOutboundCsNumberId,
  };
};

const loadDirectory = async (): Promise<void> => {
  const requestId = ++directoryLoadRequestId;
  isLoading.value = true;
  loadError.value = '';

  const resolvedScope = await fetchConnectShyftNeighborScope();
  if (requestId !== directoryLoadRequestId) {
    return;
  }
  scope.value = resolvedScope;

  const listResult = await fetchConnectShyftNeighborsCollection({
    mode: searchMode.value,
    query: searchQuery.value.trim(),
  });
  if (requestId !== directoryLoadRequestId) {
    return;
  }

  isLoading.value = false;

  if (!listResult.ok) {
    allNeighbors.value = [];
    loadError.value = sanitizeConnectShyftOperatorCopy(
      listResult.message,
      'Unable to load the directory right now.',
    );
    return;
  }

  allNeighbors.value = listResult.neighbors;
};

const scheduleDirectoryReload = (): void => {
  if (searchQueryReloadTimer) {
    clearTimeout(searchQueryReloadTimer);
  }

  searchQueryReloadTimer = setTimeout(() => {
    void loadDirectory();
  }, 250);
};

const startConversation = async (neighborId: string): Promise<void> => {
  const context = readDirectoryContext();
  if (!context) {
    loadError.value = 'Select an orgUnit before starting a conversation.';
    return;
  }

  isEnsuringThread.value = true;
  loadError.value = '';

  const ensureResult = await ensureConnectShyftThread({
    orgUnitId: context.orgUnitId,
    neighborId,
    source: 'DIRECTORY',
    lastInboundCsNumberId: context.lastInboundCsNumberId,
    preferredOutboundCsNumberId: context.preferredOutboundCsNumberId,
  });

  isEnsuringThread.value = false;

  if (!ensureResult.ok) {
    loadError.value = sanitizeConnectShyftOperatorCopy(
      ensureResult.message,
      'Unable to open a conversation right now.',
    );
    return;
  }

  const nextQuery = {
    ...route.query,
    directoryNotice: ensureResult.createdNewThread ? 'new' : 'existing',
  };

  await router.push({
    path: buildConnectThreadPath(ensureResult.thread.threadId),
    query: nextQuery,
  });
};

onMounted(() => {
  void loadDirectory();

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateViewportWidth);
  }
});

onBeforeUnmount(() => {
  directoryLoadRequestId += 1;

  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportWidth);
  }

  if (searchQueryReloadTimer) {
    clearTimeout(searchQueryReloadTimer);
    searchQueryReloadTimer = null;
  }
});

watch(searchMode, () => {
  void loadDirectory();
});

watch(searchQuery, () => {
  scheduleDirectoryReload();
});
</script>
