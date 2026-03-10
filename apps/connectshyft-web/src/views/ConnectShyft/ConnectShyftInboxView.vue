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
          <div
            :data-testid="activeLayoutTestId || undefined"
            class="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
          >
            <section
              data-testid="connectshyft-queue-panel"
              v-show="showQueuePanel"
              class="space-y-4"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 class="text-base font-semibold text-slate-900">
                    {{ bucketTitle }} threads
                  </h2>
                  <p class="mt-1 text-sm text-slate-600">
                    Search and open deterministic ConnectShyft queue work.
                  </p>
                </div>
                <label class="flex flex-col gap-1 text-sm text-slate-700">
                  Queue search
                  <input
                    v-model="queueSearch"
                    data-testid="connectshyft-queue-search-input"
                    aria-label="Queue search"
                    type="search"
                    placeholder="Search threads"
                    class="min-h-[44px] rounded border border-slate-300 px-3 py-2 text-base text-slate-900"
                  >
                </label>
              </div>

              <p
                v-if="threadLoadError"
                data-testid="connectshyft-inbox-load-error"
                class="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-base text-amber-900"
              >
                {{ threadLoadError }}
              </p>

              <p
                v-if="threadActionError"
                class="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-base text-amber-900"
              >
                {{ threadActionError }}
              </p>

              <ul v-if="filteredThreadItems.length > 0" class="space-y-3 text-base text-slate-700">
                <li
                  v-for="item in filteredThreadItems"
                  :key="item.threadId"
                  :data-testid="`connectshyft-thread-card-${item.threadId}`"
                >
                  <ConnectShyftQueueCard
                    :thread-id="item.threadId"
                    :summary="item.summary || item.threadId"
                    :preview="item.preview || item.summary || 'No preview available'"
                    :timestamp-label="item.lastActivityAtUtc || 'Now'"
                    :urgency-label="item.urgencyLabel || ''"
                    :context-pills="[item.bucket === 'mine' ? 'Mine' : 'Inbox']"
                    :last-inbound-context="item.lastInboundContext || `Last inbound number: ${item.lastInboundCsNumberId || 'n/a'}`"
                    :preferred-outbound-context="item.preferredOutboundContextLabel || `Preferred outbound number: ${item.preferredOutboundCsNumberId || 'n/a'}`"
                    :state-label="item.stateLabel || item.state"
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

              <p v-else-if="!threadLoadError" class="text-base text-slate-600">
                No threads are currently available in this bucket.
              </p>

              <section
                :data-testid="isDesktopViewport && isThreadSurfaceVisible ? 'connectshyft-tertiary-panel' : undefined"
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
                  :disabled="!canUseOutboundInboxActions"
                  @click="openSendMessageModal"
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
                  :data-testid="inboxActionCopy.makeCall.testId"
                  :aria-label="inboxActionCopy.makeCall.ariaLabel"
                  :disabled="!canUseOutboundInboxActions"
                  @click="openMakeCallModal"
                  :style="tapTargetStyle"
                  :class="[
                    'min-h-[44px] rounded bg-slate-700 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400',
                    focusRingClass,
                  ]"
                >
                  {{ inboxActionCopy.makeCall.label }}
                </button>
              </div>

              <section
                v-if="sendMessageModalOpen"
                data-testid="connectshyft-send-message-modal"
                class="space-y-3 rounded border border-slate-300 bg-slate-50 p-4"
              >
                <h3 class="text-base font-semibold text-slate-900">Send Message</h3>
                <fieldset class="space-y-2">
                  <legend class="text-base text-slate-700">Choose a phone number</legend>
                  <label
                    v-for="phoneOption in inboxActionPhoneOptions"
                    :key="`message-${phoneOption.id}`"
                    class="flex items-center gap-2 text-base text-slate-700"
                  >
                    <input
                      data-testid="connectshyft-send-message-phone-option"
                      v-model="selectedDispatchPhone"
                      type="radio"
                      name="connectshyft-send-message-phone"
                      :value="phoneOption.value"
                    >
                    <span>{{ phoneOption.label }}</span>
                  </label>
                </fieldset>
                <label class="block text-base text-slate-700" for="connectshyft-send-message-body-input">
                  Message
                </label>
                <textarea
                  id="connectshyft-send-message-body-input"
                  v-model="inboxMessageBody"
                  data-testid="connectshyft-send-message-body-input"
                  rows="3"
                  class="w-full rounded border border-slate-300 px-3 py-2 text-base text-slate-900"
                />
                <div class="flex flex-wrap gap-3">
                  <button
                    type="button"
                    data-testid="connectshyft-send-message-modal-submit"
                    :disabled="!canSubmitSendMessage"
                    :style="tapTargetStyle"
                    :class="[
                      'min-h-[44px] rounded bg-slate-900 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400',
                      focusRingClass,
                    ]"
                    @click="submitSendMessage"
                  >
                    {{ inboxActionPending ? 'Sending...' : 'Send Message' }}
                  </button>
                  <button
                    type="button"
                    :style="tapTargetStyle"
                    :class="[
                      'min-h-[44px] rounded border border-slate-300 px-4 py-2 text-base font-medium text-slate-700',
                      focusRingClass,
                    ]"
                    @click="closeInboxActionModals"
                  >
                    Cancel
                  </button>
                </div>
              </section>

              <section
                v-if="makeCallModalOpen"
                data-testid="connectshyft-make-call-modal"
                class="space-y-3 rounded border border-slate-300 bg-slate-50 p-4"
              >
                <h3 class="text-base font-semibold text-slate-900">Make Call</h3>
                <fieldset class="space-y-2">
                  <legend class="text-base text-slate-700">Choose a phone number</legend>
                  <label
                    v-for="phoneOption in inboxActionPhoneOptions"
                    :key="`call-${phoneOption.id}`"
                    class="flex items-center gap-2 text-base text-slate-700"
                  >
                    <input
                      data-testid="connectshyft-make-call-phone-option"
                      v-model="selectedDispatchPhone"
                      type="radio"
                      name="connectshyft-make-call-phone"
                      :value="phoneOption.value"
                    >
                    <span>{{ phoneOption.label }}</span>
                  </label>
                </fieldset>
                <div class="flex flex-wrap gap-3">
                  <button
                    type="button"
                    data-testid="connectshyft-make-call-modal-submit"
                    :disabled="!canSubmitCall"
                    :style="tapTargetStyle"
                    :class="[
                      'min-h-[44px] rounded bg-slate-900 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400',
                      focusRingClass,
                    ]"
                    @click="submitMakeCall"
                  >
                    {{ inboxActionPending ? 'Calling...' : 'Make Call' }}
                  </button>
                  <button
                    type="button"
                    :style="tapTargetStyle"
                    :class="[
                      'min-h-[44px] rounded border border-slate-300 px-4 py-2 text-base font-medium text-slate-700',
                      focusRingClass,
                    ]"
                    @click="closeInboxActionModals"
                  >
                    Cancel
                  </button>
                </div>
              </section>
            </section>

            <section
              v-if="selectedThreadSummary && isThreadSurfaceVisible"
              data-testid="connectshyft-thread-panel"
              class="space-y-3 rounded border border-slate-200 bg-slate-50 p-3"
            >
              <button
                v-if="isMobileViewport"
                type="button"
                data-testid="connectshyft-thread-panel-back"
                :style="tapTargetStyle"
                :class="[
                  'inline-flex min-h-[44px] w-fit items-center justify-center rounded border border-slate-300 px-4 py-2 text-base font-medium text-slate-700',
                  focusRingClass,
                ]"
                @click="closeThreadPanel"
              >
                Back to queue
              </button>

              <div data-testid="connectshyft-thread-surface" class="space-y-3">
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
                  :disabled="inboxActionPending"
                  :submit-disabled="previewComposerBody.trim().length === 0"
                  submit-label="Send Message"
                  :focus-ring-class="focusRingClass"
                  :tap-target-style="tapTargetStyle"
                  @submit="submitPreviewComposer"
                />
              </div>
            </section>
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
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
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
  type ConnectShyftNeighborPhone,
} from '@/features/connectshyft/neighbors';
import {
  fetchConnectShyftThreadBucket,
  type ConnectShyftThreadSummary,
} from '@/features/connectshyft/readContracts';
import {
  dispatchConnectShyftThreadCall,
  dispatchConnectShyftThreadMessage,
  ensureConnectShyftThread,
} from '@/features/connectshyft/threads';
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
const router = useRouter();
const availability = ref({ ...DEFAULT_CONNECTSHYFT_AVAILABILITY });
const neighbors = ref<ConnectShyftNeighbor[]>([]);
const threadItems = ref<ConnectShyftThreadSummary[]>([]);
const neighborLoadError = ref('');
const threadLoadError = ref('');
const threadActionError = ref('');
const openingConversation = ref(false);
const resolvedInboxOrgUnitId = ref<string | null>(null);
const selectedThreadId = ref<string | null>(null);
const previewComposerBody = ref('');
const sendMessageModalOpen = ref(false);
const makeCallModalOpen = ref(false);
const inboxMessageBody = ref('');
const selectedDispatchPhone = ref('');
const inboxActionPending = ref(false);
const viewportWidth = ref(typeof window === 'undefined' ? 1280 : window.innerWidth);

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

const syncViewportWidth = (): void => {
  viewportWidth.value = typeof window === 'undefined' ? 1280 : window.innerWidth;
};

const formatInboxActionPhoneLabel = (
  neighbor: ConnectShyftNeighbor,
  phone: ConnectShyftNeighborPhone,
): string => {
  const neighborName = `${neighbor.firstName || 'Neighbor'} ${neighbor.lastName || ''}`.trim();
  return `${neighborName} · ${phone.label || 'phone'} · ${phone.value}`;
};

const loadThreadContracts = async () => {
  if (!availability.value.capabilities.inbox) {
    threadItems.value = [];
    resolvedInboxOrgUnitId.value = null;
    threadLoadError.value = '';
    return;
  }

  const readResult = await fetchConnectShyftThreadBucket(bucket.value);
  if (!readResult.ok) {
    threadItems.value = [];
    resolvedInboxOrgUnitId.value = null;
    threadLoadError.value = sanitizeConnectShyftOperatorCopy(
      readResult.message,
      'Unable to load ConnectShyft threads.',
    );
    return;
  }

  threadItems.value = readResult.items;
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

const queueSearch = computed({
  get: (): string => {
    const rawValue = typeof route.query.queueSearch === 'string'
      ? route.query.queueSearch
      : null;
    return normalizeQueryValue(rawValue) || '';
  },
  set: (value: string) => {
    const normalized = value.trim();
    const nextQuery: LocationQueryRaw = {
      ...route.query,
    };

    if (normalized.length > 0) {
      nextQuery.queueSearch = normalized;
    } else {
      delete nextQuery.queueSearch;
    }

    void router.replace({
      path: route.path,
      query: nextQuery,
    });
  },
});

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
  syncViewportWidth();
  window.addEventListener('resize', syncViewportWidth);
  void refreshInboxSurface();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewportWidth);
});

watch(
  () => route.fullPath,
  () => {
    closeInboxActionModals();
    closeThreadPanel();
    void refreshInboxSurface();
  },
);

const moduleAvailable = computed(() => availability.value.capabilities.module);
const inboxAvailable = computed(() => availability.value.capabilities.inbox);
const escalationAvailable = computed(() => availability.value.capabilities.escalation);
const webhooksAvailable = computed(() => availability.value.capabilities.webhooks);
const isMobileViewport = computed(() => viewportWidth.value < 768);
const isTabletViewport = computed(() => viewportWidth.value >= 768 && viewportWidth.value < 1024);
const isDesktopViewport = computed(() => viewportWidth.value >= 1024);
const filteredThreadItems = computed(() => {
  const searchTerm = queueSearch.value.trim().toLowerCase();
  if (!searchTerm) {
    return threadItems.value;
  }

  return threadItems.value.filter((item) => {
    const searchableCopy = [
      item.summary,
      item.preview,
      item.stateLabel,
      item.urgencyLabel,
      item.voicemailLabel,
      item.lastInboundContext,
      item.preferredOutboundContextLabel,
    ]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' ')
      .toLowerCase();

    return searchableCopy.includes(searchTerm);
  });
});
const selectedThreadSummary = computed(() => {
  if (!selectedThreadId.value) {
    return filteredThreadItems.value[0] || null;
  }

  return filteredThreadItems.value.find((item) => item.threadId === selectedThreadId.value)
    || filteredThreadItems.value[0]
    || null;
});
const inboxActionPhoneOptions = computed(() => {
  const seenValues = new Set<string>();

  return neighbors.value.flatMap((neighbor) =>
    neighbor.phones
      .filter((phone) => phone.value.trim().length > 0)
      .filter((phone) => {
        if (seenValues.has(phone.value)) {
          return false;
        }

        seenValues.add(phone.value);
        return true;
      })
      .map((phone) => ({
        id: `${neighbor.neighborId}:${phone.phoneId}`,
        value: phone.value,
        label: formatInboxActionPhoneLabel(neighbor, phone),
      })));
});
const canUseOutboundInboxActions = computed(() =>
  !isViewerRole.value
  && selectedThreadSummary.value !== null
  && !inboxActionPending.value,
);
const canSubmitSendMessage = computed(() =>
  canUseOutboundInboxActions.value
  && selectedDispatchPhone.value.trim().length > 0
  && inboxMessageBody.value.trim().length > 0,
);
const canSubmitCall = computed(() =>
  canUseOutboundInboxActions.value
  && selectedDispatchPhone.value.trim().length > 0,
);
const isThreadSurfaceVisible = computed(() =>
  selectedThreadSummary.value !== null
  && (selectedThreadId.value !== null || !isMobileViewport.value),
);
const showQueuePanel = computed(() => !isMobileViewport.value || !isThreadSurfaceVisible.value);
const activeLayoutTestId = computed(() => {
  if (!isThreadSurfaceVisible.value) {
    return '';
  }

  if (isDesktopViewport.value) {
    return 'connectshyft-layout-desktop-three-column';
  }

  if (isTabletViewport.value) {
    return 'connectshyft-layout-tablet-split';
  }

  return 'connectshyft-layout-mobile-thread-fullscreen';
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

const applyDefaultDispatchPhone = (): void => {
  selectedDispatchPhone.value = inboxActionPhoneOptions.value[0]?.value || '';
};

const closeInboxActionModals = (): void => {
  sendMessageModalOpen.value = false;
  makeCallModalOpen.value = false;
  inboxMessageBody.value = '';
  selectedDispatchPhone.value = '';
};

const openThreadById = (threadId: string): void => {
  selectedThreadId.value = threadId;
};

const closeThreadPanel = (): void => {
  selectedThreadId.value = null;
};

const openSendMessageModal = (): void => {
  if (!canUseOutboundInboxActions.value) {
    return;
  }

  threadActionError.value = '';
  makeCallModalOpen.value = false;
  sendMessageModalOpen.value = true;
  applyDefaultDispatchPhone();
};

const openMakeCallModal = (): void => {
  if (!canUseOutboundInboxActions.value) {
    return;
  }

  threadActionError.value = '';
  sendMessageModalOpen.value = false;
  makeCallModalOpen.value = true;
  applyDefaultDispatchPhone();
};

const handlePreviewAction = (_action: string): void => {
  if (!selectedThreadSummary.value) {
    return;
  }

  selectedThreadId.value = selectedThreadSummary.value.threadId;
};

const submitPreviewComposer = async (): Promise<void> => {
  if (!selectedThreadSummary.value || previewComposerBody.value.trim().length === 0) {
    return;
  }

  inboxActionPending.value = true;
  threadActionError.value = '';

  try {
    const result = await dispatchConnectShyftThreadMessage({
      threadId: selectedThreadSummary.value.threadId,
      orgUnitId: selectedThreadSummary.value.orgUnitId,
      body: previewComposerBody.value,
    });

    if (!result.ok) {
      threadActionError.value = sanitizeConnectShyftOperatorCopy(
        result.message,
        'Unable to send the message right now.',
      );
      return;
    }

    previewComposerBody.value = '';
    await loadThreadContracts();
  } finally {
    inboxActionPending.value = false;
  }
};

const submitSendMessage = async (): Promise<void> => {
  if (!selectedThreadSummary.value || !canSubmitSendMessage.value) {
    return;
  }

  inboxActionPending.value = true;
  threadActionError.value = '';

  try {
    const result = await dispatchConnectShyftThreadMessage({
      threadId: selectedThreadSummary.value.threadId,
      orgUnitId: selectedThreadSummary.value.orgUnitId,
      body: inboxMessageBody.value,
      targetPhone: selectedDispatchPhone.value,
    });

    if (!result.ok) {
      threadActionError.value = sanitizeConnectShyftOperatorCopy(
        result.message,
        'Unable to send the message right now.',
      );
      return;
    }

    closeInboxActionModals();
    await loadThreadContracts();
  } finally {
    inboxActionPending.value = false;
  }
};

const submitMakeCall = async (): Promise<void> => {
  if (!selectedThreadSummary.value || !canSubmitCall.value) {
    return;
  }

  inboxActionPending.value = true;
  threadActionError.value = '';

  try {
    const result = await dispatchConnectShyftThreadCall({
      threadId: selectedThreadSummary.value.threadId,
      orgUnitId: selectedThreadSummary.value.orgUnitId,
      targetPhone: selectedDispatchPhone.value,
    });

    if (!result.ok) {
      threadActionError.value = sanitizeConnectShyftOperatorCopy(
        result.message,
        'Unable to place the call right now.',
      );
      return;
    }

    closeInboxActionModals();
    await loadThreadContracts();
  } finally {
    inboxActionPending.value = false;
  }
};
</script>
