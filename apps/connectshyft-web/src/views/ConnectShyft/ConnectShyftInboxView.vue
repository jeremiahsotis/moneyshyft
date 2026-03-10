<template>
  <main class="min-h-screen bg-slate-50 px-4 py-6 pb-32 sm:py-8">
    <section class="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header class="mb-6">
        <h1 v-if="showUnavailableState" class="text-2xl font-semibold text-slate-900">
          ConnectShyft unavailable
        </h1>
        <h1 v-else class="text-2xl font-semibold text-slate-900">
          ConnectShyft {{ bucketTitle }}
        </h1>

        <p
          v-if="showUnavailableState"
          data-testid="connectshyft-unavailable-state"
          :style="bodyTextStyle"
          class="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900"
        >
          {{ unavailableMessage }}
        </p>
      </header>

      <section class="mb-6 rounded-md border border-slate-200 p-4">
        <h2 class="mb-3 text-base font-semibold uppercase tracking-wide text-slate-500">
          Capability Status
        </h2>
        <dl class="grid grid-cols-1 gap-3 text-base text-slate-700 md:grid-cols-3">
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
        :style="bodyTextStyle"
        class="mb-6 rounded-md border border-slate-200 bg-slate-100 px-4 py-3 text-base text-slate-700"
      >
        {{ maintenanceBanner }}
      </p>

      <section
        v-if="inboxAvailable"
        data-testid="connectshyft-inbox-list"
        class="rounded-md border border-slate-200 p-4"
      >
        <div data-testid="connectshyft-inbox-surface" :style="bodyTextStyle">
          <h2 class="mb-3 text-base font-semibold text-slate-900">
            {{ bucketTitle }} threads
          </h2>

          <p
            v-if="threadLoadError"
            data-testid="connectshyft-inbox-load-error"
            class="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-base text-amber-900"
          >
            {{ threadLoadError }}
          </p>

          <p
            v-if="threadActionError"
            class="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-base text-amber-900"
          >
            {{ threadActionError }}
          </p>

          <ul v-if="threadItems.length > 0" class="mb-4 space-y-3 text-base text-slate-700">
            <li
              v-for="item in threadItems"
              :key="item.threadId"
              :data-testid="`connectshyft-thread-card-${item.threadId}`"
            >
              <ConnectShyftQueueCard
                :thread-id="item.threadId"
                :summary="item.summary || item.threadId"
                :preview="item.summary || 'No preview available'"
                :timestamp-label="item.lastActivityAtUtc || 'Now'"
                :urgency-label="item.urgencyLabel || ''"
                :context-pills="[item.bucket === 'mine' ? 'Mine' : 'Inbox']"
                :last-inbound-context="`Last inbound number: ${item.lastInboundCsNumberId || 'n/a'}`"
                :preferred-outbound-context="`Preferred outbound number: ${item.preferredOutboundCsNumberId || 'n/a'}`"
                :state-label="item.state"
                :voicemail-indicator="item.voicemailIndicator === true"
                :voicemail-label="item.voicemailLabel || ''"
                :thread-path="buildThreadDetailPath(item.threadId)"
                :tap-target-aria-label="`Open thread detail for ${item.summary || 'selected thread'}`"
                :focus-ring-class="focusRingClass"
                :tap-target-style="tapTargetStyle"
                @open-thread="openThreadById"
              />
            </li>
          </ul>

          <p v-else-if="!threadLoadError" class="mb-4 text-base text-slate-600">
            No threads are currently available in this bucket.
          </p>

          <section class="mb-4 rounded border border-slate-200 bg-slate-50 p-3">
            <h3 class="text-base font-semibold text-slate-900">Shared identity context</h3>
            <p class="mt-1 text-base text-slate-600">
              Shared-phone indicators remain consistent across orgUnits in this tenant.
            </p>

            <p
              v-if="neighborLoadError"
              class="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-base text-amber-900"
            >
              {{ neighborLoadError }}
            </p>

            <ul v-else class="mt-3 space-y-2 text-base text-slate-700">
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
                    class="rounded px-2 py-1 text-base font-medium"
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
              :data-testid="inboxActionCopy.openConversation.testId"
              :aria-label="inboxActionCopy.openConversation.ariaLabel"
              :disabled="openingConversation"
              @click="openConversation"
              :style="tapTargetStyle"
              :class="[
                'min-h-[44px] rounded bg-slate-900 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400',
                focusRingClass,
              ]"
            >
              {{ openingConversation ? 'Opening...' : inboxActionCopy.openConversation.label }}
            </button>
            <RouterLink
              v-if="!isViewerRole"
              :to="buildNeighborCreatePath()"
              :data-testid="inboxActionCopy.addNeighbor.testId"
              :aria-label="inboxActionCopy.addNeighbor.ariaLabel"
              :style="tapTargetStyle"
              :class="[
                'inline-flex min-h-[44px] items-center justify-center rounded bg-emerald-700 px-4 py-2 text-base font-medium text-white',
                focusRingClass,
              ]"
            >
              {{ inboxActionCopy.addNeighbor.label }}
            </RouterLink>
            <button
              type="button"
              :data-testid="inboxActionCopy.composeMessage.testId"
              :aria-label="inboxActionCopy.composeMessage.ariaLabel"
              :style="tapTargetStyle"
              :class="[
                'min-h-[44px] rounded bg-slate-700 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400',
                focusRingClass,
              ]"
            >
              {{ inboxActionCopy.composeMessage.label }}
            </button>
            <button
              type="button"
              :data-testid="inboxActionCopy.claimThread.testId"
              :aria-label="inboxActionCopy.claimThread.ariaLabel"
              :disabled="!canClaimThread"
              :style="tapTargetStyle"
              :class="[
                'min-h-[44px] rounded bg-blue-600 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400',
                focusRingClass,
              ]"
            >
              {{ inboxActionCopy.claimThread.label }}
            </button>
            <button
              type="button"
              :data-testid="inboxActionCopy.takeoverThread.testId"
              :aria-label="inboxActionCopy.takeoverThread.ariaLabel"
              :disabled="!canTakeoverThread"
              :style="tapTargetStyle"
              :class="[
                'min-h-[44px] rounded bg-indigo-600 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400',
                focusRingClass,
              ]"
            >
              {{ inboxActionCopy.takeoverThread.label }}
            </button>
          </div>

          <section
            v-if="selectedThreadSummary"
            class="mt-4 space-y-3 rounded border border-slate-200 bg-slate-50 p-3"
          >
            <ConnectShyftThreadActionBar
              :actions="['Call', 'Send Message']"
              :action-pending="openingConversation"
              :show-add-neighbor-action="!isViewerRole"
              :focus-ring-class="focusRingClass"
              :tap-target-style="tapTargetStyle"
              @action="handlePreviewAction"
              @add-neighbor="openConversation"
            />
            <ConnectShyftMessageBubble
              title="Thread preview"
              :body="selectedThreadSummary.summary || selectedThreadSummary.threadId"
              :meta-label="selectedThreadSummary.lastActivityAtUtc || ''"
              tone="inbound"
            />
            <ConnectShyftVoicemailCard
              :visible="selectedThreadSummary.voicemailIndicator === true"
              :label="selectedThreadSummary.voicemailLabel || 'Voicemail waiting'"
            />
            <ConnectShyftComposer
              v-model="previewComposerBody"
              :disabled="openingConversation"
              :submit-disabled="previewComposerBody.trim().length === 0"
              submit-label="Queue Draft"
              :focus-ring-class="focusRingClass"
              :tap-target-style="tapTargetStyle"
              @submit="submitPreviewComposer"
            />
          </section>
        </div>
      </section>

      <p
        data-testid="connectshyft-live-region-status"
        aria-live="polite"
        class="sr-only"
      >
        {{ liveRegionStatus }}
      </p>
    </section>

    <ConnectShyftPrimaryNav />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import ConnectShyftComposer from '@/components/connectshyft/ConnectShyftComposer.vue';
import ConnectShyftMessageBubble from '@/components/connectshyft/ConnectShyftMessageBubble.vue';
import ConnectShyftPrimaryNav from '@/components/connectshyft/ConnectShyftPrimaryNav.vue';
import ConnectShyftQueueCard from '@/components/connectshyft/ConnectShyftQueueCard.vue';
import ConnectShyftThreadActionBar from '@/components/connectshyft/ConnectShyftThreadActionBar.vue';
import ConnectShyftVoicemailCard from '@/components/connectshyft/ConnectShyftVoicemailCard.vue';
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
import { ensureConnectShyftThread } from '@/features/connectshyft/threads';
import {
  CONNECTSHYFT_ACCESSIBILITY_LOCKS,
  CONNECTSHYFT_FOCUS_RING_CLASS,
  CONNECTSHYFT_INBOX_ACTION_COPY,
  sanitizeConnectShyftOperatorCopy,
} from '@/features/connectshyft/uiContracts';

const DEFAULT_THREAD_NEIGHBOR_ID = 'neighbor-connectshyft-c1-1001';
const DEFAULT_THREAD_INBOUND_NUMBER_ID = 'cs-inbound-c1-001';
const DEFAULT_THREAD_OUTBOUND_NUMBER_ID = 'cs-outbound-c1-001';

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
const threadActionError = ref('');
const openingConversation = ref(false);
const resolvedInboxOrgUnitId = ref<string | null>(null);
const selectedThreadId = ref<string | null>(null);
const previewComposerBody = ref('');

const bucket = computed<'inbox' | 'mine'>(() => {
  return route.path.includes('/app/connectshyft/mine') ? 'mine' : 'inbox';
});

const bucketTitle = computed(() => (bucket.value === 'mine' ? 'Mine' : 'Inbox'));
const role = computed(() => {
  const rawRole = typeof route.query.tenantRole === 'string'
    ? route.query.tenantRole
    : typeof route.query.role === 'string'
      ? route.query.role
      : '';
  return rawRole.trim().toUpperCase();
});
const isViewerRole = computed(() => role.value === 'TENANT_VIEWER');
const focusRingClass = CONNECTSHYFT_FOCUS_RING_CLASS;
const inboxActionCopy = CONNECTSHYFT_INBOX_ACTION_COPY;
const bodyTextStyle = {
  fontSize: `${CONNECTSHYFT_ACCESSIBILITY_LOCKS.minBodyTextPx}px`,
};
const tapTargetStyle = {
  minHeight: `${CONNECTSHYFT_ACCESSIBILITY_LOCKS.minTapTargetPx}px`,
};

const loadThreadContracts = async () => {
  if (!availability.value.capabilities.inbox) {
    threadItems.value = [];
    threadActions.value = {
      claim: false,
      takeover: false,
    };
    resolvedInboxOrgUnitId.value = null;
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
    resolvedInboxOrgUnitId.value = null;
    threadLoadError.value = sanitizeConnectShyftOperatorCopy(
      readResult.message,
      'Unable to load ConnectShyft threads.',
    );
    return;
  }

  threadItems.value = readResult.items;
  threadActions.value = readResult.actions;
  resolvedInboxOrgUnitId.value = readResult.context?.orgUnitId
    || readResult.items[0]?.orgUnitId
    || null;
  threadLoadError.value = '';
};

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
  const query = typeof window === 'undefined'
    ? new URLSearchParams()
    : new URLSearchParams(window.location.search);
  const contextMode = normalizeQueryValue(query.get('context'));
  const queryOrgUnitId = contextMode === 'missing-orgunit'
    ? null
    : normalizeQueryValue(query.get('orgUnitId'));
  const orgUnitId = queryOrgUnitId
    || resolvedInboxOrgUnitId.value
    || threadItems.value[0]?.orgUnitId
    || null;

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

const openConversation = async (): Promise<void> => {
  const context = resolveInboxContext();
  if (!context.orgUnitId) {
    threadActionError.value = 'Select an orgUnit before opening a ConnectShyft conversation.';
    return;
  }

  openingConversation.value = true;
  threadActionError.value = '';

  try {
    const ensureResult = await ensureConnectShyftThread({
      orgUnitId: context.orgUnitId,
      neighborId: context.neighborId,
      source: 'VOICE',
      lastInboundCsNumberId: context.lastInboundCsNumberId,
      preferredOutboundCsNumberId: context.preferredOutboundCsNumberId,
    });

    if (!ensureResult.ok) {
      threadActionError.value = sanitizeConnectShyftOperatorCopy(
        ensureResult.message,
        'Unable to open a conversation right now.',
      );
      return;
    }

    await loadThreadContracts();
  } finally {
    openingConversation.value = false;
  }
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
    neighborLoadError.value = sanitizeConnectShyftOperatorCopy(
      listResult.message,
      'Unable to load neighbor context.',
    );
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
const selectedThreadSummary = computed(() => {
  if (!selectedThreadId.value) {
    return threadItems.value[0] || null;
  }

  return threadItems.value.find((item) => item.threadId === selectedThreadId.value) || threadItems.value[0] || null;
});

const showUnavailableState = computed(() => !moduleAvailable.value || !inboxAvailable.value);

const unavailableMessage = computed(() => {
  if (availability.value.refusal?.message) {
    return availability.value.refusal.message;
  }

  if (!moduleAvailable.value) {
    if (availability.value.entitlement && availability.value.entitlement.enabled === false) {
      return 'ConnectShyft module entitlement is disabled for this tenant.';
    }

    return 'ConnectShyft is currently unavailable for this tenant. Contact an administrator to restore access.';
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

const liveRegionStatus = computed(() => {
  if (threadActionError.value) {
    return `Refusal feedback. ${threadActionError.value}`;
  }
  if (threadLoadError.value) {
    return `Error feedback. ${threadLoadError.value}`;
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

const buildNeighborCreatePath = (): string => {
  if (typeof window === 'undefined') {
    return '/app/connectshyft/neighbors/new';
  }

  const currentQuery = new URLSearchParams(window.location.search);
  const queryString = currentQuery.toString();
  const basePath = '/app/connectshyft/neighbors/new';

  return queryString.length > 0
    ? `${basePath}?${queryString}`
    : basePath;
};

const openThreadById = (threadId: string): void => {
  selectedThreadId.value = threadId;
};

const handlePreviewAction = (_action: string): void => {
  if (!selectedThreadSummary.value) {
    return;
  }

  selectedThreadId.value = selectedThreadSummary.value.threadId;
};

const submitPreviewComposer = (): void => {
  if (previewComposerBody.value.trim().length === 0) {
    return;
  }

  previewComposerBody.value = '';
};
</script>
