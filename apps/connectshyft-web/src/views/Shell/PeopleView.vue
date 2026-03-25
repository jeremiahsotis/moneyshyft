<script setup lang="ts">
import type {
  ConnectShyftResolverQueueDetailData,
  ConnectShyftResolverQueueItemRecord,
  ConnectShyftResolverQueueItemType,
  ResolverActionType,
  ResolverRiskFlag,
  ResolverReviewStatus,
  ResolverReviewType,
} from '@shyft/contracts';
import { computed, onMounted, ref, watch } from 'vue';
import {
  claimConnectShyftResolverQueueItem,
  fetchConnectShyftResolverQueue,
  fetchConnectShyftResolverQueueDetail,
  releaseConnectShyftResolverQueueItem,
} from '@/features/connectshyft/resolverQueue';
import {
  clearSubjectContext,
  replaceSubjectContext,
  useSubjectContext,
} from '../../shell/subjectContext';
import { useShellAvailableOrgUnits } from '../../shell/orgUnitContext';

type ResolverWorkspaceFilter =
  | 'all_active'
  | 'identity_review'
  | 'rebind_review'
  | 'claimed_by_me'
  | 'unclaimed';

type ResolverFilterDefinition = {
  id: ResolverWorkspaceFilter;
  label: string;
  description: string;
};

const subjectContext = useSubjectContext();
const availableOrgUnits = useShellAvailableOrgUnits();
const resolverQueueItems = ref<ConnectShyftResolverQueueItemRecord[]>([]);
const resolverQueueLoading = ref(false);
const resolverQueueError = ref('');
const resolverQueueFeedback = ref('');
const resolverQueueAuthorized = ref<boolean | null>(null);
const resolverQueueFilter = ref<ResolverWorkspaceFilter>('all_active');
const resolverActionPendingKey = ref('');
const selectedResolverQueueKey = ref('');
const selectedResolverQueueDetail = ref<ConnectShyftResolverQueueDetailData | null>(null);
const resolverDetailLoading = ref(false);
const resolverDetailError = ref('');
const manuallySelectedResolverQueueKey = ref('');

const RESOLVER_FILTERS: ResolverFilterDefinition[] = [
  {
    id: 'all_active',
    label: 'All active',
    description: 'Every active review in this workspace.',
  },
  {
    id: 'identity_review',
    label: 'Identity reviews',
    description: 'Identity ambiguity and subject-confirmation work.',
  },
  {
    id: 'rebind_review',
    label: 'Record updates',
    description: 'Sensitive record updates that need review before they move forward.',
  },
  {
    id: 'claimed_by_me',
    label: 'Assigned to me',
    description: 'Reviews currently assigned to you.',
  },
  {
    id: 'unclaimed',
    label: 'Available',
    description: 'Reviews ready for someone to pick up.',
  },
];

const currentOrgUnitLabel = computed(() => (
  availableOrgUnits.value.find((orgUnit) => orgUnit.id === subjectContext.value.orgUnitId)?.label
  || 'Current workspace'
));

const buildResolverQueueKey = (itemType: ConnectShyftResolverQueueItemType, itemId: string): string =>
  `${itemType}:${itemId}`;

const normalizeRequestedAt = (value: string | null): number => {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortResolverQueueItems = (
  items: ConnectShyftResolverQueueItemRecord[],
): ConnectShyftResolverQueueItemRecord[] => [...items].sort((left, right) => {
  const requestedAtDelta = normalizeRequestedAt(left.requestedAt) - normalizeRequestedAt(right.requestedAt);
  if (requestedAtDelta !== 0) {
    return requestedAtDelta;
  }

  return buildResolverQueueKey(left.itemType, left.id).localeCompare(
    buildResolverQueueKey(right.itemType, right.id),
  );
});

const resolverWorkspaceAccessible = computed(() => resolverQueueAuthorized.value !== false);

const resolverQueueCounts = computed(() => ({
  all_active: resolverQueueItems.value.filter((item) => item.active).length,
  identity_review: resolverQueueItems.value.filter((item) => item.itemType === 'identity_review').length,
  rebind_review: resolverQueueItems.value.filter((item) => item.itemType === 'rebind_review').length,
  claimed_by_me: resolverQueueItems.value.filter((item) => item.claimState === 'claimed_by_current_user').length,
  unclaimed: resolverQueueItems.value.filter((item) => item.claimState === 'unclaimed').length,
}));

const filteredResolverQueueItems = computed(() => resolverQueueItems.value.filter((item) => {
  switch (resolverQueueFilter.value) {
    case 'identity_review':
      return item.itemType === 'identity_review';
    case 'rebind_review':
      return item.itemType === 'rebind_review';
    case 'claimed_by_me':
      return item.claimState === 'claimed_by_current_user';
    case 'unclaimed':
      return item.claimState === 'unclaimed';
    default:
      return item.active;
  }
}));

const selectedResolverQueueItem = computed(() => filteredResolverQueueItems.value.find((item) =>
  buildResolverQueueKey(item.itemType, item.id) === selectedResolverQueueKey.value)
  || null);

const resolverQueueSummary = computed(() => {
  const total = resolverQueueCounts.value.all_active;
  if (!resolverWorkspaceAccessible.value) {
    return 'Review queue actions are not available for your access in this workspace.';
  }

  if (resolverQueueLoading.value && total === 0) {
    return 'Loading current review work for this workspace.';
  }

  if (total === 0) {
    return 'No review work is waiting right now. Identity and record update reviews will appear here when they need attention.';
  }

  const identityCount = resolverQueueCounts.value.identity_review;
  const rebindCount = resolverQueueCounts.value.rebind_review;
  return `${total} active review${total === 1 ? '' : 's'} in this workspace, including ${identityCount} identity review${identityCount === 1 ? '' : 's'} and ${rebindCount} record update review${rebindCount === 1 ? '' : 's'}.`;
});

const resolverWorkspaceEmptyState = computed(() => {
  switch (resolverQueueFilter.value) {
    case 'identity_review':
      return 'No identity reviews are active right now.';
    case 'rebind_review':
      return 'No record update reviews are active right now.';
    case 'claimed_by_me':
      return 'You do not currently have any assigned review work.';
    case 'unclaimed':
      return 'No available reviews are ready right now.';
    default:
      return 'No active review work is waiting right now.';
  }
});

const formatResolverDateTime = (value: string | null): string => {
  if (!value) {
    return 'Time unavailable';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Time unavailable';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
};

const formatResolverQueueLabel = (value: string): string => (
  value
    .split('_')
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
);

const formatItemTypeLabel = (itemType: ConnectShyftResolverQueueItemType): string => (
  itemType === 'identity_review' ? 'Identity review' : 'Record update review'
);

const formatClaimStateLabel = (item: ConnectShyftResolverQueueItemRecord): string => {
  switch (item.claimState) {
    case 'claimed_by_current_user':
      return 'Assigned to me';
    case 'claimed_by_other':
      return 'Assigned elsewhere';
    default:
      return 'Available';
  }
};

const formatReadinessLabel = (item: ConnectShyftResolverQueueItemRecord): string => {
  if (item.terminal) {
    return 'Closed';
  }

  if (item.status === 'waiting_for_more_info') {
    return 'Waiting for more info';
  }

  if (item.claimState === 'claimed_by_current_user' && item.actionable) {
    return 'Ready to act';
  }

  if (item.claimState === 'claimed_by_other') {
    return 'Busy';
  }

  if (item.claimable) {
    return 'Assignment needed';
  }

  if (item.status === 'in_review') {
    return 'In review';
  }

  return item.active ? 'Active' : 'Closed';
};

const formatResolverRiskFlag = (flag: ResolverRiskFlag): string => {
  switch (flag) {
    case 'shared_contact_possible':
      return 'Shared contact possible';
    case 'shared_contact_confirmed':
      return 'Shared contact confirmed';
    case 'stale_contact':
      return 'Stale contact';
    case 'archived_prior_owner':
      return 'Archived prior owner';
    case 'conflicting_name_dob':
      return 'Conflicting identity details';
    case 'rapid_contact_reuse':
      return 'Rapid contact reuse';
    case 'duplicate_creation_attempt':
      return 'Duplicate creation attempt';
    case 'high_confidence_override_attempt':
      return 'High-confidence override attempt';
    default:
      return formatResolverQueueLabel(flag);
  }
};

const formatResolverActionType = (value: ResolverActionType | null | undefined): string => {
  if (!value) {
    return 'Review required';
  }

  switch (value) {
    case 'confirm_existing_person':
      return 'Confirm existing person';
    case 'confirm_new_person':
      return 'Confirm new person';
    case 'merge_people':
      return 'Merge people';
    case 'link_without_merge':
      return 'Link without merge';
    case 'mark_shared_contact':
      return 'Mark shared contact';
    case 'reassign_contact_point':
      return 'Move contact record';
    case 'dismiss_no_action':
      return 'Dismiss without action';
    default:
      return formatResolverQueueLabel(value);
  }
};

const buildQueueItemSummary = (item: ConnectShyftResolverQueueItemRecord): string => {
  if (item.itemType === 'rebind_review') {
    return 'Sensitive record updates are waiting for review before conversation history moves to the right person.';
  }

  if (item.status === 'waiting_for_more_info') {
    return 'This review is waiting for more information before it can continue.';
  }

  return 'Identity evidence needs review before People and ConnectShyft update together.';
};

const buildQueueItemContext = (item: ConnectShyftResolverQueueItemRecord): string[] => {
  const context: string[] = [];
  if (item.personIds.length > 0) {
    context.push(`${item.personIds.length} person context${item.personIds.length === 1 ? '' : 's'}`);
  } else {
    context.push('Person context pending');
  }

  if (item.contactPointId) {
    context.push('Contact details attached');
  }

  if (item.conversationId || item.threadId) {
    context.push('Conversation context attached');
  }

  context.push(`Status: ${formatResolverQueueLabel(item.status)}`);
  return context;
};

const buildIdentityReviewReason = (
  reviewType: ResolverReviewType | undefined,
  riskFlags: ResolverRiskFlag[],
): string => {
  if (reviewType === 'contact_point_reassignment') {
    return 'This contact number may belong with a different person, so review is needed before records update.';
  }

  if (reviewType === 'shared_contact_ambiguity' || riskFlags.includes('shared_contact_possible')) {
    return 'This contact number may belong to more than one person, so review is needed before it is confirmed.';
  }

  if (riskFlags.includes('conflicting_name_dob')) {
    return 'The current identity evidence conflicts, so the correct person needs review before the workspace updates.';
  }

  return 'Review is needed before People and ConnectShyft rely on this identity result.';
};

const buildRebindReviewReason = (resolutionType: ResolverActionType | null | undefined): string => {
  if (resolutionType === 'reassign_contact_point') {
    return 'A sensitive contact update needs review before conversation history moves.';
  }

  if (resolutionType === 'merge_people') {
    return 'A person merge needs review before conversation history moves.';
  }

  return 'This record update affects sensitive conversation context, so review is needed before the latest person record is fully applied.';
};

const formatIdentityReviewStatus = (value: ResolverReviewStatus | undefined): string => {
  if (!value) {
    return 'Unknown';
  }

  if (value === 'queued') {
    return 'Queued';
  }

  if (value === 'in_review') {
    return 'In review';
  }

  if (value === 'waiting_for_more_info') {
    return 'Waiting for more info';
  }

  return formatResolverQueueLabel(value);
};

const setResolverQueueItems = (items: ConnectShyftResolverQueueItemRecord[]) => {
  resolverQueueItems.value = sortResolverQueueItems(items.filter((item) => item.active));
};

const upsertResolverQueueItem = (nextItem: ConnectShyftResolverQueueItemRecord) => {
  const existing = resolverQueueItems.value.filter((item) =>
    buildResolverQueueKey(item.itemType, item.id) !== buildResolverQueueKey(nextItem.itemType, nextItem.id));
  setResolverQueueItems([...existing, nextItem]);
};

const clearSelectedResolverQueueDetail = () => {
  selectedResolverQueueDetail.value = null;
  resolverDetailError.value = '';
};

const clearManualResolverSubjectSelection = (orgUnitId = '') => {
  if (!manuallySelectedResolverQueueKey.value) {
    return;
  }

  manuallySelectedResolverQueueKey.value = '';
  clearSubjectContext(subjectContext, orgUnitId || subjectContext.value.orgUnitId);
};

const loadResolverQueue = async () => {
  resolverQueueLoading.value = true;
  resolverQueueError.value = '';
  resolverQueueFeedback.value = '';

  const result = await fetchConnectShyftResolverQueue();
  resolverQueueLoading.value = false;

  if (!result.ok) {
    resolverQueueAuthorized.value = result.unauthorized ? false : resolverQueueAuthorized.value;
    if (result.unauthorized) {
      setResolverQueueItems([]);
      selectedResolverQueueKey.value = '';
      clearSelectedResolverQueueDetail();
      return;
    }

    resolverQueueError.value = result.message || 'Unable to load the review queue.';
    setResolverQueueItems([]);
    selectedResolverQueueKey.value = '';
    clearSelectedResolverQueueDetail();
    return;
  }

  resolverQueueAuthorized.value = true;
  setResolverQueueItems(result.items);
};

const loadResolverQueueDetail = async (
  item: ConnectShyftResolverQueueItemRecord,
) => {
  const requestKey = buildResolverQueueKey(item.itemType, item.id);
  resolverDetailLoading.value = true;
  resolverDetailError.value = '';

  const result = await fetchConnectShyftResolverQueueDetail(item.itemType, item.id);
  if (selectedResolverQueueKey.value !== requestKey) {
    resolverDetailLoading.value = false;
    return;
  }

  resolverDetailLoading.value = false;

  if (!result.ok) {
    if (result.unauthorized) {
      resolverQueueAuthorized.value = false;
      setResolverQueueItems([]);
      clearManualResolverSubjectSelection(item.orgUnitId || subjectContext.value.orgUnitId);
      clearSelectedResolverQueueDetail();
      return;
    }

    if (result.unavailable) {
      resolverDetailError.value = 'This review is no longer available. Refresh the list to continue.';
      resolverQueueFeedback.value = resolverDetailError.value;
      setResolverQueueItems(resolverQueueItems.value.filter((queueItem) =>
        buildResolverQueueKey(queueItem.itemType, queueItem.id) !== requestKey));
      selectedResolverQueueDetail.value = null;
      if (manuallySelectedResolverQueueKey.value === requestKey) {
        clearManualResolverSubjectSelection(item.orgUnitId || subjectContext.value.orgUnitId);
      }
      return;
    }

    selectedResolverQueueDetail.value = null;
    resolverDetailError.value = result.message || 'Unable to load review details.';
    return;
  }

  resolverQueueAuthorized.value = true;
  selectedResolverQueueDetail.value = result.detail;
  upsertResolverQueueItem(result.detail.item);
};

const selectResolverQueueItem = (item: ConnectShyftResolverQueueItemRecord) => {
  const requestKey = buildResolverQueueKey(item.itemType, item.id);
  manuallySelectedResolverQueueKey.value = requestKey;
  selectedResolverQueueKey.value = requestKey;

  if (selectedResolverQueueDetail.value) {
    const detailKey = buildResolverQueueKey(
      selectedResolverQueueDetail.value.item.itemType,
      selectedResolverQueueDetail.value.item.id,
    );
    if (detailKey === requestKey) {
      replaceSubjectContext(subjectContext, selectedResolverQueueDetail.value.subjectContext);
    }
  }
};

const runResolverQueueMutation = async (
  item: ConnectShyftResolverQueueItemRecord,
  action: 'claim' | 'release',
) => {
  resolverQueueFeedback.value = '';
  resolverQueueError.value = '';
  resolverDetailError.value = '';
  const actionKey = buildResolverQueueKey(item.itemType, item.id);
  resolverActionPendingKey.value = actionKey;

  const result = action === 'claim'
    ? await claimConnectShyftResolverQueueItem(item.itemType, item.id)
    : await releaseConnectShyftResolverQueueItem(item.itemType, item.id);

  resolverActionPendingKey.value = '';

  if (!result.ok) {
    if (result.unauthorized) {
      resolverQueueAuthorized.value = false;
      setResolverQueueItems([]);
      selectedResolverQueueKey.value = '';
      clearManualResolverSubjectSelection(item.orgUnitId || subjectContext.value.orgUnitId);
      clearSelectedResolverQueueDetail();
      return;
    }

    if (result.unavailable) {
      resolverQueueFeedback.value = 'This review is no longer available.';
      setResolverQueueItems(resolverQueueItems.value.filter((queueItem) =>
        buildResolverQueueKey(queueItem.itemType, queueItem.id) !== actionKey));
      selectedResolverQueueDetail.value = null;
      selectedResolverQueueKey.value = '';
      if (manuallySelectedResolverQueueKey.value === actionKey) {
        clearManualResolverSubjectSelection(item.orgUnitId || subjectContext.value.orgUnitId);
      }
      return;
    }

    resolverQueueFeedback.value = result.message || (
      action === 'claim'
        ? 'Unable to assign this review right now.'
        : 'Unable to release this review right now.'
    );
    return;
  }

  resolverQueueAuthorized.value = true;
  resolverQueueFeedback.value = action === 'claim'
    ? 'Review assigned to you.'
    : 'Review returned to the queue.';
  selectedResolverQueueDetail.value = result.detail;
  selectedResolverQueueKey.value = buildResolverQueueKey(
    result.detail.item.itemType,
    result.detail.item.id,
  );
  upsertResolverQueueItem(result.detail.item);
};

const claimSelectedResolverQueueItem = async () => {
  if (!selectedResolverQueueItem.value) {
    return;
  }

  await runResolverQueueMutation(selectedResolverQueueItem.value, 'claim');
};

const releaseSelectedResolverQueueItem = async () => {
  if (!selectedResolverQueueItem.value) {
    return;
  }

  await runResolverQueueMutation(selectedResolverQueueItem.value, 'release');
};

watch(filteredResolverQueueItems, (items) => {
  if (items.length === 0) {
    clearManualResolverSubjectSelection(subjectContext.value.orgUnitId);
    selectedResolverQueueKey.value = '';
    clearSelectedResolverQueueDetail();
    return;
  }

  const hasSelectedItem = items.some((item) =>
    buildResolverQueueKey(item.itemType, item.id) === selectedResolverQueueKey.value);
  if (!hasSelectedItem) {
    if (manuallySelectedResolverQueueKey.value) {
      const hasManualSelection = items.some((item) =>
        buildResolverQueueKey(item.itemType, item.id) === manuallySelectedResolverQueueKey.value);
      if (!hasManualSelection) {
        clearManualResolverSubjectSelection(subjectContext.value.orgUnitId);
      }
    }
    selectedResolverQueueKey.value = buildResolverQueueKey(items[0].itemType, items[0].id);
  }
}, { immediate: true });

watch(selectedResolverQueueKey, (nextKey) => {
  const item = filteredResolverQueueItems.value.find((queueItem) =>
    buildResolverQueueKey(queueItem.itemType, queueItem.id) === nextKey);
  if (!item || !resolverWorkspaceAccessible.value) {
    clearSelectedResolverQueueDetail();
    return;
  }

  void loadResolverQueueDetail(item);
});

watch(selectedResolverQueueDetail, (nextDetail) => {
  if (!nextDetail) {
    return;
  }

  const detailKey = buildResolverQueueKey(nextDetail.item.itemType, nextDetail.item.id);
  if (!manuallySelectedResolverQueueKey.value || detailKey !== manuallySelectedResolverQueueKey.value) {
    return;
  }

  replaceSubjectContext(subjectContext, nextDetail.subjectContext);
});

onMounted(() => {
  void loadResolverQueue();
});
</script>

<template>
  <section class="space-y-6 p-4">
    <div class="space-y-1">
      <h1 class="text-xl font-semibold text-slate-900">People</h1>
      <p class="text-sm text-slate-600">Current workspace: {{ currentOrgUnitLabel }}</p>
      <p class="text-sm text-slate-500">
        Identity review and record updates stay grounded here while current conversation context stays connected.
      </p>
    </div>

    <section
      data-test="resolver-workspace"
      class="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.28)]"
    >
      <div class="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-2">
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            People review queue
          </p>
          <div class="space-y-1">
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
              Identity and record update reviews
            </h2>
            <p data-test="resolver-workspace-summary" class="max-w-3xl text-sm text-slate-600">
              {{ resolverQueueSummary }}
            </p>
          </div>
        </div>

        <button
          data-test="resolver-workspace-refresh"
          type="button"
          class="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          :disabled="resolverQueueLoading || resolverActionPendingKey.length > 0"
          @click="loadResolverQueue"
        >
          {{ resolverQueueLoading ? 'Refreshing...' : 'Refresh reviews' }}
        </button>
      </div>

      <p
        v-if="resolverQueueAuthorized === false"
        data-test="resolver-workspace-locked"
        class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        Review queue actions are not available for your current access in this workspace.
      </p>

      <div v-else class="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.82fr)]">
        <section class="space-y-4">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="filter in RESOLVER_FILTERS"
              :key="filter.id"
              :data-test="`resolver-filter-${filter.id}`"
              type="button"
              class="inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition"
              :class="resolverQueueFilter === filter.id
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900'"
              :aria-pressed="resolverQueueFilter === filter.id"
              @click="resolverQueueFilter = filter.id"
            >
              <span>{{ filter.label }}</span>
              <span
                class="inline-flex min-w-[1.75rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="resolverQueueFilter === filter.id
                  ? 'bg-white/15 text-white'
                  : 'bg-slate-100 text-slate-600'"
              >
                {{ resolverQueueCounts[filter.id] }}
              </span>
            </button>
          </div>

          <p
            v-if="resolverQueueError"
            data-test="resolver-queue-error"
            class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {{ resolverQueueError }}
          </p>

          <p
            v-if="resolverQueueFeedback"
            data-test="resolver-queue-feedback"
            class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          >
            {{ resolverQueueFeedback }}
          </p>

          <p
            v-if="resolverQueueLoading && filteredResolverQueueItems.length === 0"
            data-test="resolver-queue-loading"
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600"
          >
            Loading reviews...
          </p>

          <ul
            v-else-if="filteredResolverQueueItems.length > 0"
            class="space-y-3"
          >
            <li
              v-for="item in filteredResolverQueueItems"
              :key="buildResolverQueueKey(item.itemType, item.id)"
            >
              <button
                type="button"
                :data-test="`resolver-queue-item-${item.id}`"
                class="w-full rounded-[24px] border px-4 py-4 text-left transition"
                :class="selectedResolverQueueItem?.id === item.id
                  ? 'border-slate-900 bg-slate-900 text-white shadow-[0_18px_54px_-34px_rgba(15,23,42,0.55)]'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'"
                :aria-pressed="selectedResolverQueueItem?.id === item.id"
                @click="selectResolverQueueItem(item)"
              >
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div class="space-y-3">
                    <div class="flex flex-wrap gap-2">
                      <span
                        :data-test="`resolver-queue-item-type-${item.id}`"
                        class="rounded-full border px-2.5 py-1 text-xs font-semibold"
                        :class="selectedResolverQueueItem?.id === item.id
                          ? 'border-white/25 bg-white/10 text-white'
                          : item.itemType === 'identity_review'
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-amber-200 bg-amber-50 text-amber-800'"
                      >
                        {{ formatItemTypeLabel(item.itemType) }}
                      </span>

                      <span
                        :data-test="`resolver-queue-item-claim-${item.id}`"
                        class="rounded-full border px-2.5 py-1 text-xs font-semibold"
                        :class="selectedResolverQueueItem?.id === item.id
                          ? 'border-white/25 bg-white/10 text-white'
                          : item.claimState === 'claimed_by_current_user'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : item.claimState === 'claimed_by_other'
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : 'border-slate-200 bg-slate-50 text-slate-700'"
                      >
                        {{ formatClaimStateLabel(item) }}
                      </span>

                      <span
                        :data-test="`resolver-queue-item-readiness-${item.id}`"
                        class="rounded-full border px-2.5 py-1 text-xs font-semibold"
                        :class="selectedResolverQueueItem?.id === item.id
                          ? 'border-white/25 bg-white/10 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700'"
                      >
                        {{ formatReadinessLabel(item) }}
                      </span>
                    </div>

                    <div class="space-y-1">
                      <p class="text-base font-semibold">
                        {{ formatItemTypeLabel(item.itemType) }}
                      </p>
                      <p
                        class="text-sm leading-6"
                        :class="selectedResolverQueueItem?.id === item.id ? 'text-slate-100' : 'text-slate-600'"
                      >
                        {{ buildQueueItemSummary(item) }}
                      </p>
                    </div>
                  </div>

                  <p
                    class="shrink-0 text-xs font-medium"
                    :class="selectedResolverQueueItem?.id === item.id ? 'text-slate-200' : 'text-slate-500'"
                  >
                    Requested {{ formatResolverDateTime(item.requestedAt) }}
                  </p>
                </div>

                <div
                  class="mt-3 flex flex-wrap gap-2 text-xs"
                  :class="selectedResolverQueueItem?.id === item.id ? 'text-slate-200' : 'text-slate-500'"
                >
                  <span
                    v-for="context in buildQueueItemContext(item)"
                    :key="`${item.id}-${context}`"
                    class="rounded-full border px-2.5 py-1"
                    :class="selectedResolverQueueItem?.id === item.id
                      ? 'border-white/20 bg-white/5'
                      : 'border-slate-200 bg-slate-50'"
                  >
                    {{ context }}
                  </span>
                </div>
              </button>
            </li>
          </ul>

          <p
            v-else
            data-test="resolver-queue-empty"
            class="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500"
          >
            {{ resolverWorkspaceEmptyState }}
          </p>
        </section>

        <section
          data-test="resolver-detail"
          class="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4"
        >
          <div v-if="selectedResolverQueueItem" class="space-y-4">
            <div class="space-y-3 border-b border-slate-200 pb-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="space-y-2">
                  <div class="flex flex-wrap gap-2">
                    <span
                      data-test="resolver-detail-type"
                      class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
                    >
                      {{ formatItemTypeLabel(selectedResolverQueueItem.itemType) }}
                    </span>
                    <span
                      data-test="resolver-detail-status"
                      class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
                    >
                      {{ formatIdentityReviewStatus(selectedResolverQueueItem.status) }}
                    </span>
                  </div>
                  <div class="space-y-1">
                    <h3 class="text-lg font-semibold text-slate-900">
                      {{ formatItemTypeLabel(selectedResolverQueueItem.itemType) }} details
                    </h3>
                    <p class="text-sm text-slate-600">
                      {{ formatClaimStateLabel(selectedResolverQueueItem) }}. {{ formatReadinessLabel(selectedResolverQueueItem) }}.
                    </p>
                  </div>
                </div>

                <div class="flex flex-wrap gap-2">
                  <button
                    v-if="selectedResolverQueueItem.claimable"
                    data-test="resolver-detail-claim"
                    type="button"
                    class="inline-flex min-h-[44px] items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                    :disabled="resolverActionPendingKey === buildResolverQueueKey(selectedResolverQueueItem.itemType, selectedResolverQueueItem.id)"
                    @click="claimSelectedResolverQueueItem"
                  >
                    {{ resolverActionPendingKey === buildResolverQueueKey(selectedResolverQueueItem.itemType, selectedResolverQueueItem.id)
                      ? 'Assigning...'
                      : 'Assign to me' }}
                  </button>

                  <button
                    v-else-if="selectedResolverQueueItem.releasable"
                    data-test="resolver-detail-release"
                    type="button"
                    class="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    :disabled="resolverActionPendingKey === buildResolverQueueKey(selectedResolverQueueItem.itemType, selectedResolverQueueItem.id)"
                    @click="releaseSelectedResolverQueueItem"
                  >
                    {{ resolverActionPendingKey === buildResolverQueueKey(selectedResolverQueueItem.itemType, selectedResolverQueueItem.id)
                      ? 'Releasing...'
                      : 'Release assignment' }}
                  </button>

                  <button
                    v-else-if="selectedResolverQueueItem.claimState === 'claimed_by_other'"
                    data-test="resolver-detail-claim-disabled"
                    type="button"
                    disabled
                    class="inline-flex min-h-[44px] items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed"
                  >
                    Already in progress
                  </button>
                </div>
              </div>

              <p
                v-if="selectedResolverQueueItem.claimState === 'unclaimed'"
                data-test="resolver-detail-claim-required"
                class="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
              >
                Assign this review before taking action anywhere else.
              </p>
              <p
                v-else-if="selectedResolverQueueItem.claimState === 'claimed_by_other'"
                data-test="resolver-detail-claimed-by-other"
                class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
              >
                Someone else is currently working this review, so it is not actionable here.
              </p>
              <p
                v-else-if="selectedResolverQueueItem.status === 'waiting_for_more_info'"
                data-test="resolver-detail-waiting"
                class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                This review remains active, but it is waiting for more information before action can continue.
              </p>
            </div>

            <p
              v-if="resolverDetailLoading && !selectedResolverQueueDetail"
              data-test="resolver-detail-loading"
              class="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600"
            >
              Loading review details...
            </p>

            <p
              v-else-if="resolverDetailError"
              data-test="resolver-detail-error"
              class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              {{ resolverDetailError }}
            </p>

            <div v-else-if="selectedResolverQueueDetail" class="space-y-4">
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Requested
                  </p>
                  <p class="mt-2 text-sm text-slate-700">
                    {{ formatResolverDateTime(selectedResolverQueueDetail.item.requestedAt) }}
                  </p>
                </div>

                <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Review status
                  </p>
                  <p class="mt-2 text-sm text-slate-700">
                    {{ formatIdentityReviewStatus(selectedResolverQueueDetail.item.status) }}
                  </p>
                </div>
              </div>

              <template v-if="selectedResolverQueueDetail.item.itemType === 'identity_review'">
                <p
                  data-test="resolver-detail-reason"
                  class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                >
                  {{ buildIdentityReviewReason(
                    selectedResolverQueueDetail.review?.reviewType,
                    selectedResolverQueueDetail.review?.riskFlags || [],
                  ) }}
                </p>

                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Person context
                    </p>
                    <p class="mt-2 text-sm text-slate-700">
                      {{ selectedResolverQueueDetail.item.personIds.length }} person context{{
                        selectedResolverQueueDetail.item.personIds.length === 1 ? '' : 's'
                      }} attached
                    </p>
                    <p class="mt-1 text-sm text-slate-500">
                      {{
                        selectedResolverQueueDetail.review?.provisionalPersonId
                          ? 'Includes a provisional person awaiting confirmation.'
                          : 'This review is working from the current subject record.'
                      }}
                    </p>
                  </div>

                  <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Contact and thread context
                    </p>
                    <p class="mt-2 text-sm text-slate-700">
                      {{
                        selectedResolverQueueDetail.item.contactPointId
                          ? 'Contact details are attached to this review.'
                          : 'Contact details are still being gathered.'
                      }}
                    </p>
                    <p class="mt-1 text-sm text-slate-500">
                      {{
                        selectedResolverQueueDetail.item.conversationId || selectedResolverQueueDetail.item.threadId
                          ? 'Conversation context is available to help triage safely.'
                          : 'No conversation context is attached yet.'
                      }}
                    </p>
                  </div>
                </div>

                <div
                  v-if="selectedResolverQueueDetail.review?.riskFlags.length"
                  class="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Ambiguity signals
                  </p>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <span
                      v-for="riskFlag in selectedResolverQueueDetail.review?.riskFlags || []"
                      :key="riskFlag"
                      class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      {{ formatResolverRiskFlag(riskFlag) }}
                    </span>
                  </div>
                </div>
              </template>

              <template v-else>
                <p
                  data-test="resolver-detail-reason"
                  class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                >
                  {{ buildRebindReviewReason(selectedResolverQueueDetail.rebindReview?.originatingResolutionType) }}
                </p>

                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Update scope
                    </p>
                    <p class="mt-2 text-sm text-slate-700">
                      {{ formatResolverQueueLabel(
                        selectedResolverQueueDetail.rebindReview?.affectedObjectType || 'review',
                      ) }} review
                    </p>
                    <p class="mt-1 text-sm text-slate-500">
                      {{ selectedResolverQueueDetail.rebindReview?.affectedObjectIds.length || 0 }} affected record{{
                        (selectedResolverQueueDetail.rebindReview?.affectedObjectIds.length || 0) === 1 ? '' : 's'
                      }} need review before history moves.
                    </p>
                  </div>

                  <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Identity movement
                    </p>
                    <p class="mt-2 text-sm text-slate-700">
                      Source and target person context are recorded for this review.
                    </p>
                    <p class="mt-1 text-sm text-slate-500">
                      {{ selectedResolverQueueDetail.rebindReview?.contactPointIds.length || 0 }} contact detail{{
                        (selectedResolverQueueDetail.rebindReview?.contactPointIds.length || 0) === 1 ? '' : 's'
                      }} are part of this update.
                    </p>
                  </div>
                </div>

                <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Trigger
                  </p>
                  <p class="mt-2 text-sm text-slate-700">
                    {{
                      selectedResolverQueueDetail.rebindReview?.originatingResolutionType
                        ? `${formatResolverActionType(selectedResolverQueueDetail.rebindReview.originatingResolutionType)} started this follow-up review.`
                        : 'A prior review decision started this follow-up review.'
                    }}
                  </p>
                  <p class="mt-1 text-sm text-slate-500">
                    Review this item here before sensitive conversation history follows the latest person record.
                  </p>
                </div>
              </template>
            </div>

            <p
              v-else
              class="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600"
            >
              Select a review item to inspect its current context.
            </p>
          </div>

          <p
            v-else
            data-test="resolver-detail-empty"
            class="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500"
          >
            Select a review item to inspect its context and action state.
          </p>
        </section>
      </div>
    </section>
  </section>
</template>
