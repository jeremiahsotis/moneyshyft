<script setup lang="ts">
import type {
  ConnectShyftResolverQueueDetailData,
  ConnectShyftResolverQueueItemRecord,
  ConnectShyftResolverQueueItemType,
  ContactPoint,
  ContactPointStatus,
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
  resolveConnectShyftIdentityResolutionPresentation,
  type ConnectShyftIdentityResolutionCandidate,
  type ConnectShyftIdentityResolutionResponse,
} from '@/features/connectshyft/identityResolution';
import { useSubjectContext } from '../../shell/subjectContext';

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
const contactPoints = ref<ContactPoint[]>([]);
const contactPointError = ref('');
const decisionResult = ref<ConnectShyftIdentityResolutionResponse | null>(null);
const decisionError = ref('');
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

const SAMPLE_CANDIDATES: ConnectShyftIdentityResolutionCandidate[] = [
  {
    personId: 'person_very_high',
    score: 140,
    reasons: ['Exact phone match'],
    contactPointStatus: 'reassignment_suspected',
  },
  {
    personId: 'person_medium',
    score: 60,
    reasons: ['Name similarity'],
    contactPointStatus: 'active_shared_possible',
  },
];

const RESOLVER_FILTERS: ResolverFilterDefinition[] = [
  {
    id: 'all_active',
    label: 'All active',
    description: 'Every active resolver item in the shared workspace.',
  },
  {
    id: 'identity_review',
    label: 'Identity reviews',
    description: 'Identity ambiguity and subject-confirmation work.',
  },
  {
    id: 'rebind_review',
    label: 'Rebind reviews',
    description: 'Sensitive reassignment work that needs tenant-admin review.',
  },
  {
    id: 'claimed_by_me',
    label: 'Claimed by me',
    description: 'Items currently claimed by this resolver.',
  },
  {
    id: 'unclaimed',
    label: 'Unclaimed',
    description: 'Queue items ready for a tenant-admin to pick up.',
  },
];

const isSharedStatus = (status: ContactPointStatus | null | undefined): boolean =>
  status === 'active_shared_possible' || status === 'active_shared_confirmed';

const isStaleStatus = (status: ContactPointStatus | null | undefined): boolean =>
  status === 'stale';

const isReassignmentStatus = (status: ContactPointStatus | null | undefined): boolean =>
  status === 'reassignment_suspected';

const warnMissingDecisionStatus = (payload: {
  contactPointStatus?: ContactPointStatus;
  candidates?: ConnectShyftIdentityResolutionCandidate[];
}) => {
  if (!payload.contactPointStatus) {
    console.warn('ConnectShyft identity resolution response is missing contactPointStatus.');
  }

  (payload.candidates || []).forEach((candidate) => {
    if (!candidate.contactPointStatus) {
      console.warn('ConnectShyft identity resolution candidate is missing contactPointStatus.', {
        personId: candidate.personId,
      });
    }
  });
};

const decisionPresentation = computed(() => (
  decisionResult.value
    ? resolveConnectShyftIdentityResolutionPresentation(decisionResult.value)
    : null
));
const decisionCandidates = computed(() => decisionResult.value?.candidates || []);

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
    return 'Resolver queue actions stay tenant-admin only. Read-safe PeopleCore identity context remains available below.';
  }

  if (resolverQueueLoading.value && total === 0) {
    return 'Loading backend-authored resolver work for this org unit.';
  }

  if (total === 0) {
    return 'No active resolver work is waiting right now. Identity and rebind reviews will appear here when backend truth requires action.';
  }

  const identityCount = resolverQueueCounts.value.identity_review;
  const rebindCount = resolverQueueCounts.value.rebind_review;
  return `${total} active resolver item${total === 1 ? '' : 's'} in one workspace, including ${identityCount} identity review${identityCount === 1 ? '' : 's'} and ${rebindCount} rebind review${rebindCount === 1 ? '' : 's'}.`;
});

const resolverWorkspaceEmptyState = computed(() => {
  switch (resolverQueueFilter.value) {
    case 'identity_review':
      return 'No identity reviews are active right now.';
    case 'rebind_review':
      return 'No rebind reviews are active right now.';
    case 'claimed_by_me':
      return 'You do not currently hold any claimed resolver work.';
    case 'unclaimed':
      return 'No unclaimed resolver items are ready for pickup right now.';
    default:
      return 'No active resolver work is waiting right now.';
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
  itemType === 'identity_review' ? 'Identity review' : 'Rebind review'
);

const formatClaimStateLabel = (item: ConnectShyftResolverQueueItemRecord): string => {
  switch (item.claimState) {
    case 'claimed_by_current_user':
      return 'Claimed by me';
    case 'claimed_by_other':
      return 'Claimed by another resolver';
    default:
      return 'Unclaimed';
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
    return 'Claim required';
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
    return 'Tenant-admin review';
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
      return 'Reassign contact point';
    case 'dismiss_no_action':
      return 'Dismiss without action';
    default:
      return formatResolverQueueLabel(value);
  }
};

const buildQueueItemSummary = (item: ConnectShyftResolverQueueItemRecord): string => {
  if (item.itemType === 'rebind_review') {
    return 'Sensitive reassignment work is waiting for tenant-admin review before historical ConnectShyft context moves with the new subject truth.';
  }

  if (item.status === 'waiting_for_more_info') {
    return 'Identity review is blocked until more information is available, but it stays in the active resolver workspace.';
  }

  return 'Identity evidence requires tenant-admin confirmation before subject truth can be applied safely across PeopleCore and ConnectShyft.';
};

const buildQueueItemContext = (item: ConnectShyftResolverQueueItemRecord): string[] => {
  const context: string[] = [];
  if (item.personIds.length > 0) {
    context.push(`${item.personIds.length} person context${item.personIds.length === 1 ? '' : 's'}`);
  } else {
    context.push('Person context pending');
  }

  if (item.contactPointId) {
    context.push('Contact point context attached');
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
    return 'This contact point may have moved between people, so tenant-admin review is required before identity truth changes.';
  }

  if (reviewType === 'shared_contact_ambiguity' || riskFlags.includes('shared_contact_possible')) {
    return 'This contact point may belong to more than one person, so tenant-admin review is required before assignment is confirmed.';
  }

  if (riskFlags.includes('conflicting_name_dob')) {
    return 'The current identity evidence conflicts, so a tenant admin needs to confirm the correct person before the workspace updates.';
  }

  return 'Tenant-admin review is required before PeopleCore and ConnectShyft can rely on this identity outcome.';
};

const buildRebindReviewReason = (resolutionType: ResolverActionType | null | undefined): string => {
  if (resolutionType === 'reassign_contact_point') {
    return 'A contact-point reassignment created sensitive follow-up work, so tenant-admin review is required before historical context is rebound.';
  }

  if (resolutionType === 'merge_people') {
    return 'A person merge created sensitive follow-up work, so tenant-admin review is required before historical context is rebound.';
  }

  return 'This reassignment affects sensitive ConnectShyft context, so tenant-admin review is required before the new subject truth is fully applied.';
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

    resolverQueueError.value = result.message || 'Unable to load resolver queue.';
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
      clearSelectedResolverQueueDetail();
      return;
    }

    if (result.unavailable) {
      resolverDetailError.value = 'This resolver item is no longer available. Refresh the queue to continue.';
      resolverQueueFeedback.value = resolverDetailError.value;
      setResolverQueueItems(resolverQueueItems.value.filter((queueItem) =>
        buildResolverQueueKey(queueItem.itemType, queueItem.id) !== requestKey));
      selectedResolverQueueDetail.value = null;
      return;
    }

    selectedResolverQueueDetail.value = null;
    resolverDetailError.value = result.message || 'Unable to load resolver detail.';
    return;
  }

  resolverQueueAuthorized.value = true;
  selectedResolverQueueDetail.value = result.detail;
  upsertResolverQueueItem(result.detail.item);
};

const selectResolverQueueItem = (item: ConnectShyftResolverQueueItemRecord) => {
  selectedResolverQueueKey.value = buildResolverQueueKey(item.itemType, item.id);
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
      clearSelectedResolverQueueDetail();
      return;
    }

    if (result.unavailable) {
      resolverQueueFeedback.value = 'This resolver item is no longer available.';
      setResolverQueueItems(resolverQueueItems.value.filter((queueItem) =>
        buildResolverQueueKey(queueItem.itemType, queueItem.id) !== actionKey));
      selectedResolverQueueDetail.value = null;
      selectedResolverQueueKey.value = '';
      return;
    }

    resolverQueueFeedback.value = result.message || (
      action === 'claim'
        ? 'Unable to claim this resolver item right now.'
        : 'Unable to release this resolver item right now.'
    );
    return;
  }

  resolverQueueAuthorized.value = true;
  resolverQueueFeedback.value = result.message;
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
    selectedResolverQueueKey.value = '';
    clearSelectedResolverQueueDetail();
    return;
  }

  const hasSelectedItem = items.some((item) =>
    buildResolverQueueKey(item.itemType, item.id) === selectedResolverQueueKey.value);
  if (!hasSelectedItem) {
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

onMounted(() => {
  void loadResolverQueue();
});

async function loadContactPoints() {
  contactPointError.value = '';

  try {
    const response = await fetch('/people/contact-points');
    if (!response.ok) {
      throw new Error(`Failed to load contact points (${response.status})`);
    }

    contactPoints.value = (await response.json()) as ContactPoint[];
  } catch (error) {
    contactPointError.value = error instanceof Error ? error.message : 'Failed to load contact points';
  }
}

async function runSampleDecision() {
  decisionError.value = '';

  try {
    const response = await fetch('/people/identity/decision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidates: SAMPLE_CANDIDATES,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to run identity decision (${response.status})`);
    }

    const payload = (await response.json()) as ConnectShyftIdentityResolutionResponse;
    warnMissingDecisionStatus(payload);
    decisionResult.value = payload;
  } catch (error) {
    decisionError.value = error instanceof Error ? error.message : 'Failed to run identity decision';
  }
}
</script>

<template>
  <section class="space-y-6 p-4">
    <div class="space-y-1">
      <h1 class="text-xl font-semibold text-slate-900">People shell</h1>
      <p class="text-sm text-slate-600">Org unit: {{ subjectContext.orgUnitId }}</p>
      <p class="text-sm text-slate-500">
        Tenant-admin resolvers work the shared identity and rebind queue here. Existing PeopleCore
        identity scaffolds stay available below for compatibility.
      </p>
    </div>

    <section
      data-test="resolver-workspace"
      class="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.28)]"
    >
      <div class="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-2">
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Resolver workspace
          </p>
          <div class="space-y-1">
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
              Primary queue for identity and rebind reviews
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
          {{ resolverQueueLoading ? 'Refreshing...' : 'Refresh queue' }}
        </button>
      </div>

      <p
        v-if="resolverQueueAuthorized === false"
        data-test="resolver-workspace-locked"
        class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        Resolver queue actions are available only to tenant-admin resolvers. People identity status
        remains visible below where it is safe to show.
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
            Loading resolver queue...
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
                      {{ formatItemTypeLabel(selectedResolverQueueItem.itemType) }} detail
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
                      ? 'Claiming...'
                      : 'Claim item' }}
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
                      : 'Release item' }}
                  </button>

                  <button
                    v-else-if="selectedResolverQueueItem.claimState === 'claimed_by_other'"
                    data-test="resolver-detail-claim-disabled"
                    type="button"
                    disabled
                    class="inline-flex min-h-[44px] items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed"
                  >
                    Claimed by another resolver
                  </button>
                </div>
              </div>

              <p
                v-if="selectedResolverQueueItem.claimState === 'unclaimed'"
                data-test="resolver-detail-claim-required"
                class="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
              >
                Claim this item before applying resolver actions anywhere else.
              </p>
              <p
                v-else-if="selectedResolverQueueItem.claimState === 'claimed_by_other'"
                data-test="resolver-detail-claimed-by-other"
                class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
              >
                Another tenant-admin resolver is currently working this item, so it is not actionable here.
              </p>
              <p
                v-else-if="selectedResolverQueueItem.status === 'waiting_for_more_info'"
                data-test="resolver-detail-waiting"
                class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                This resolver item remains active, but it is waiting for more information before action can continue.
              </p>
            </div>

            <p
              v-if="resolverDetailLoading && !selectedResolverQueueDetail"
              data-test="resolver-detail-loading"
              class="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600"
            >
              Loading resolver detail...
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
                    Queue status
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
                          : 'Resolver review is working from existing subject context.'
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
                          ? 'Contact point context is attached to this review.'
                          : 'Contact point context is still being gathered.'
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
                      Rebind scope
                    </p>
                    <p class="mt-2 text-sm text-slate-700">
                      {{ formatResolverQueueLabel(
                        selectedResolverQueueDetail.rebindReview?.affectedObjectType || 'review',
                      ) }} review
                    </p>
                    <p class="mt-1 text-sm text-slate-500">
                      {{ selectedResolverQueueDetail.rebindReview?.affectedObjectIds.length || 0 }} affected record{{
                        (selectedResolverQueueDetail.rebindReview?.affectedObjectIds.length || 0) === 1 ? '' : 's'
                      }} require review before rebinding continues.
                    </p>
                  </div>

                  <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Identity movement
                    </p>
                    <p class="mt-2 text-sm text-slate-700">
                      Source and target person context are recorded for this rebind review.
                    </p>
                    <p class="mt-1 text-sm text-slate-500">
                      {{ selectedResolverQueueDetail.rebindReview?.contactPointIds.length || 0 }} contact point{{
                        (selectedResolverQueueDetail.rebindReview?.contactPointIds.length || 0) === 1 ? '' : 's'
                      }} are part of the reassignment.
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
                        ? `${formatResolverActionType(selectedResolverQueueDetail.rebindReview.originatingResolutionType)} created this follow-up review.`
                        : 'A resolver decision created this follow-up review.'
                    }}
                  </p>
                  <p class="mt-1 text-sm text-slate-500">
                    Review this queue item here before sensitive ConnectShyft history follows the new subject truth.
                  </p>
                </div>
              </template>
            </div>

            <p
              v-else
              class="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600"
            >
              Select a resolver item to inspect its backend-authored context.
            </p>
          </div>

          <p
            v-else
            data-test="resolver-detail-empty"
            class="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500"
          >
            Select a resolver item to inspect its context and claim state.
          </p>
        </section>
      </div>
    </section>

    <div class="space-y-2">
      <button
        data-test="load-contact-points"
        type="button"
        class="rounded-full border border-slate-300 px-3 py-2 text-sm text-slate-700"
        @click="loadContactPoints"
      >
        Load contact points
      </button>

      <p
        v-if="contactPointError"
        class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        {{ contactPointError }}
      </p>

      <ul v-if="contactPoints.length > 0" class="space-y-2 pl-5">
        <li
          v-for="contactPoint in contactPoints"
          :key="contactPoint.id"
          class="flex flex-wrap items-center gap-2 text-sm text-slate-700"
        >
          <span>{{ contactPoint.type }} | {{ contactPoint.normalizedValue }} | {{ contactPoint.status }}</span>
          <span
            v-if="isSharedStatus(contactPoint.status)"
            data-test="contact-point-shared-indicator"
            role="status"
            aria-label="Shared contact point indicator"
            class="border border-amber-400 px-2 py-0.5 text-xs"
          >
            Shared
          </span>
          <span
            v-if="isStaleStatus(contactPoint.status)"
            data-test="contact-point-stale-indicator"
            role="status"
            aria-label="Stale contact point indicator"
            class="border border-slate-400 px-2 py-0.5 text-xs"
          >
            Stale
          </span>
          <span
            v-if="isReassignmentStatus(contactPoint.status)"
            data-test="contact-point-reassignment-indicator"
            role="status"
            aria-label="Reassignment risk indicator"
            class="border border-rose-400 px-2 py-0.5 text-xs"
          >
            Reassignment risk
          </span>
        </li>
      </ul>
      <p v-else class="text-sm text-slate-500">No contact points loaded yet.</p>
    </div>

    <div class="space-y-2">
      <button
        data-test="run-sample-decision"
        type="button"
        class="rounded-full border border-slate-300 px-3 py-2 text-sm text-slate-700"
        @click="runSampleDecision"
      >
        Run sample identity decision
      </button>

      <p
        v-if="decisionError"
        class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        {{ decisionError }}
      </p>

      <div v-if="decisionResult && decisionPresentation" data-test="decision-result" class="space-y-2">
        <p class="text-sm text-slate-700">Confidence band: {{ decisionResult.confidenceBand }}</p>
        <p class="text-sm text-slate-700">Resolution state: {{ decisionPresentation.resolvedState }}</p>
        <p class="text-sm text-slate-700">Default action: {{ decisionPresentation.defaultAction }}</p>
        <p data-test="decision-guidance" class="text-sm text-slate-600">{{ decisionPresentation.guidance }}</p>
        <p v-if="decisionResult.resolverReviewId" data-test="resolver-review-id" class="text-sm text-slate-700">
          Resolver review: {{ decisionResult.resolverReviewId }}
        </p>
        <ul
          v-if="decisionPresentation.showCandidates && decisionCandidates.length > 0"
          data-test="decision-candidates"
          class="space-y-2 pl-5"
        >
          <li
            v-for="candidate in decisionCandidates"
            :key="candidate.personId"
            class="flex flex-wrap items-center gap-2 text-sm text-slate-700"
          >
            <span>{{ candidate.personId }} (score {{ candidate.score }})</span>
            <span data-test="decision-candidate-status">
              {{ candidate.contactPointStatus }}
            </span>
            <span
              v-if="isSharedStatus(candidate.contactPointStatus)"
              data-test="decision-candidate-shared-indicator"
              role="status"
              aria-label="Shared decision candidate indicator"
              class="border border-amber-400 px-2 py-0.5 text-xs"
            >
              Shared
            </span>
            <span
              v-if="isStaleStatus(candidate.contactPointStatus)"
              data-test="decision-candidate-stale-indicator"
              role="status"
              aria-label="Stale decision candidate indicator"
              class="border border-slate-400 px-2 py-0.5 text-xs"
            >
              Stale
            </span>
            <span
              v-if="isReassignmentStatus(candidate.contactPointStatus)"
              data-test="decision-candidate-reassignment-indicator"
              role="status"
              aria-label="Reassignment risk decision candidate indicator"
              class="border border-rose-400 px-2 py-0.5 text-xs"
            >
              Reassignment risk
            </span>
          </li>
        </ul>
        <div class="flex flex-wrap gap-2">
          <button
            v-if="decisionPresentation.showAttachAction"
            data-test="attach-existing"
            type="button"
            class="rounded-full border border-slate-300 px-3 py-2 text-sm text-slate-700"
          >
            Attach to suggested match
          </button>
          <button
            v-if="decisionPresentation.showCreateNewAction"
            data-test="create-new"
            type="button"
            class="rounded-full border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            :disabled="!decisionPresentation.createNewAllowed"
          >
            Create new person
          </button>
        </div>
        <p
          v-if="decisionPresentation.mode === 'resolver_required'"
          data-test="resolver-required-message"
          class="text-sm text-slate-600"
        >
          Resolver review is required before creating a new person.
        </p>
      </div>
      <p v-else class="text-sm text-slate-500">No identity decision run yet.</p>
    </div>
  </section>
</template>
