<template>
  <main class="min-h-screen bg-slate-50 px-4 py-6 pb-32 sm:py-8">
    <section class="mx-auto max-w-6xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
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

          <p
            v-if="activeLayoutMarkerTestId"
            :data-testid="activeLayoutMarkerTestId"
            class="mb-4 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600"
          >
            {{ activeLayoutMarkerCopy }}
          </p>

          <div class="grid gap-4" :class="layoutContainerClass">
            <section
              data-testid="connectshyft-queue-panel"
              v-if="!isMobileThreadFullscreen"
              class="space-y-4"
            >
              <label
                for="connectshyft-queue-search-input"
                class="block text-sm font-medium text-slate-700"
              >
                Search queue
              </label>
              <input
                id="connectshyft-queue-search-input"
                v-model="queueSearch"
                data-testid="connectshyft-queue-search-input"
                type="text"
                placeholder="Search summaries or context"
                autocomplete="off"
                :class="[
                  'min-h-[44px] w-full rounded border border-slate-300 px-3 py-2 text-base text-slate-900',
                  focusRingClass,
                ]"
                :style="tapTargetStyle"
              >

              <ul v-if="visibleThreadItems.length > 0" class="space-y-3 text-base text-slate-700">
                <li
                  v-for="item in visibleThreadItems"
                  :key="item.threadId"
                  :data-testid="`connectshyft-thread-card-${item.threadId}`"
                >
                  <ConnectShyftQueueCard
                    :thread-id="item.threadId"
                    :summary="item.display.title"
                    :preview="item.summary"
                    :timestamp-label="formatQueueTimestamp(item.lastActivityAtUtc)"
                    :urgency-label="item.display.urgencyLabel"
                    :context-pills="buildQueueContextPills(item)"
                    :last-inbound-context="`Inbound line: ${item.display.inboundContext}`"
                    :preferred-outbound-context="`Outbound line: ${item.display.outboundContext}`"
                    :state-label="item.display.stateLabel"
                    :voicemail-indicator="item.voicemailIndicator"
                    :voicemail-label="item.display.voicemailLabel"
                    :tap-target-aria-label="`Open thread detail for ${item.display.title || 'selected thread'}`"
                    :focus-ring-class="focusRingClass"
                    :tap-target-style="tapTargetStyle"
                    @open-thread="openThreadSurface"
                  />
                </li>
              </ul>

              <p v-else-if="!threadLoadError" class="text-base text-slate-600">
                No threads are currently available in this bucket.
              </p>

              <section
                v-if="responsiveMode !== 'desktop'"
                class="rounded border border-slate-200 bg-slate-50 p-3"
              >
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

              <div data-testid="connectshyft-inbox-action-bar" class="flex flex-wrap gap-3">
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
            </section>

            <section
              data-testid="connectshyft-thread-panel"
              v-show="showThreadPanel"
              class="rounded-md border border-slate-200 bg-white p-3"
            >
              <button
                v-if="isMobileThreadFullscreen"
                type="button"
                data-testid="connectshyft-thread-panel-back"
                :style="tapTargetStyle"
                :class="[
                  'mb-3 inline-flex min-h-[44px] items-center rounded border border-slate-300 px-3 py-2 text-base font-medium text-slate-700',
                  focusRingClass,
                ]"
                @click="closeThreadSurface"
              >
                Back to queue
              </button>

              <div v-if="selectedThreadItem" data-testid="connectshyft-thread-surface" class="space-y-3">
                <p
                  :data-testid="`connectshyft-responsive-mode-${responsiveMode}`"
                  class="rounded border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600"
                >
                  Responsive mode: {{ responsiveMode }}
                </p>

                <ConnectShyftThreadHeader
                  :title="selectedThreadItem.display.title"
                  :neighbor-context-label="selectedThreadItem.display.neighborContext"
                  :conference-context-label="selectedThreadItem.display.conferenceContext"
                  :state-label="selectedThreadItem.display.stateLabel"
                  :owner-label="selectedThreadItem.state === 'CLAIMED' ? `Owner: ${selectedThreadItem.claimedByUserId || 'unassigned'}` : ''"
                  :escalation-label="selectedThreadItem.display.urgencyLabel"
                  inactivity-label="Inactivity stable"
                  :voicemail-indicator="selectedThreadItem.voicemailIndicator"
                />

                <ConnectShyftMessageBubble
                  title="Conversation summary"
                  :body="selectedThreadItem.summary"
                  :meta-label="formatQueueTimestamp(selectedThreadItem.lastActivityAtUtc)"
                />

                <ConnectShyftVoicemailCard
                  :visible="selectedThreadItem.voicemailIndicator"
                  :label="selectedThreadItem.display.voicemailLabel || 'Voicemail waiting for review'"
                />

                <ConnectShyftThreadActionBar
                  :actions="selectedThreadActions"
                  :action-pending="false"
                  :show-add-neighbor-action="!isViewerRole"
                  :focus-ring-class="focusRingClass"
                  :tap-target-style="tapTargetStyle"
                  @action="handleInlineThreadAction"
                  @add-neighbor="handleInlineAddNeighbor"
                />

                <ConnectShyftComposer
                  v-model="inlineComposerMessage"
                  :disabled="isViewerRole"
                  :submit-disabled="inlineComposerSubmitDisabled"
                  submit-label="Send Message"
                  :focus-ring-class="focusRingClass"
                  :tap-target-style="tapTargetStyle"
                  @submit="handleInlineComposerSubmit"
                />

                <p
                  data-testid="connectshyft-thread-metadata-last-inbound-number"
                  class="text-base text-slate-700"
                >
                  Inbound line: {{ selectedThreadItem.display.inboundContext }}
                </p>
                <p
                  data-testid="connectshyft-thread-metadata-preferred-outbound-number"
                  class="text-base text-slate-700"
                >
                  Outbound line: {{ selectedThreadItem.display.outboundContext }}
                </p>
              </div>

              <p v-else class="text-base text-slate-600">
                Select a thread to view details.
              </p>
            </section>

            <aside
              v-if="responsiveMode === 'desktop' && showThreadPanel"
              data-testid="connectshyft-tertiary-panel"
              class="rounded-md border border-slate-200 bg-slate-50 p-3"
            >
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
                  :key="`desktop-${neighbor.neighborId}`"
                  class="rounded border border-slate-200 bg-white px-3 py-2"
                >
                  <p class="font-medium text-slate-900">
                    {{ neighbor.firstName || 'Neighbor' }} {{ neighbor.lastName }}
                  </p>
                  <div class="mt-1 flex flex-wrap gap-2">
                    <span
                      v-for="phone in neighbor.phones"
                      :key="`desktop-${neighbor.neighborId}-${phone.phoneId}`"
                      data-testid="connectshyft-inbox-shared-phone-indicator"
                      class="rounded px-2 py-1 text-base font-medium"
                      :class="phone.isShared ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'"
                    >
                      {{ phone.label }} · {{ phone.isShared ? 'Shared' : 'Not shared' }}
                    </span>
                  </div>
                </li>
              </ul>
            </aside>
          </div>
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ConnectShyftComposer from '@/components/connectshyft/ConnectShyftComposer.vue';
import ConnectShyftMessageBubble from '@/components/connectshyft/ConnectShyftMessageBubble.vue';
import ConnectShyftPrimaryNav from '@/components/connectshyft/ConnectShyftPrimaryNav.vue';
import ConnectShyftQueueCard from '@/components/connectshyft/ConnectShyftQueueCard.vue';
import ConnectShyftThreadActionBar from '@/components/connectshyft/ConnectShyftThreadActionBar.vue';
import ConnectShyftThreadHeader from '@/components/connectshyft/ConnectShyftThreadHeader.vue';
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
  type ConnectShyftInboxBucket,
  type ConnectShyftInboxActions,
  type ConnectShyftThreadSummary,
} from '@/features/connectshyft/readContracts';
import { ensureConnectShyftThread } from '@/features/connectshyft/threads';
import {
  CONNECTSHYFT_ACCESSIBILITY_LOCKS,
  CONNECTSHYFT_FOCUS_RING_CLASS,
  CONNECTSHYFT_INBOX_ACTION_COPY,
  CONNECTSHYFT_RESPONSIVE_BREAKPOINTS,
  resolveSafeVisibleThreadActions,
  sanitizeConnectShyftOperatorCopy,
} from '@/features/connectshyft/uiContracts';

const DEFAULT_THREAD_NEIGHBOR_ID = 'neighbor-connectshyft-c1-1001';
const DEFAULT_THREAD_INBOUND_NUMBER_ID = 'cs-inbound-c1-001';
const DEFAULT_THREAD_OUTBOUND_NUMBER_ID = 'cs-outbound-c1-001';

const route = useRoute();
const router = useRouter();
const availability = ref({ ...DEFAULT_CONNECTSHYFT_AVAILABILITY });
const neighbors = ref<ConnectShyftNeighbor[]>([]);
const threadItems = ref<ConnectShyftThreadSummary[]>([]);
const threadActions = ref<ConnectShyftInboxActions>({
  claim: false,
  takeover: false,
});
const selectedThreadId = ref<string | null>(null);
const neighborLoadError = ref('');
const threadLoadError = ref('');
const threadActionError = ref('');
const openingConversation = ref(false);
const resolvedInboxOrgUnitId = ref<string | null>(null);
const lastLoadedBucket = ref<ConnectShyftInboxBucket>('inbox');
let threadLoadRequestCounter = 0;
const viewportWidth = ref(
  typeof window === 'undefined'
    ? CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.desktop
    : window.innerWidth,
);
const queueSearch = ref('');
const inlineComposerMessage = ref('');

const normalizeQueryValue = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    return normalizeQueryValue(value[0]);
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const bucket = computed<'inbox' | 'mine'>(() => {
  return route.path.includes('/app/connectshyft/mine') ? 'mine' : 'inbox';
});

const bucketTitle = computed(() => (bucket.value === 'mine' ? 'Mine' : 'Inbox'));
const role = computed(() => {
  const rawRole = normalizeQueryValue(route.query.tenantRole)
    || normalizeQueryValue(route.query.role)
    || '';
  return rawRole.trim().toUpperCase();
});
const isViewerRole = computed(() => role.value === 'TENANT_VIEWER');

const responsiveMode = computed<'mobile' | 'tablet' | 'desktop'>(() => {
  if (viewportWidth.value >= CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.desktop) {
    return 'desktop';
  }

  if (viewportWidth.value >= CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.tablet) {
    return 'tablet';
  }

  return 'mobile';
});

const normalizedQueueSearch = computed(() => queueSearch.value.trim().toLowerCase());
const visibleThreadItems = computed(() => {
  const search = normalizedQueueSearch.value;
  if (!search) {
    return threadItems.value;
  }

  return threadItems.value.filter((item) => {
    const haystack = [
      item.display.title,
      item.summary,
      item.display.urgencyLabel,
      item.display.stateLabel,
      item.display.voicemailLabel,
      item.display.inboundContext,
      item.display.outboundContext,
      item.voicemailIndicator ? 'voicemail' : '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(search);
  });
});

const selectedThreadItem = computed<ConnectShyftThreadSummary | null>(() => {
  if (!selectedThreadId.value) {
    return null;
  }

  return visibleThreadItems.value.find((item) => item.threadId === selectedThreadId.value) || null;
});
const selectedThreadActions = computed<string[]>(() => {
  if (isViewerRole.value || !selectedThreadItem.value) {
    return [];
  }

  const rawActions: string[] = [];
  if (selectedThreadItem.value.state === 'CLAIMED' && threadActions.value.takeover) {
    rawActions.push('Take Over');
  }

  return resolveSafeVisibleThreadActions({
    state: selectedThreadItem.value.state,
    rawActions,
  });
});
const inlineComposerSubmitDisabled = computed(() => {
  const hasSendAction = selectedThreadActions.value.includes('Send Message')
    || selectedThreadActions.value.includes('Text');
  return isViewerRole.value || inlineComposerMessage.value.trim().length === 0 || !hasSendAction;
});

const showThreadPanel = computed(() => selectedThreadItem.value !== null);
const isMobileThreadFullscreen = computed(
  () => responsiveMode.value === 'mobile' && showThreadPanel.value,
);

const activeLayoutMarkerTestId = computed(() => {
  if (!showThreadPanel.value) {
    return '';
  }

  if (responsiveMode.value === 'mobile') {
    return 'connectshyft-layout-mobile-thread-fullscreen';
  }

  if (responsiveMode.value === 'tablet') {
    return 'connectshyft-layout-tablet-split';
  }

  return 'connectshyft-layout-desktop-three-column';
});

const activeLayoutMarkerCopy = computed(() => {
  if (responsiveMode.value === 'mobile') {
    return 'Mobile thread is full-screen while queue remains one tap away.';
  }

  if (responsiveMode.value === 'tablet') {
    return 'Tablet split view keeps queue and thread visible together.';
  }

  return 'Desktop three-column workflow keeps queue, thread, and context visible.';
});

const layoutContainerClass = computed(() => {
  if (responsiveMode.value === 'desktop' && showThreadPanel.value) {
    return 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)]';
  }

  if (responsiveMode.value !== 'mobile' && showThreadPanel.value) {
    return 'md:grid-cols-2';
  }

  return 'grid-cols-1';
});

const focusRingClass = CONNECTSHYFT_FOCUS_RING_CLASS;
const inboxActionCopy = CONNECTSHYFT_INBOX_ACTION_COPY;
const bodyTextStyle = {
  fontSize: `${CONNECTSHYFT_ACCESSIBILITY_LOCKS.minBodyTextPx}px`,
};
const tapTargetStyle = {
  minHeight: `${CONNECTSHYFT_ACCESSIBILITY_LOCKS.minTapTargetPx}px`,
};

const buildQueueContextPills = (item: ConnectShyftThreadSummary): string[] => {
  const pills: string[] = [item.bucket === 'mine' ? 'My queue' : 'Inbox queue'];

  if (item.voicemailIndicator) {
    pills.push('Voicemail');
  }

  if (item.state === 'CLAIMED') {
    pills.push('Assigned');
  }

  if (item.state === 'CLOSED') {
    pills.push('Closed');
  }

  return pills;
};

const formatQueueTimestamp = (rawTimestamp: string): string => {
  const parsed = new Date(rawTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return 'Updated recently';
  }

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const syncSelectedThreadForSurface = (): void => {
  if (visibleThreadItems.value.length === 0) {
    selectedThreadId.value = null;
    return;
  }

  if (
    selectedThreadId.value
    && visibleThreadItems.value.some((item) => item.threadId === selectedThreadId.value)
  ) {
    return;
  }

  selectedThreadId.value = null;
};

const loadThreadContracts = async () => {
  const requestId = threadLoadRequestCounter + 1;
  threadLoadRequestCounter = requestId;
  const requestedBucket = bucket.value;

  if (!availability.value.capabilities.inbox) {
    if (requestId !== threadLoadRequestCounter || requestedBucket !== bucket.value) {
      return;
    }

    threadItems.value = [];
    threadActions.value = {
      claim: false,
      takeover: false,
    };
    resolvedInboxOrgUnitId.value = null;
    threadLoadError.value = '';
    return;
  }

  const readResult = await fetchConnectShyftThreadBucket(requestedBucket);
  if (requestId !== threadLoadRequestCounter || requestedBucket !== bucket.value) {
    return;
  }

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
    syncSelectedThreadForSurface();
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
  const bucketChanged = lastLoadedBucket.value !== bucket.value;
  if (bucketChanged) {
    threadItems.value = [];
    threadActions.value = {
      claim: false,
      takeover: false,
    };
    selectedThreadId.value = null;
  }
  lastLoadedBucket.value = bucket.value;

  availability.value = await fetchConnectShyftAvailability();
  await Promise.all([
    loadThreadContracts(),
    loadNeighbors(),
  ]);
  syncSelectedThreadForSurface();
};

const openThreadSurface = (threadId: string): void => {
  selectedThreadId.value = threadId;
};

const closeThreadSurface = (): void => {
  selectedThreadId.value = null;
};

const handleInlineThreadAction = (action: string): void => {
  void action;
};

const handleInlineAddNeighbor = (): void => {};

const handleInlineComposerSubmit = (): void => {
  inlineComposerMessage.value = '';
};

const updateViewportWidth = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  viewportWidth.value = window.innerWidth;
};

onMounted(() => {
  queueSearch.value = normalizeQueryValue(route.query.queueSearch) || '';
  updateViewportWidth();
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateViewportWidth);
  }
  void refreshInboxSurface();
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportWidth);
  }
});

const refreshRouteKey = computed(() => {
  return [
    route.path,
    normalizeQueryValue(route.query.tenantId) || '',
    normalizeQueryValue(route.query.orgUnitId) || '',
    normalizeQueryValue(route.query.tenantRole) || '',
    normalizeQueryValue(route.query.role) || '',
    normalizeQueryValue(route.query.actorUserId) || '',
    normalizeQueryValue(route.query.userId) || '',
    normalizeQueryValue(route.query.flags) || '',
    normalizeQueryValue(route.query.orgUnitMemberships) || '',
    normalizeQueryValue(route.query.context) || '',
    normalizeQueryValue(route.query.providerKey) || '',
    normalizeQueryValue(route.query.requestedProvider) || '',
    normalizeQueryValue(route.query.provider) || '',
  ].join('|');
});

watch(refreshRouteKey, () => {
  void refreshInboxSurface();
});

watch(
  () => route.query.queueSearch,
  (value) => {
    const next = normalizeQueryValue(value) || '';
    if (next !== queueSearch.value) {
      queueSearch.value = next;
    }
  },
);

watch(queueSearch, (value) => {
  const normalized = value.trim();
  const current = normalizeQueryValue(route.query.queueSearch) || '';
  if (normalized === current) {
    return;
  }

  const nextQuery = { ...route.query };
  if (normalized.length > 0) {
    nextQuery.queueSearch = normalized;
  } else {
    delete nextQuery.queueSearch;
  }

  void router.replace({
    path: route.path,
    query: nextQuery,
  });
});

watch(selectedThreadId, () => {
  inlineComposerMessage.value = '';
});

watch(bucket, () => {
  threadItems.value = [];
  threadActions.value = {
    claim: false,
    takeover: false,
  };
  selectedThreadId.value = null;
}, { flush: 'sync' });

watch([visibleThreadItems, responsiveMode], () => {
  syncSelectedThreadForSurface();
}, { deep: true });

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
</script>
