<template>
  <main class="cs-page-shell">
    <section
      data-testid="connectshyft-directory-surface"
      class="cs-page-shell__inner cs-stack"
    >
      <SurfaceCard padding="default" panel tone="soft">
        <SectionHeader
          eyebrow="Directory"
          title="Neighbor Directory"
          description="Find someone quickly and open the right conversation without digging through a dense list."
          size="md"
        />
      </SurfaceCard>

      <p
        v-if="layoutMarkerTestId"
        :data-testid="layoutMarkerTestId"
        aria-hidden="true"
        class="hidden"
      >
        {{ layoutMarkerCopy }}
      </p>

      <SurfaceCard
        data-testid="connectshyft-directory-context-panel"
        padding="compact"
        tone="muted"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="space-y-2">
            <p class="cs-kicker">Current workspace</p>
            <p class="cs-body">
              {{ scope
                ? 'New conversations started here stay with the current conference workspace.'
                : 'Confirming the current workspace before showing results.' }}
            </p>
          </div>
          <StatusBadge
            :label="activeOrgUnitId ? 'Ready to search' : 'Loading workspace'"
            :tone="activeOrgUnitId ? 'success' : 'context'"
          />
        </div>
      </SurfaceCard>

      <SurfaceCard padding="default" panel>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-end">
          <SegmentedTabs
            v-model="searchMode"
            :disabled="isLoading"
            :options="directorySearchModeOptions"
            test-id="connectshyft-directory-search-mode"
          />
          <SearchField
            v-model="searchQuery"
            test-id="connectshyft-directory-search-input"
            label="Search"
            :disabled="isLoading"
            :placeholder="searchMode === 'name' ? 'Search by first or last name' : 'Search by phone number'"
          />
        </div>

        <p
          v-if="loadError"
          class="cs-shell-notice cs-shell-notice--warning mt-4"
        >
          {{ loadError }}
        </p>

        <ul class="mt-4 space-y-3">
          <li
            v-for="neighbor in visibleNeighbors"
            :key="neighbor.neighborId"
            data-testid="connectshyft-directory-result-card"
          >
            <SurfaceCard
              :data-testid="`connectshyft-directory-result-card-${neighbor.neighborId}`"
              class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
              padding="compact"
              interactive
            >
              <div class="min-w-0 flex-1">
                <p class="cs-heading-md">
                  {{ formatNeighborName(neighbor) }}
                </p>
                <p class="mt-2 cs-body">
                  {{ firstPhoneLabel(neighbor) }}
                </p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <StatusBadge
                    data-testid="connectshyft-directory-result-conference-chip"
                    label="Conference match"
                    tone="context"
                  />
                  <StatusBadge
                    v-if="neighbor.phones.length > 1"
                    :label="`${neighbor.phones.length} numbers`"
                    tone="neutral"
                  />
                </div>
              </div>

              <ActionButton
                type="button"
                data-testid="connectshyft-directory-start-conversation-action"
                tone="primary"
                :disabled="isEnsuringThread"
                @click="startConversation(neighbor.neighborId)"
              >
                {{ isEnsuringThread ? 'Opening...' : 'Start conversation' }}
              </ActionButton>
            </SurfaceCard>
          </li>
        </ul>

        <EmptyStatePanel
          v-if="!isLoading && !loadError && visibleNeighbors.length === 0"
          class="mt-4"
          eyebrow="Directory"
          title="No one matches that search"
          :description="directoryEmptyStateCopy"
        />
      </SurfaceCard>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ActionButton from '@/components/ui/ActionButton.vue';
import EmptyStatePanel from '@/components/ui/EmptyStatePanel.vue';
import SearchField from '@/components/ui/SearchField.vue';
import SectionHeader from '@/components/ui/SectionHeader.vue';
import SegmentedTabs from '@/components/ui/SegmentedTabs.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import SurfaceCard from '@/components/ui/SurfaceCard.vue';
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
const directorySearchModeOptions = [
  {
    label: 'Name',
    value: 'name',
    testId: 'connectshyft-directory-search-mode-name',
  },
  {
    label: 'Phone',
    value: 'phone',
    testId: 'connectshyft-directory-search-mode-phone',
  },
] as const;
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

const directoryEmptyStateCopy = computed(() => {
  if (searchQuery.value.trim().length > 0) {
    return 'Try a different spelling, another phone number, or clear the search to see everyone in this workspace.';
  }

  return 'People in the current workspace will appear here as soon as ConnectShyft can load the directory.';
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
    loadError.value = 'Choose a workspace before starting a conversation.';
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
