<template>
  <main class="cs-page-shell">
    <section class="cs-page-shell__inner cs-stack">
      <SurfaceCard padding="default" panel tone="soft">
        <SectionHeader
          :eyebrow="bucketTitle"
          :title="showUnavailableState ? 'ConnectShyft unavailable' : queueHeading"
          :description="showUnavailableState ? '' : queueSummaryText"
          size="md"
        />

        <p
          v-if="showUnavailableState"
          data-testid="connectshyft-unavailable-state"
          :style="bodyTextStyle"
          class="cs-shell-notice cs-shell-notice--warning mt-4"
        >
          {{ unavailableMessage }}
        </p>
      </SurfaceCard>

      <div class="sr-only">
        <span data-testid="connectshyft-capability-inbox">
          {{ inboxAvailable ? 'Available' : 'Unavailable' }}
        </span>
        <span data-testid="connectshyft-capability-escalation">
          {{ escalationAvailable ? 'Available' : 'Unavailable' }}
        </span>
        <span data-testid="connectshyft-capability-webhooks">
          {{ webhooksAvailable ? 'Available' : 'Unavailable' }}
        </span>
      </div>

      <p
        v-if="maintenanceBanner"
        data-testid="connectshyft-capability-maintenance-banner"
        :style="bodyTextStyle"
        class="cs-shell-notice cs-shell-notice--warning"
      >
        {{ maintenanceBanner }}
      </p>

      <section
        v-if="inboxAvailable"
        data-testid="connectshyft-inbox-list"
      >
        <div data-testid="connectshyft-inbox-surface" :style="bodyTextStyle">
          <div
            :data-testid="activeLayoutTestId || undefined"
            :class="[
              'cs-panel-layout',
              isDesktopViewport && isThreadSurfaceVisible
                ? 'cs-panel-layout--queue-thread-rail'
                : isTabletViewport && isThreadSurfaceVisible
                  ? 'cs-panel-layout--two-column'
                  : '',
            ]"
          >
            <SurfaceCard
              data-testid="connectshyft-queue-panel"
              v-show="showQueuePanel"
              padding="default"
              panel
              tone="soft"
            >
              <div class="flex flex-col gap-4">
                <SectionHeader
                  :eyebrow="bucketTitle"
                  :title="queueHeading"
                  description="Search first, then open the conversation that needs the next response."
                  size="md"
                />

                <SearchField
                  v-model="queueSearch"
                  test-id="connectshyft-queue-search-input"
                  aria-label="Queue search"
                  label="Search conversations"
                  placeholder="Search by name, phone, or the latest update"
                />

                <p
                  v-if="threadLoadError"
                  data-testid="connectshyft-inbox-load-error"
                  class="cs-shell-notice cs-shell-notice--warning"
                >
                  {{ threadLoadError }}
                </p>

                <p
                  v-if="threadActionFeedback || threadActionError"
                  data-testid="connectshyft-inbox-action-feedback"
                  :data-feedback-taxonomy="threadActionFeedback?.taxonomy || 'refusal'"
                  class="cs-shell-notice text-base"
                  :class="threadActionFeedbackClass"
                >
                  {{ threadActionFeedback ? threadActionFeedback.message : threadActionError }}
                </p>

                <div v-if="threadActionFailure" class="sr-only">
                  <span data-testid="connectshyft-inbox-action-failure-code">
                    {{ threadActionFailure.code }}
                  </span>
                  <span data-testid="connectshyft-inbox-action-failure-kind">
                    {{ threadActionFailure.failureKind }}
                  </span>
                  <span data-testid="connectshyft-inbox-action-failure-ui-feedback">
                    {{ threadActionUiFeedbackMessage }}
                  </span>
                  <span data-testid="connectshyft-inbox-action-failure-preference-policy">
                    {{ threadActionPreferencePolicyState }}
                  </span>
                </div>

                <p
                  v-if="neighborLoadError"
                  class="cs-shell-notice cs-shell-notice--warning"
                >
                  {{ neighborLoadError }}
                </p>

                <ul v-if="filteredThreadItems.length > 0" class="space-y-3 text-base text-slate-700">
                  <li
                    v-for="item in filteredThreadItems"
                    :key="item.threadId"
                    :data-testid="`connectshyft-thread-card-${item.threadId}`"
                  >
                    <ConnectShyftQueueCard
                      :thread-id="item.threadId"
                      :title="resolveThreadCardTitle(item)"
                      :conference-label="resolveThreadConferenceLabel(item)"
                      :claim-label="resolveThreadClaimLabel(item)"
                      :preview="resolveThreadPreview(item)"
                      :timestamp-label="formatThreadTimestamp(item.lastActivityAtUtc)"
                      :urgency-label="item.urgencyLabel || ''"
                      :context-pills="[item.bucket === 'mine' ? 'Assigned' : 'Inbox']"
                      :phone-indicators="resolveThreadPhoneIndicators(item)"
                      :last-inbound-context="item.lastInboundContext || 'Inbound line unavailable'"
                      :preferred-outbound-context="item.preferredOutboundContextLabel || 'Outbound line unavailable'"
                      :state-label="item.stateLabel || item.state"
                      :voicemail-indicator="item.voicemailIndicator === true"
                      :voicemail-label="item.voicemailLabel || ''"
                      :thread-path="buildThreadDetailPath(item.threadId)"
                      :tap-target-aria-label="`Open thread detail for ${resolveThreadCardTitle(item)}`"
                      :focus-ring-class="focusRingClass"
                      :tap-target-style="tapTargetStyle"
                      :selected="selectedThreadSummary?.threadId === item.threadId"
                      @open-thread="openThreadById"
                    />
                  </li>
                </ul>

                <ul
                  v-else-if="directoryFallbackItems.length > 0"
                  class="space-y-3 text-base text-slate-700"
                >
                  <li
                    v-for="neighbor in directoryFallbackItems"
                    :key="neighbor.neighborId"
                    :data-testid="`connectshyft-neighbor-fallback-${neighbor.neighborId}`"
                  >
                    <SurfaceCard
                      class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
                      padding="compact"
                      interactive
                    >
                      <div class="min-w-0 flex-1">
                        <p class="cs-heading-md">
                          {{ resolveNeighborFallbackName(neighbor) }}
                        </p>
                        <p class="mt-2 cs-body">
                          Ready to start a conversation
                        </p>
                        <div class="mt-3 flex flex-wrap gap-2">
                          <span
                            v-for="indicator in resolveNeighborPhoneIndicators(neighbor)"
                            :key="`${neighbor.neighborId}-${indicator}`"
                            class="cs-meta font-semibold"
                          >
                            {{ indicator }}
                          </span>
                        </div>
                      </div>

                      <ActionButton
                        type="button"
                        tone="secondary"
                        :style="tapTargetStyle"
                        class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                        :disabled="openingConversation"
                        @click="openConversation({ neighborId: neighbor.neighborId })"
                      >
                        {{ openingConversation ? 'Opening...' : 'Start conversation' }}
                      </ActionButton>
                    </SurfaceCard>
                  </li>
                </ul>

                <EmptyStatePanel
                  v-else-if="!threadLoadError"
                  eyebrow="Queue"
                  title="Nothing is waiting right now"
                  description="When a new conversation needs attention, it will appear here."
                />

                <div
                  data-testid="connectshyft-inbox-action-bar"
                  class="cs-action-group mt-2 border-t border-stone-200 pt-4"
                >
                  <ActionButton
                    type="button"
                    :data-testid="inboxActionCopy.openConversation.testId"
                    :aria-label="inboxActionCopy.openConversation.ariaLabel"
                    :disabled="openingConversation"
                    @click="() => openConversation()"
                    :style="tapTargetStyle"
                    class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                    tone="primary"
                  >
                    {{ openingConversation ? 'Opening...' : inboxActionCopy.openConversation.label }}
                  </ActionButton>
                  <RouterLink
                    v-if="!isViewerRole"
                    :to="buildNeighborCreatePath()"
                    :data-testid="inboxActionCopy.addNeighbor.testId"
                    :aria-label="inboxActionCopy.addNeighbor.ariaLabel"
                    :style="tapTargetStyle"
                    :class="[
                      'cs-button cs-button--secondary',
                      focusRingClass,
                    ]"
                  >
                    {{ inboxActionCopy.addNeighbor.label }}
                  </RouterLink>
                  <ActionButton
                    type="button"
                    :data-testid="inboxActionCopy.composeMessage.testId"
                    :aria-label="inboxActionCopy.composeMessage.ariaLabel"
                    :disabled="!canUseOutboundInboxActions"
                    @click="openSendMessageModal"
                    :style="tapTargetStyle"
                    class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                    tone="secondary"
                  >
                    {{ inboxActionCopy.composeMessage.label }}
                  </ActionButton>
                  <ActionButton
                    type="button"
                    :data-testid="inboxActionCopy.makeCall.testId"
                    :aria-label="inboxActionCopy.makeCall.ariaLabel"
                    :disabled="!canUseOutboundInboxActions"
                    @click="openMakeCallModal"
                    :style="tapTargetStyle"
                    class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                    tone="secondary"
                  >
                    {{ inboxActionCopy.makeCall.label }}
                  </ActionButton>
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard
              v-if="selectedThreadSummary && isThreadSurfaceVisible"
              data-testid="connectshyft-thread-panel"
              padding="default"
              panel
            >
              <ActionButton
                v-if="isMobileViewport"
                type="button"
                data-testid="connectshyft-thread-panel-back"
                :style="tapTargetStyle"
                class="mb-4 w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                tone="secondary"
                @click="closeThreadPanel"
              >
                Back to queue
              </ActionButton>

              <div data-testid="connectshyft-thread-surface" class="flex h-full flex-col gap-5">
                <header class="border-b border-slate-200 pb-4">
                  <p class="cs-heading-lg">
                    {{ selectedThreadDisplayName }}
                  </p>
                  <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 cs-body">
                    <p class="font-medium">{{ selectedThreadConferenceLabel }}</p>
                    <span class="text-slate-300">•</span>
                    <p class="font-medium">{{ selectedThreadClaimLabel }}</p>
                  </div>
                </header>

                <div class="flex flex-wrap gap-2">
                  <StatusBadge
                    :label="selectedThreadSummary.stateLabel || selectedThreadSummary.state"
                    tone="neutral"
                  />
                  <StatusBadge
                    v-if="selectedThreadSummary.urgencyLabel"
                    :label="selectedThreadSummary.urgencyLabel"
                    tone="attention"
                  />
                  <StatusBadge
                    v-if="selectedThreadSummary.voicemailIndicator"
                    data-testid="connectshyft-inbox-preview-voicemail-chip"
                    :label="selectedThreadSummary.voicemailLabel || 'Voicemail received'"
                    tone="voicemail"
                  />
                </div>

                <section class="space-y-4">
                  <SurfaceCard padding="compact" tone="muted">
                    <p class="cs-kicker">
                      Conversation
                    </p>
                    <ConnectShyftMessageBubble
                      title="Latest update"
                      :body="selectedThreadPreviewText"
                      :meta-label="selectedThreadTimestampLabel"
                      tone="inbound"
                    />
                  </SurfaceCard>

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
                </section>

                <ConnectShyftThreadActionBar
                  :actions="selectedThreadPreviewActions"
                  :action-pending="inboxActionPending"
                  :show-add-neighbor-action="false"
                  :focus-ring-class="focusRingClass"
                  :tap-target-style="tapTargetStyle"
                  @action="handlePreviewAction"
                />

                <section
                  v-if="sendMessageModalOpen"
                  data-testid="connectshyft-send-message-modal"
                  class="space-y-3"
                >
                  <SurfaceCard padding="compact" tone="muted">
                    <h3 class="cs-heading-md text-base">Send message</h3>
                  <fieldset class="space-y-2">
                    <legend class="cs-body">Choose a phone number</legend>
                    <label
                      v-for="phoneOption in inboxActionPhoneOptions"
                      :key="`message-${phoneOption.id}`"
                      class="flex items-center gap-2 cs-body"
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
                  <label class="cs-field-label" for="connectshyft-send-message-body-input">
                    Message
                  </label>
                  <textarea
                    id="connectshyft-send-message-body-input"
                    v-model="inboxMessageBody"
                    data-testid="connectshyft-send-message-body-input"
                    rows="3"
                    class="cs-textarea"
                  />
                  <div class="cs-action-group">
                    <ActionButton
                      type="button"
                      data-testid="connectshyft-send-message-modal-submit"
                      :disabled="!canSubmitSendMessage"
                      :style="tapTargetStyle"
                      class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                      tone="primary"
                      @click="submitSendMessage"
                    >
                      {{ inboxActionPending ? 'Sending...' : 'Send message' }}
                    </ActionButton>
                    <ActionButton
                      type="button"
                      :style="tapTargetStyle"
                      class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                      tone="secondary"
                      @click="closeInboxActionModals"
                    >
                      Cancel
                    </ActionButton>
                  </div>
                  </SurfaceCard>
                </section>

                <section
                  v-if="makeCallModalOpen"
                  data-testid="connectshyft-make-call-modal"
                  class="space-y-3"
                >
                  <SurfaceCard padding="compact" tone="muted">
                  <h3 class="cs-heading-md text-base">Make call</h3>
                  <fieldset class="space-y-2">
                    <legend class="cs-body">Choose a phone number</legend>
                    <label
                      v-for="phoneOption in inboxActionPhoneOptions"
                      :key="`call-${phoneOption.id}`"
                      class="flex items-center gap-2 cs-body"
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
                  <div class="cs-action-group">
                    <ActionButton
                      type="button"
                      data-testid="connectshyft-make-call-modal-submit"
                      :disabled="!canSubmitCall"
                      :style="tapTargetStyle"
                      class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                      tone="primary"
                      @click="submitMakeCall"
                    >
                      {{ inboxActionPending ? 'Calling...' : 'Make call' }}
                    </ActionButton>
                    <ActionButton
                      type="button"
                      :style="tapTargetStyle"
                      class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                      tone="secondary"
                      @click="closeInboxActionModals"
                    >
                      Cancel
                    </ActionButton>
                  </div>
                  </SurfaceCard>
                </section>
              </div>
            </SurfaceCard>

            <section
              v-if="isDesktopViewport && selectedThreadSummary && isThreadSurfaceVisible"
              data-testid="connectshyft-tertiary-panel"
            >
              <ConnectShyftNeighborSnapshot
                :neighbor="selectedNeighbor"
                :title="selectedThreadDisplayName"
                subtitle="Action-focused profile"
              />
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

  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import ConnectShyftComposer from '@/components/connectshyft/ConnectShyftComposer.vue';
import ConnectShyftMessageBubble from '@/components/connectshyft/ConnectShyftMessageBubble.vue';
import ConnectShyftNeighborSnapshot from '@/components/connectshyft/ConnectShyftNeighborSnapshot.vue';
import ConnectShyftQueueCard from '@/components/connectshyft/ConnectShyftQueueCard.vue';
import ConnectShyftThreadActionBar from '@/components/connectshyft/ConnectShyftThreadActionBar.vue';
import ConnectShyftVoicemailCard from '@/components/connectshyft/ConnectShyftVoicemailCard.vue';
import ActionButton from '@/components/ui/ActionButton.vue';
import EmptyStatePanel from '@/components/ui/EmptyStatePanel.vue';
import SearchField from '@/components/ui/SearchField.vue';
import SectionHeader from '@/components/ui/SectionHeader.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import SurfaceCard from '@/components/ui/SurfaceCard.vue';
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
  formatConnectShyftTimestamp,
  resolveConnectShyftClaimLabel,
  resolveConnectShyftConferenceLabel,
  resolveConnectShyftNeighborName,
  resolveConnectShyftPreviewText,
} from '@/features/connectshyft/presentation';
import {
  dispatchConnectShyftThreadCall,
  dispatchConnectShyftThreadMessage,
  ensureConnectShyftThread,
  type ConnectShyftThreadActionFailure,
} from '@/features/connectshyft/threads';
import {
  CONNECTSHYFT_ACCESSIBILITY_LOCKS,
  CONNECTSHYFT_FOCUS_RING_CLASS,
  CONNECTSHYFT_INBOX_ACTION_COPY,
  createConnectShyftFeedback,
  resolveCanonicalStateActions,
  sanitizeConnectShyftOperatorCopy,
  type ConnectShyftFeedback,
} from '@/features/connectshyft/uiContracts';
import {
  buildConnectNeighborCreatePath,
  buildConnectThreadPath,
} from '@/shell/routes';

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
const threadActionFailure = ref<ConnectShyftThreadActionFailure | null>(null);
const threadActionFeedback = ref<ConnectShyftFeedback | null>(null);
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
  return route.name === 'connectshyft-mine' ? 'mine' : 'inbox';
});

const bucketTitle = computed(() => (bucket.value === 'mine' ? 'Assigned' : 'Inbox'));
const actorUserId = computed(() => {
  const rawActorUserId = typeof route.query.actorUserId === 'string'
    ? route.query.actorUserId
    : '';
  return rawActorUserId.trim() || null;
});
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

const clearThreadActionOutcome = (): void => {
  threadActionError.value = '';
  threadActionFailure.value = null;
  threadActionFeedback.value = null;
};

const applyThreadActionFailure = (
  failure: ConnectShyftThreadActionFailure,
  fallbackMessage: string,
): void => {
  const safeMessage = sanitizeConnectShyftOperatorCopy(
    failure.message,
    fallbackMessage,
  );
  const normalizedFailure = {
    ...failure,
    message: safeMessage,
  };

  threadActionError.value = safeMessage;
  threadActionFailure.value = normalizedFailure;
  threadActionFeedback.value = createConnectShyftFeedback(
    normalizedFailure.failureKind === 'error' ? 'error' : 'refusal',
    safeMessage,
    fallbackMessage,
  );
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

type ResolvedInboxContext = {
  orgUnitId: string | null;
  neighborId: string;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
};

const resolveInboxContext = (): ResolvedInboxContext => {
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

const openConversation = async (overrides: Partial<ResolvedInboxContext> = {}): Promise<void> => {
  const context = {
    ...resolveInboxContext(),
    ...overrides,
  };
  clearThreadActionOutcome();
  if (!context.orgUnitId) {
    threadActionError.value = 'Choose a workspace before opening a conversation.';
    return;
  }

  openingConversation.value = true;

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

    selectedThreadId.value = ensureResult.thread.threadId;
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
      resolveThreadCardTitle(item),
      resolveThreadConferenceLabel(item),
      resolveThreadClaimLabel(item),
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
const neighborsById = computed(() => {
  return new Map(neighbors.value.map((neighbor) => [neighbor.neighborId, neighbor]));
});
const resolveThreadNeighbor = (item: ConnectShyftThreadSummary): ConnectShyftNeighbor | null => {
  if (!item.neighborId) {
    return null;
  }

  return neighborsById.value.get(item.neighborId) || null;
};
const resolveThreadCardTitle = (item: ConnectShyftThreadSummary): string => {
  return resolveConnectShyftNeighborName(item, resolveThreadNeighbor(item));
};
const resolveThreadConferenceLabel = (item: ConnectShyftThreadSummary): string => {
  return resolveConnectShyftConferenceLabel(item);
};
const resolveThreadClaimLabel = (item: ConnectShyftThreadSummary): string => {
  return resolveConnectShyftClaimLabel(item, actorUserId.value);
};
const resolveThreadPreview = (item: ConnectShyftThreadSummary): string => {
  return resolveConnectShyftPreviewText(item);
};
const resolveThreadPhoneIndicators = (item: ConnectShyftThreadSummary): string[] => {
  const neighbor = resolveThreadNeighbor(item);
  if (!neighbor) {
    return [];
  }

  return neighbor.phones.map((phone) => {
    const label = phone.label.trim() || 'phone';
    return `${label.toLowerCase()} · ${phone.isShared ? 'Shared' : 'Not shared'}`;
  });
};
const resolveNeighborFallbackName = (neighbor: ConnectShyftNeighbor): string => {
  const fullName = `${neighbor.firstName} ${neighbor.lastName}`.trim();
  return fullName || 'Neighbor';
};
const resolveNeighborPhoneIndicators = (neighbor: ConnectShyftNeighbor): string[] => {
  return neighbor.phones.map((phone) => {
    const label = phone.label.trim() || 'phone';
    return `${label.toLowerCase()} · ${phone.isShared ? 'Shared' : 'Not shared'}`;
  });
};
const formatThreadTimestamp = (value: string): string => formatConnectShyftTimestamp(value);
const queueHeading = computed(() => {
  return bucket.value === 'mine' ? 'Assigned conversations' : 'Conversations needing attention';
});
const queueSummaryText = computed(() => {
  const count = filteredThreadItems.value.length;
  if (count === 0) {
    if (directoryFallbackItems.value.length > 0) {
      const fallbackCount = directoryFallbackItems.value.length;
      return `${fallbackCount} ${fallbackCount === 1 ? 'neighbor is' : 'neighbors are'} ready to reach out`;
    }

    return 'No conversations need attention right now.';
  }

  return `${count} ${count === 1 ? 'conversation needs' : 'conversations need'} attention`;
});
const directoryFallbackItems = computed(() => {
  if (threadItems.value.length > 0) {
    return [];
  }

  const searchTerm = queueSearch.value.trim().toLowerCase();
  return neighbors.value
    .slice()
    .sort((left, right) => {
      return resolveNeighborFallbackName(left).localeCompare(resolveNeighborFallbackName(right));
    })
    .filter((neighbor) => {
      if (!searchTerm) {
        return true;
      }

      const searchableCopy = [
        resolveNeighborFallbackName(neighbor),
        ...resolveNeighborPhoneIndicators(neighbor),
        ...neighbor.phones.map((phone) => phone.value),
      ]
        .join(' ')
        .toLowerCase();

      return searchableCopy.includes(searchTerm);
    });
});
const selectedNeighbor = computed(() => {
  if (!selectedThreadSummary.value) {
    return null;
  }

  return resolveThreadNeighbor(selectedThreadSummary.value);
});
const selectedThreadDisplayName = computed(() => {
  if (!selectedThreadSummary.value) {
    return 'Neighbor follow-up';
  }

  return resolveThreadCardTitle(selectedThreadSummary.value);
});
const selectedThreadConferenceLabel = computed(() => {
  if (!selectedThreadSummary.value) {
    return 'Conference follow-up queue';
  }

  return resolveThreadConferenceLabel(selectedThreadSummary.value);
});
const selectedThreadClaimLabel = computed(() => {
  if (!selectedThreadSummary.value) {
    return 'Available to pick up';
  }

  return resolveThreadClaimLabel(selectedThreadSummary.value);
});
const selectedThreadPreviewText = computed(() => {
  if (!selectedThreadSummary.value) {
    return 'Conversation activity recorded.';
  }

  return resolveThreadPreview(selectedThreadSummary.value);
});
const selectedThreadTimestampLabel = computed(() => {
  if (!selectedThreadSummary.value) {
    return '';
  }

  return formatThreadTimestamp(selectedThreadSummary.value.lastActivityAtUtc);
});
const selectedThreadPreviewActions = computed(() => {
  if (!selectedThreadSummary.value || isViewerRole.value) {
    return [];
  }

  return [...resolveCanonicalStateActions(selectedThreadSummary.value.state)];
});
const inboxActionPhoneOptions = computed(() => {
  const seenValues = new Set<string>();
  const neighbor = selectedNeighbor.value;
  if (!neighbor) {
    return [];
  }

  return neighbor.phones
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
    }));
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
      return 'ConnectShyft is not turned on for this workspace yet.';
    }

    return 'ConnectShyft is currently unavailable in this workspace. Ask an administrator to help restore access.';
  }

  return 'The inbox is currently unavailable in this workspace.';
});

const maintenanceBanner = computed(() => {
  if (!moduleAvailable.value || !inboxAvailable.value) {
    return '';
  }

  if (!escalationAvailable.value) {
    return 'Some escalation tools are temporarily unavailable right now.';
  }

  return '';
});

const liveRegionStatus = computed(() => {
  if (threadActionFeedback.value) {
    return threadActionFeedback.value.announcement;
  }
  if (threadActionError.value) {
    return `Refusal feedback. ${threadActionError.value}`;
  }
  if (threadLoadError.value) {
    return `Error feedback. ${threadLoadError.value}`;
  }
  return '';
});

const threadActionFeedbackClass = computed(() => {
  if (threadActionFeedback.value?.taxonomy === 'error') {
    return 'border-rose-200 bg-rose-50 text-rose-900';
  }

  return 'border-amber-200 bg-amber-50 text-amber-900';
});

const threadActionUiFeedbackMessage = computed(() => {
  const message = threadActionFailure.value?.data?.uiFeedback?.message;
  return typeof message === 'string' ? message : '';
});

const threadActionPreferencePolicyState = computed(() => {
  const policy = threadActionFailure.value?.data?.preferencePolicy;
  return policy && typeof policy === 'object' ? 'present' : 'absent';
});

const buildThreadDetailPath = (threadId: string): string => {
  if (typeof window === 'undefined') {
    return buildConnectThreadPath(threadId);
  }

  const currentQuery = new URLSearchParams(window.location.search);
  const queryString = currentQuery.toString();
  const basePath = buildConnectThreadPath(threadId);

  return queryString.length > 0
    ? `${basePath}?${queryString}`
    : basePath;
};

const buildNeighborCreatePath = (): string => {
  if (typeof window === 'undefined') {
    return buildConnectNeighborCreatePath();
  }

  const currentQuery = new URLSearchParams(window.location.search);
  const queryString = currentQuery.toString();
  const basePath = buildConnectNeighborCreatePath();

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

  clearThreadActionOutcome();
  makeCallModalOpen.value = false;
  sendMessageModalOpen.value = true;
  applyDefaultDispatchPhone();
};

const openMakeCallModal = (): void => {
  if (!canUseOutboundInboxActions.value) {
    return;
  }

  clearThreadActionOutcome();
  sendMessageModalOpen.value = false;
  makeCallModalOpen.value = true;
  applyDefaultDispatchPhone();
};

const handlePreviewAction = (action: string): void => {
  if (!selectedThreadSummary.value) {
    return;
  }

  if (action === 'Call') {
    openMakeCallModal();
    return;
  }

  if (action === 'Text' || action === 'Send Message') {
    openSendMessageModal();
    return;
  }

  void router.push(buildThreadDetailPath(selectedThreadSummary.value.threadId));
};

const submitPreviewComposer = async (): Promise<void> => {
  if (!selectedThreadSummary.value || previewComposerBody.value.trim().length === 0) {
    return;
  }

  inboxActionPending.value = true;
  clearThreadActionOutcome();

  try {
    const result = await dispatchConnectShyftThreadMessage({
      threadId: selectedThreadSummary.value.threadId,
      orgUnitId: selectedThreadSummary.value.orgUnitId,
      body: previewComposerBody.value,
    });

    if (!result.ok) {
      applyThreadActionFailure(result, 'Unable to send the message right now.');
      return;
    }

    clearThreadActionOutcome();
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
  clearThreadActionOutcome();

  try {
    const result = await dispatchConnectShyftThreadMessage({
      threadId: selectedThreadSummary.value.threadId,
      orgUnitId: selectedThreadSummary.value.orgUnitId,
      body: inboxMessageBody.value,
      targetPhone: selectedDispatchPhone.value,
    });

    if (!result.ok) {
      applyThreadActionFailure(result, 'Unable to send the message right now.');
      return;
    }

    clearThreadActionOutcome();
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
  clearThreadActionOutcome();

  try {
    const result = await dispatchConnectShyftThreadCall({
      threadId: selectedThreadSummary.value.threadId,
      orgUnitId: selectedThreadSummary.value.orgUnitId,
      targetPhone: selectedDispatchPhone.value,
    });

    if (!result.ok) {
      applyThreadActionFailure(result, 'Unable to place the call right now.');
      return;
    }

    clearThreadActionOutcome();
    closeInboxActionModals();
    await loadThreadContracts();
  } finally {
    inboxActionPending.value = false;
  }
};
</script>
