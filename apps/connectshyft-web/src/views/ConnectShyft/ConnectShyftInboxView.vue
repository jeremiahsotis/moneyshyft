<template>
  <main class="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(219,234,254,0.8),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-6 pb-32 sm:px-6 sm:py-8">
    <section class="mx-auto max-w-7xl">
      <header class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 v-if="showUnavailableState" class="text-3xl font-semibold tracking-tight text-slate-900">
            ConnectShyft unavailable
          </h1>
          <h1
            v-else
            aria-label="ConnectShyft Inbox"
            class="text-3xl font-semibold tracking-tight text-slate-900"
          >
            ConnectShyft
          </h1>
          <p
            v-if="!showUnavailableState"
            data-testid="connectshyft-inbox-summary-copy"
            class="mt-2 text-base font-medium text-slate-500"
          >
            {{ queueSummaryText }}
          </p>
        </div>

        <p
          v-if="showUnavailableState"
          data-testid="connectshyft-unavailable-state"
          :style="bodyTextStyle"
          class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900"
        >
          {{ unavailableMessage }}
        </p>
      </header>

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
        class="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900"
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
              'grid gap-5',
              isDesktopViewport && isThreadSurfaceVisible
                ? 'xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.08fr)_20rem]'
                : isTabletViewport && isThreadSurfaceVisible
                  ? 'md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]'
                  : 'grid-cols-1',
            ]"
          >
            <section
              data-testid="connectshyft-queue-panel"
              v-show="showQueuePanel"
              class="rounded-[32px] border border-slate-200 bg-white/90 p-5 shadow-[0_28px_90px_-56px_rgba(15,23,42,0.45)]"
            >
              <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {{ bucketTitle }}
                    </p>
                    <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                      {{ queueHeading }}
                    </h2>
                  </div>

                  <label class="flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-500">
                    Search neighbors
                    <input
                      v-model="queueSearch"
                      data-testid="connectshyft-queue-search-input"
                      aria-label="Queue search"
                      type="search"
                      placeholder="Search neighbors"
                      class="min-h-[44px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-base text-slate-900 placeholder:text-slate-400"
                    >
                  </label>
                </div>

                <p
                  v-if="threadLoadError"
                  data-testid="connectshyft-inbox-load-error"
                  class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900"
                >
                  {{ threadLoadError }}
                </p>

                <p
                  v-if="threadActionFeedback || threadActionError"
                  data-testid="connectshyft-inbox-action-feedback"
                  :data-feedback-taxonomy="threadActionFeedback?.taxonomy || 'refusal'"
                  class="rounded-2xl border px-4 py-3 text-base"
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
                  class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900"
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
                      :context-pills="[item.bucket === 'mine' ? 'Mine' : 'Inbox']"
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
                    class="rounded-[24px] border border-slate-200 bg-white/90 px-4 py-4 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.12)]"
                  >
                    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div class="min-w-0 flex-1">
                        <p class="text-[1.2rem] font-semibold leading-tight text-slate-900">
                          {{ resolveNeighborFallbackName(neighbor) }}
                        </p>
                        <p class="mt-2 text-sm text-slate-500">
                          Ready to start a conversation
                        </p>
                        <div class="mt-3 flex flex-wrap gap-2 text-sm text-slate-500">
                          <span
                            v-for="indicator in resolveNeighborPhoneIndicators(neighbor)"
                            :key="`${neighbor.neighborId}-${indicator}`"
                            class="font-medium"
                          >
                            {{ indicator }}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        class="min-h-[44px] rounded-full border border-slate-200 bg-white px-4 py-2 text-base font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        :style="tapTargetStyle"
                        :class="focusRingClass"
                        :disabled="openingConversation"
                        @click="openConversation({ neighborId: neighbor.neighborId })"
                      >
                        {{ openingConversation ? 'Opening...' : 'Start conversation' }}
                      </button>
                    </div>
                  </li>
                </ul>

                <p v-else-if="!threadLoadError" class="rounded-3xl border border-dashed border-slate-200 px-4 py-8 text-center text-base text-slate-500">
                  No neighbors are currently waiting in this queue.
                </p>

                <div
                  data-testid="connectshyft-inbox-action-bar"
                  class="mt-2 flex flex-wrap gap-3 border-t border-slate-200 pt-4"
                >
                  <button
                    type="button"
                    :data-testid="inboxActionCopy.openConversation.testId"
                    :aria-label="inboxActionCopy.openConversation.ariaLabel"
                    :disabled="openingConversation"
                    @click="() => openConversation()"
                    :style="tapTargetStyle"
                    :class="[
                      'min-h-[44px] rounded-full bg-slate-900 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400',
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
                      'inline-flex min-h-[44px] items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-base font-medium text-white',
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
                      'min-h-[44px] rounded-full border border-slate-200 bg-white px-4 py-2 text-base font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400',
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
                      'min-h-[44px] rounded-full border border-slate-200 bg-white px-4 py-2 text-base font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400',
                      focusRingClass,
                    ]"
                  >
                    {{ inboxActionCopy.makeCall.label }}
                  </button>
                </div>
              </div>
            </section>

            <section
              v-if="selectedThreadSummary && isThreadSurfaceVisible"
              data-testid="connectshyft-thread-panel"
              class="rounded-[32px] border border-slate-200 bg-white/90 p-5 shadow-[0_28px_90px_-56px_rgba(15,23,42,0.45)]"
            >
              <button
                v-if="isMobileViewport"
                type="button"
                data-testid="connectshyft-thread-panel-back"
                :style="tapTargetStyle"
                :class="[
                  'mb-4 inline-flex min-h-[44px] w-fit items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-base font-medium text-slate-700',
                  focusRingClass,
                ]"
                @click="closeThreadPanel"
              >
                Back to queue
              </button>

              <div data-testid="connectshyft-thread-surface" class="flex h-full flex-col gap-5">
                <header class="border-b border-slate-200 pb-4">
                  <p class="text-3xl font-semibold tracking-tight text-slate-900">
                    {{ selectedThreadDisplayName }}
                  </p>
                  <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-slate-500">
                    <p class="font-medium">{{ selectedThreadConferenceLabel }}</p>
                    <span class="text-slate-300">•</span>
                    <p class="font-medium">{{ selectedThreadClaimLabel }}</p>
                  </div>
                </header>

                <div class="flex flex-wrap gap-2">
                  <span class="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-600">
                    {{ selectedThreadSummary.stateLabel || selectedThreadSummary.state }}
                  </span>
                  <span
                    v-if="selectedThreadSummary.urgencyLabel"
                    class="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700"
                  >
                    {{ selectedThreadSummary.urgencyLabel }}
                  </span>
                  <span
                    v-if="selectedThreadSummary.voicemailIndicator"
                    data-testid="connectshyft-inbox-preview-voicemail-chip"
                    class="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700"
                  >
                    {{ selectedThreadSummary.voicemailLabel || 'Voicemail received' }}
                  </span>
                </div>

                <section class="space-y-4">
                  <div class="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Conversation
                    </p>
                    <ConnectShyftMessageBubble
                      title="Latest update"
                      :body="selectedThreadPreviewText"
                      :meta-label="selectedThreadTimestampLabel"
                      tone="inbound"
                    />
                  </div>

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
                  class="space-y-3 rounded-[28px] border border-slate-200 bg-slate-50/80 p-4"
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
                    class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900"
                  />
                  <div class="flex flex-wrap gap-3">
                    <button
                      type="button"
                      data-testid="connectshyft-send-message-modal-submit"
                      :disabled="!canSubmitSendMessage"
                      :style="tapTargetStyle"
                      :class="[
                        'min-h-[44px] rounded-full bg-slate-900 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400',
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
                        'min-h-[44px] rounded-full border border-slate-200 bg-white px-4 py-2 text-base font-medium text-slate-700',
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
                  class="space-y-3 rounded-[28px] border border-slate-200 bg-slate-50/80 p-4"
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
                        'min-h-[44px] rounded-full bg-slate-900 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400',
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
                        'min-h-[44px] rounded-full border border-slate-200 bg-white px-4 py-2 text-base font-medium text-slate-700',
                        focusRingClass,
                      ]"
                      @click="closeInboxActionModals"
                    >
                      Cancel
                    </button>
                  </div>
                </section>
              </div>
            </section>

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

    <ConnectShyftPrimaryNav />
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import ConnectShyftComposer from '@/components/connectshyft/ConnectShyftComposer.vue';
import ConnectShyftMessageBubble from '@/components/connectshyft/ConnectShyftMessageBubble.vue';
import ConnectShyftNeighborSnapshot from '@/components/connectshyft/ConnectShyftNeighborSnapshot.vue';
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
  return route.path.includes('/app/connectshyft/mine') ? 'mine' : 'inbox';
});

const bucketTitle = computed(() => (bucket.value === 'mine' ? 'Mine' : 'Inbox'));
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
    threadActionError.value = 'Select an orgUnit before opening a ConnectShyft conversation.';
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
  return bucket.value === 'mine' ? 'My follow-ups' : 'Neighbors needing follow-up';
});
const queueSummaryText = computed(() => {
  const count = filteredThreadItems.value.length;
  if (count === 0) {
    if (directoryFallbackItems.value.length > 0) {
      const fallbackCount = directoryFallbackItems.value.length;
      return `${fallbackCount} ${fallbackCount === 1 ? 'neighbor is' : 'neighbors are'} ready to reach out`;
    }

    return 'No neighbors need follow-up right now.';
  }

  return `${count} ${count === 1 ? 'neighbor needs' : 'neighbors need'} follow-up`;
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
    return 'Ready to claim';
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
  const prioritizedNeighbors = selectedNeighbor.value
    ? [selectedNeighbor.value]
    : [];
  const additionalNeighbors = neighbors.value.filter((neighbor) =>
    !selectedNeighbor.value || neighbor.neighborId !== selectedNeighbor.value.neighborId,
  );
  const seenValues = new Set<string>();

  return [...prioritizedNeighbors, ...additionalNeighbors].flatMap((neighbor) =>
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
