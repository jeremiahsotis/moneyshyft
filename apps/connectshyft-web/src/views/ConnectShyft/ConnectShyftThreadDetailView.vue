<template>
  <main class="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(219,234,254,0.8),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-6 pb-44 sm:px-6 sm:py-8">
    <section class="mx-auto max-w-7xl">
      <header class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 v-if="showUnavailableState" class="text-3xl font-semibold tracking-tight text-slate-900">
            ConnectShyft unavailable
          </h1>
          <h1 v-else class="text-3xl font-semibold tracking-tight text-slate-900">
            {{ threadDisplayName }}
          </h1>
          <p
            v-if="!showUnavailableState"
            class="mt-2 text-base font-medium text-slate-500"
          >
            Conversation-first follow-up with neighbor context kept in view.
          </p>
        </div>

        <p
          v-if="showUnavailableState"
          :style="bodyTextStyle"
          class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900"
        >
          {{ unavailableMessage }}
        </p>
      </header>

      <section
        v-if="!showUnavailableState"
        data-testid="connectshyft-thread-detail"
      >
        <div
          data-testid="connectshyft-thread-surface"
          class="space-y-5 pb-24"
          :style="bodyTextStyle"
        >
          <p
            data-testid="connectshyft-live-region-status"
            aria-live="polite"
            class="sr-only"
          >
            {{ feedbackBanner ? feedbackBanner.announcement : '' }}
          </p>

          <section
            v-if="showContextualActionFeedback || detailLoadError"
            data-testid="connectshyft-thread-action-feedback-contextual"
            class="space-y-3"
          >
            <p
              v-if="feedbackBanner"
              data-testid="connectshyft-feedback-banner"
              :data-feedback-taxonomy="feedbackBanner.taxonomy"
              class="rounded-2xl border px-4 py-3 text-base"
              :class="feedbackBannerClass"
            >
              {{ feedbackBanner.message }}
            </p>

            <p
              v-if="directoryNoticeMessage"
              :data-testid="directoryNoticeTestId"
              class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-900"
            >
              {{ directoryNoticeMessage }}
            </p>

            <p
              v-if="showActionRefusalBanner"
              data-testid="connectshyft-thread-action-refusal-banner"
              class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900"
            >
              {{ actionBannerMessage }}
            </p>

            <p
              v-if="policyRefusalBanner"
              data-testid="connectshyft-policy-refusal-banner"
              role="alert"
              aria-live="assertive"
              class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900"
            >
              {{ policyRefusalBanner }}
            </p>

            <p
              v-if="policyErrorBanner"
              data-testid="connectshyft-policy-error-banner"
              role="alert"
              aria-live="assertive"
              class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-900"
            >
              {{ policyErrorBanner }}
            </p>

            <p
              v-if="policySuccessBanner"
              data-testid="connectshyft-policy-success-banner"
              role="status"
              aria-live="polite"
              class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-900"
            >
              {{ policySuccessBanner }}
            </p>

            <p
              v-if="policySuccessAuditReason"
              data-testid="connectshyft-preference-override-audit-chip"
              class="inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-base font-medium text-emerald-900"
            >
              Override reason: {{ policySuccessAuditReason }}
            </p>

            <p
              v-if="lifecycleToast"
              data-testid="connectshyft-thread-reopened-toast"
              class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-900"
            >
              {{ lifecycleToast }}
            </p>

            <p
              v-if="hiddenTransitionWarning"
              data-testid="connectshyft-hidden-transition-warning"
              class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-900"
            >
              Hidden lifecycle transition detected. Refresh thread context and retry.
            </p>

            <p
              v-if="detailLoadError"
              class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900"
            >
              {{ detailLoadError }}
            </p>
          </section>

          <template v-if="threadDetail">
            <div class="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_22rem]">
              <section class="space-y-5">
                <ConnectShyftThreadHeader
                  :title="threadDisplayName"
                  :neighbor-context-label="neighborContextLabel"
                  :conference-context-label="threadConferenceLabel"
                  :claim-context-label="threadClaimLabel"
                  :state-label="threadDetail.stateLabel || threadDetail.state"
                  :owner-label="threadOwnerLabel"
                  :escalation-label="escalationChipLabel"
                  :inactivity-label="inactivityChipLabel"
                  :voicemail-indicator="threadDetail.voicemailIndicator === true"
                />

                <p
                  v-if="showPreferenceOverrideRequiredChip"
                  data-testid="connectshyft-preference-override-required-chip"
                  class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900"
                >
                  Override required for outbound SMS. Add an approved reason before sending.
                </p>

                <section class="rounded-[32px] border border-slate-200 bg-white/90 p-5 shadow-[0_28px_90px_-56px_rgba(15,23,42,0.45)]">
                  <div class="border-b border-slate-200 pb-4">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Connected conversation
                    </p>
                    <p class="mt-2 text-base text-slate-500">
                      {{ threadConferenceLabel }}
                    </p>
                  </div>

                  <section
                    data-testid="connectshyft-thread-timeline"
                    class="mt-5 space-y-4"
                  >
                    <article
                      v-for="(event, index) in timelineEvents"
                      :key="event.eventId"
                      data-testid="connectshyft-thread-timeline-event"
                      class="space-y-2"
                    >
                      <div
                        v-if="event.conversationType === 'voicemail'"
                        data-testid="connectshyft-thread-timeline-event-voicemail"
                        class="rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-[0_20px_70px_-54px_rgba(15,23,42,0.4)]"
                      >
                        <p class="text-lg font-semibold text-slate-900">
                          Voicemail received
                        </p>
                        <p class="mt-2 text-base leading-8 text-slate-600">
                          {{ event.summary }}
                        </p>
                        <button
                          type="button"
                          class="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-base font-semibold text-white"
                          :style="tapTargetStyle"
                        >
                          Play recording
                        </button>
                      </div>

                      <ConnectShyftMessageBubble
                        v-else
                        :title="formatTimelineEventTitle(event.eventName)"
                        :body="event.summary"
                        :meta-label="index === 0 ? threadTimestampLabel : ''"
                        :tone="resolveTimelineTone(index)"
                      />
                    </article>
                  </section>
                </section>

                <ConnectShyftComposer
                  v-model="threadComposerBody"
                  :disabled="actionPending"
                  :submit-disabled="threadComposerBody.trim().length === 0"
                  submit-label="Send Message"
                  :focus-ring-class="focusRingClass"
                  :tap-target-style="tapTargetStyle"
                  @submit="submitThreadComposerDraft"
                />

                <ConnectShyftThreadActionBar
                  :actions="visibleActions"
                  :action-pending="actionPending"
                  :show-add-neighbor-action="!isViewerRole"
                  :focus-ring-class="focusRingClass"
                  :tap-target-style="tapTargetStyle"
                  @action="handleThreadAction"
                  @add-neighbor="toggleAddNeighborForm"
                />

                <section
                  v-if="addNeighborFormOpen && !isViewerRole"
                  data-testid="connectshyft-add-neighbor-form"
                  class="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.35)]"
                >
                  <p class="text-lg font-semibold text-slate-900">
                    Add a neighbor contact
                  </p>
                  <p class="mt-2 text-base text-slate-500">
                    Keep the follow-up in this conference without breaking the volunteer workflow.
                  </p>
                  <label class="mt-4 block text-base text-slate-700" for="connectshyft-add-neighbor-phone">
                    Phone number
                  </label>
                  <input
                    id="connectshyft-add-neighbor-phone"
                    v-model="addNeighborPhone"
                    data-testid="connectshyft-add-neighbor-phone"
                    type="text"
                    autocomplete="off"
                    placeholder="+1 (555) 555-0100"
                    :class="[
                      'mt-2 min-h-[44px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900',
                      focusRingClass,
                    ]"
                    :style="tapTargetStyle"
                    :disabled="addNeighborSubmitting || actionPending"
                  >
                  <div class="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      data-testid="connectshyft-add-neighbor-submit-action"
                      :class="[
                        'min-h-[44px] rounded-full bg-emerald-700 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-60',
                        focusRingClass,
                      ]"
                      :style="tapTargetStyle"
                      :disabled="addNeighborSubmitting || actionPending"
                      @click="submitAddNeighbor"
                    >
                      {{ addNeighborSubmitting ? 'Adding...' : 'Add Neighbor' }}
                    </button>
                    <button
                      type="button"
                      :class="[
                        'min-h-[44px] rounded-full border border-slate-200 bg-white px-4 py-2 text-base font-medium text-slate-700',
                        focusRingClass,
                      ]"
                      :style="tapTargetStyle"
                      :disabled="addNeighborSubmitting || actionPending"
                      @click="closeAddNeighborForm"
                    >
                      Cancel
                    </button>
                  </div>
                </section>

                <section
                  v-if="preferenceOverrideModalOpen"
                  ref="preferenceOverrideModalRef"
                  data-testid="connectshyft-preference-override-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="connectshyft-preference-override-title"
                  class="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.35)]"
                  @keydown="handlePreferenceOverrideModalKeydown"
                >
                  <h2
                    id="connectshyft-preference-override-title"
                    class="text-lg font-semibold text-slate-900"
                  >
                    Outbound SMS policy requires an approved override reason.
                  </h2>
                  <label
                    class="mt-4 block text-base text-slate-700"
                    for="connectshyft-preference-override-reason-select"
                  >
                    Override reason
                  </label>
                  <select
                    id="connectshyft-preference-override-reason-select"
                    v-model="preferenceOverrideReason"
                    data-testid="connectshyft-preference-override-reason-select"
                    aria-label="Override reason"
                    :class="[
                      'mt-2 min-h-[44px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900',
                      focusRingClass,
                    ]"
                    :style="tapTargetStyle"
                    :disabled="actionPending"
                  >
                    <option value="">Select override reason</option>
                    <option
                      v-for="reason in preferenceOverrideReasonOptions"
                      :key="reason"
                      :value="reason"
                    >
                      {{ formatOverrideReason(reason) }}
                    </option>
                  </select>

                  <label
                    class="mt-4 block text-base text-slate-700"
                    for="connectshyft-preference-override-note-input"
                  >
                    Override note (optional)
                  </label>
                  <textarea
                    id="connectshyft-preference-override-note-input"
                    v-model="preferenceOverrideNote"
                    data-testid="connectshyft-preference-override-note-input"
                    rows="3"
                    :class="[
                      'mt-2 min-h-[44px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900',
                      focusRingClass,
                    ]"
                    :style="tapTargetStyle"
                    :disabled="actionPending"
                  />

                  <p
                    v-if="preferenceOverrideError"
                    data-testid="connectshyft-preference-override-error"
                    role="alert"
                    aria-live="assertive"
                    class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900"
                  >
                    {{ preferenceOverrideError }}
                  </p>

                  <div class="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      data-testid="connectshyft-preference-override-submit"
                      :class="[
                        'min-h-[44px] rounded-full bg-slate-900 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-60',
                        focusRingClass,
                      ]"
                      :style="tapTargetStyle"
                      :disabled="preferenceOverrideSubmitDisabled"
                      @click="submitPreferenceOverride"
                    >
                      {{ actionPending ? 'Sending...' : 'Send with override' }}
                    </button>
                    <button
                      type="button"
                      :class="[
                        'min-h-[44px] rounded-full border border-slate-200 bg-white px-4 py-2 text-base font-medium text-slate-700',
                        focusRingClass,
                      ]"
                      :style="tapTargetStyle"
                      :disabled="actionPending"
                      @click="closePreferenceOverrideModal"
                    >
                      Cancel
                    </button>
                  </div>
                </section>

                <section
                  v-if="closeModalOpen"
                  ref="closeModalRef"
                  data-testid="connectshyft-close-thread-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="connectshyft-close-thread-title"
                  class="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.35)]"
                  @keydown="handleCloseModalKeydown"
                >
                  <h2
                    id="connectshyft-close-thread-title"
                    class="text-lg font-semibold text-slate-900"
                  >
                    Are you sure you want to close this thread?
                  </h2>
                  <div class="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      :class="[
                        'min-h-[44px] rounded-full bg-slate-900 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-60',
                        focusRingClass,
                      ]"
                      :style="tapTargetStyle"
                      :disabled="actionPending"
                      @click="confirmCloseThread"
                    >
                      Confirm Close
                    </button>
                    <button
                      type="button"
                      :class="[
                        'min-h-[44px] rounded-full border border-slate-200 bg-white px-4 py-2 text-base font-medium text-slate-700',
                        focusRingClass,
                      ]"
                      :style="tapTargetStyle"
                      :disabled="actionPending"
                      @click="closeModalOpen = false"
                    >
                      Cancel
                    </button>
                  </div>
                </section>
              </section>

              <aside class="space-y-5">
                <ConnectShyftNeighborSnapshot
                  :neighbor="threadNeighbor"
                  :title="threadDisplayName"
                  :subtitle="threadConferenceLabel"
                  :note="threadSnapshotNote"
                />

                <section class="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.35)]">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Latest update
                  </p>
                  <ConnectShyftMessageBubble
                    class="mt-4"
                    title="Conversation at a glance"
                    :body="threadPreviewText"
                    :meta-label="threadTimestampLabel"
                    tone="system"
                  />
                  <ConnectShyftVoicemailCard
                    :visible="threadDetail.voicemailIndicator === true"
                    :label="threadDetail.voicemailLabel || 'Voicemail waiting'"
                  />
                </section>
              </aside>
            </div>
          </template>

          <p v-else-if="!detailLoadError" class="rounded-2xl border border-slate-200 bg-white/90 px-4 py-6 text-base text-slate-600">
            Loading thread detail...
          </p>
        </div>
      </section>
    </section>

    <ConnectShyftPrimaryNav />
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import ConnectShyftComposer from '@/components/connectshyft/ConnectShyftComposer.vue';
import ConnectShyftMessageBubble from '@/components/connectshyft/ConnectShyftMessageBubble.vue';
import ConnectShyftNeighborSnapshot from '@/components/connectshyft/ConnectShyftNeighborSnapshot.vue';
import ConnectShyftPrimaryNav from '@/components/connectshyft/ConnectShyftPrimaryNav.vue';
import ConnectShyftThreadActionBar from '@/components/connectshyft/ConnectShyftThreadActionBar.vue';
import ConnectShyftThreadHeader from '@/components/connectshyft/ConnectShyftThreadHeader.vue';
import ConnectShyftVoicemailCard from '@/components/connectshyft/ConnectShyftVoicemailCard.vue';
import api from '@/services/api';
import {
  DEFAULT_CONNECTSHYFT_AVAILABILITY,
  fetchConnectShyftAvailability,
  buildConnectShyftTestOverrideHeaders,
  resolveConnectShyftDeterministicTestPhone,
} from '@/features/connectshyft/flags';
import {
  createConnectShyftNeighbor,
  fetchConnectShyftNeighborsCollection,
  type ConnectShyftNeighbor,
} from '@/features/connectshyft/neighbors';
import {
  formatConnectShyftTimestamp,
  resolveConnectShyftClaimLabel,
  resolveConnectShyftConferenceLabel,
  resolveConnectShyftNeighborName,
  resolveConnectShyftPreviewText,
} from '@/features/connectshyft/presentation';
import {
  fetchConnectShyftThreadDetail,
  type ConnectShyftThreadDetail,
} from '@/features/connectshyft/readContracts';
import {
  CONNECTSHYFT_ACCESSIBILITY_LOCKS,
  CONNECTSHYFT_DEFAULT_SMS_OVERRIDE_REASONS,
  CONNECTSHYFT_FOCUS_RING_CLASS,
  createConnectShyftFeedback,
  resolveSafeVisibleThreadActions,
  sanitizeConnectShyftOperatorCopy,
  type ConnectShyftFeedback,
  type ConnectShyftFeedbackTaxonomy,
} from '@/features/connectshyft/uiContracts';

const route = useRoute();
const availability = ref({ ...DEFAULT_CONNECTSHYFT_AVAILABILITY });
const threadDetail = ref<ConnectShyftThreadDetail | null>(null);
const threadNeighbors = ref<ConnectShyftNeighbor[]>([]);
const detailLoadError = ref('');
const lifecycleToast = ref('');
const actionError = ref('');
const hiddenTransitionWarning = ref(false);
const actionPending = ref(false);
const closeModalOpen = ref(false);
const inactivityReset = ref(false);
const feedbackBanner = ref<ConnectShyftFeedback | null>(null);
const policyRefusalBanner = ref('');
const policyErrorBanner = ref('');
const policySuccessBanner = ref('');
const policySuccessAuditReason = ref('');
const preferenceOverrideModalOpen = ref(false);
const preferenceOverrideReason = ref('');
const preferenceOverrideNote = ref('');
const preferenceOverrideError = ref('');
const preferenceOverrideAllowedReasons = ref<string[]>([]);
const pendingPreferenceOverrideAction = ref<'Text' | 'Send Message' | null>(null);
const addNeighborFormOpen = ref(false);
const addNeighborPhone = ref('');
const addNeighborSubmitting = ref(false);
const threadComposerBody = ref('');
const preferenceOverrideModalRef = ref<HTMLElement | null>(null);
const closeModalRef = ref<HTMLElement | null>(null);
const focusRingClass = CONNECTSHYFT_FOCUS_RING_CLASS;
const bodyTextStyle = {
  fontSize: `${CONNECTSHYFT_ACCESSIBILITY_LOCKS.minBodyTextPx}px`,
};
const tapTargetStyle = {
  minHeight: `${CONNECTSHYFT_ACCESSIBILITY_LOCKS.minTapTargetPx}px`,
};

const CONNECTSHYFT_OVERRIDE_REFUSAL_CODES = new Set([
  'CONNECTSHYFT_SMS_OVERRIDE_REASON_REQUIRED',
  'CONNECTSHYFT_SMS_OVERRIDE_REASON_INVALID',
  'CONNECTSHYFT_OUTBOUND_OVERRIDE_REASON_REQUIRED',
]);
const CONNECTSHYFT_MODAL_FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const resolveStateLabel = (state: ConnectShyftThreadDetail['state']): string => {
  if (state === 'CLAIMED') {
    return 'Claimed';
  }

  if (state === 'CLOSED') {
    return 'Closed';
  }

  return 'Unclaimed';
};

const resolveClaimContextLabelFromState = (state: ConnectShyftThreadDetail['state']): string => {
  if (state === 'CLAIMED') {
    return 'Claim context: Claimed conversation';
  }

  if (state === 'CLOSED') {
    return 'Claim context: Closed conversation';
  }

  return 'Claim context: Unclaimed conversation';
};

const role = computed(() => {
  const rawRole = typeof route.query.tenantRole === 'string'
    ? route.query.tenantRole
    : typeof route.query.role === 'string'
      ? route.query.role
      : '';
  return rawRole.trim().toUpperCase();
});

const actorUserId = computed(() => {
  const rawActorUserId = typeof route.query.actorUserId === 'string'
    ? route.query.actorUserId
    : typeof route.query.userId === 'string'
      ? route.query.userId
      : '';
  return rawActorUserId.trim() || null;
});

const isViewerRole = computed(() => role.value === 'TENANT_VIEWER');

const threadId = computed(() => {
  const rawValue = route.params.threadId;
  return typeof rawValue === 'string' ? rawValue.trim() : '';
});

const resolveQueryString = (...keys: string[]): string | null => {
  for (const key of keys) {
    const rawValue = route.query[key];
    if (typeof rawValue !== 'string') {
      continue;
    }

    const normalized = rawValue.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return null;
};

const testHarnessOperatorContactPointId = computed(() =>
  resolveQueryString('operatorContactPointId', 'callbackPhone', 'operatorPhone')
  || resolveConnectShyftDeterministicTestPhone(actorUserId.value, threadId.value)
);

const testHarnessNeighborTargetPhone = computed(() =>
  resolveQueryString('targetPhone', 'neighborPhone')
  || resolveConnectShyftDeterministicTestPhone(threadId.value, actorUserId.value)
);

const moduleAvailable = computed(() => availability.value.capabilities.module);
const inboxAvailable = computed(() => availability.value.capabilities.inbox);
const showUnavailableState = computed(() => !moduleAvailable.value || !inboxAvailable.value);

const unavailableMessage = computed(() => {
  if (availability.value.refusal?.message) {
    return sanitizeConnectShyftOperatorCopy(
      availability.value.refusal.message,
      'ConnectShyft is unavailable right now.',
    );
  }

  if (!moduleAvailable.value) {
    return 'ConnectShyft is currently unavailable for this tenant. Contact an administrator to restore access.';
  }

  return 'ConnectShyft inbox is currently unavailable for this tenant.';
});

const setFeedbackBanner = (
  taxonomy: ConnectShyftFeedbackTaxonomy,
  rawMessage: unknown,
  fallbackMessage: string,
): void => {
  feedbackBanner.value = createConnectShyftFeedback(taxonomy, rawMessage, fallbackMessage);
};

const clearFeedbackBanner = (): void => {
  feedbackBanner.value = null;
};

const clearPolicyBanners = (): void => {
  policyRefusalBanner.value = '';
  policyErrorBanner.value = '';
  policySuccessBanner.value = '';
  policySuccessAuditReason.value = '';
};

const resetPreferenceOverrideState = (): void => {
  preferenceOverrideReason.value = '';
  preferenceOverrideNote.value = '';
  preferenceOverrideError.value = '';
  preferenceOverrideAllowedReasons.value = [];
};

const closePreferenceOverrideModal = (): void => {
  preferenceOverrideModalOpen.value = false;
  pendingPreferenceOverrideAction.value = null;
  resetPreferenceOverrideState();
};

const resolveModalFocusableElements = (container: HTMLElement | null): HTMLElement[] => {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(CONNECTSHYFT_MODAL_FOCUSABLE_SELECTOR),
  );
};

const focusFirstModalElement = async (container: HTMLElement | null): Promise<void> => {
  await nextTick();
  const focusable = resolveModalFocusableElements(container);
  if (focusable.length > 0) {
    focusable[0].focus();
    return;
  }

  container?.focus();
};

const trapModalFocus = (event: KeyboardEvent, container: HTMLElement | null): void => {
  if (event.key !== 'Tab') {
    return;
  }

  const focusable = resolveModalFocusableElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement as HTMLElement | null;

  if (!active || !container?.contains(active)) {
    event.preventDefault();
    first.focus();
    return;
  }

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
    return;
  }

  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
};

const submitThreadComposerDraft = (): void => {
  const body = threadComposerBody.value.trim();
  if (body.length === 0) {
    return;
  }

  void executeThreadAction('Send Message', { body });
};

const handlePreferenceOverrideModalKeydown = (event: KeyboardEvent): void => {
  trapModalFocus(event, preferenceOverrideModalRef.value);
};

const handleCloseModalKeydown = (event: KeyboardEvent): void => {
  trapModalFocus(event, closeModalRef.value);
};

const formatOverrideReason = (reason: string): string => {
  return reason
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (token) => token.toUpperCase());
};

const showPreferenceOverrideRequiredChip = computed(() => {
  return preferenceOverrideModalOpen.value
    || pendingPreferenceOverrideAction.value !== null
    || preferenceOverrideError.value.length > 0;
});

const preferenceOverrideReasonOptions = computed<string[]>(() => {
  if (preferenceOverrideAllowedReasons.value.length > 0) {
    return [...preferenceOverrideAllowedReasons.value];
  }

  return [...CONNECTSHYFT_DEFAULT_SMS_OVERRIDE_REASONS];
});

const preferenceOverrideSubmitDisabled = computed(() => {
  return actionPending.value || preferenceOverrideReason.value.trim().length === 0;
});

const inactivityChipLabel = computed(() => {
  return inactivityReset.value ? 'Inactivity reset' : 'Inactivity stable';
});

const escalationChipLabel = computed(() => {
  if (!threadDetail.value) {
    return 'Monitoring';
  }
  const label = threadDetail.value.urgencyLabel.trim();
  return label || 'Monitoring';
});

const visibleActions = computed<string[]>(() => {
  if (isViewerRole.value) {
    return [];
  }

  if (!threadDetail.value) {
    return [];
  }

  return resolveSafeVisibleThreadActions({
    state: threadDetail.value.state,
    rawActions: threadDetail.value.actions,
  });
});

const showActionRefusalBanner = computed(() => {
  return isViewerRole.value || actionError.value.length > 0;
});

const actionBannerMessage = computed(() => {
  if (isViewerRole.value) {
    return 'Lifecycle actions are unavailable for your access level.';
  }

  return actionError.value;
});

const feedbackBannerClass = computed(() => {
  if (!feedbackBanner.value) {
    return 'border-slate-300 bg-slate-50 text-slate-900';
  }

  if (feedbackBanner.value.taxonomy === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  }

  if (feedbackBanner.value.taxonomy === 'refusal') {
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }

  return 'border-rose-200 bg-rose-50 text-rose-900';
});

const directoryNoticeTestId = computed(() => {
  if (route.query.directoryNotice === 'existing') {
    return 'connectshyft-directory-existing-thread-notice';
  }

  if (route.query.directoryNotice === 'new') {
    return 'connectshyft-directory-new-thread-notice';
  }

  return '';
});

const directoryNoticeMessage = computed(() => {
  if (route.query.directoryNotice === 'existing') {
    return 'Opened the existing active conversation for this neighbor.';
  }

  if (route.query.directoryNotice === 'new') {
    return 'Started a new conversation for this neighbor.';
  }

  return '';
});

const showContextualActionFeedback = computed(() => {
  return feedbackBanner.value !== null
    || directoryNoticeMessage.value.length > 0
    || showActionRefusalBanner.value
    || policyRefusalBanner.value.length > 0
    || policyErrorBanner.value.length > 0
    || policySuccessBanner.value.length > 0
    || policySuccessAuditReason.value.length > 0
    || lifecycleToast.value.length > 0
    || hiddenTransitionWarning.value;
});

const neighborsById = computed(() => {
  return new Map(threadNeighbors.value.map((neighbor) => [neighbor.neighborId, neighbor]));
});

const threadNeighbor = computed<ConnectShyftNeighbor | null>(() => {
  if (!threadDetail.value?.neighborId) {
    return null;
  }

  return neighborsById.value.get(threadDetail.value.neighborId) || null;
});

const neighborContextLabel = computed(() => {
  if (!threadDetail.value) {
    return 'Neighbor context unavailable';
  }

  return threadDetail.value.neighborContextLabel || 'Neighbor context: Active thread';
});

const threadDisplayName = computed(() => {
  if (!threadDetail.value) {
    return 'ConnectShyft Thread';
  }

  return resolveConnectShyftNeighborName(threadDetail.value, threadNeighbor.value);
});

const threadConferenceLabel = computed(() => {
  if (!threadDetail.value) {
    return 'Conference follow-up queue';
  }

  return resolveConnectShyftConferenceLabel(threadDetail.value);
});

const threadClaimLabel = computed(() => {
  if (!threadDetail.value) {
    return 'Ready to claim';
  }

  return resolveConnectShyftClaimLabel(threadDetail.value, actorUserId.value);
});

const threadOwnerLabel = computed(() => {
  if (!threadDetail.value || threadDetail.value.state !== 'CLAIMED') {
    return '';
  }

  if (actorUserId.value && threadDetail.value.claimedByUserId === actorUserId.value) {
    return 'Owner: you';
  }

  return 'Owner: another volunteer';
});

const threadPreviewText = computed(() => {
  if (!threadDetail.value) {
    return 'Conversation activity recorded.';
  }

  return resolveConnectShyftPreviewText(threadDetail.value);
});

const threadTimestampLabel = computed(() => {
  if (!threadDetail.value) {
    return '';
  }

  return formatConnectShyftTimestamp(threadDetail.value.lastActivityAtUtc);
});

const threadSnapshotNote = computed(() => {
  if (threadDetail.value?.voicemailIndicator) {
    return 'Keep the voicemail and the next volunteer step visible without leaking routing internals into the conversation flow.';
  }

  return 'Keep the case conversation front and center. Conference, claim status, and key contact context stay visible without cluttering the timeline.';
});

const timelineEvents = computed(() => {
  if (!threadDetail.value) {
    return [];
  }

  if (threadDetail.value.timeline.length > 0) {
    return threadDetail.value.timeline;
  }

  return [
    {
      eventId: `${threadDetail.value.threadId}-summary`,
      eventName: 'connectshyft.timeline.summary',
      summary: threadDetail.value.voicemailIndicator
        ? (threadDetail.value.voicemailLabel || 'Voicemail received')
        : (threadDetail.value.preview || threadDetail.value.summary || 'Conversation activity recorded.'),
      conversationType: threadDetail.value.voicemailIndicator ? 'voicemail' : 'message',
    },
  ];
});

const formatTimelineEventTitle = (eventName: string): string => {
  const normalized = eventName
    .replace(/^connectshyft\./i, '')
    .replace(/^timeline\./i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\./g, ' ')
    .trim();
  if (!normalized) {
    return 'Conversation update';
  }

  return normalized.replace(/\b\w/g, (token) => token.toUpperCase());
};

const resolveTimelineTone = (index: number): 'inbound' | 'outbound' => {
  return index % 2 === 0 ? 'inbound' : 'outbound';
};

const parseThreadActions = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
};

const isThreadState = (value: unknown): value is ConnectShyftThreadDetail['state'] => {
  return value === 'UNCLAIMED' || value === 'CLAIMED' || value === 'CLOSED';
};

const applyThreadUpdate = (payload: unknown): void => {
  if (!threadDetail.value || !payload || typeof payload !== 'object') {
    return;
  }

  const candidate = payload as {
    state?: unknown;
    stateLabel?: unknown;
    claimedByUserId?: unknown;
    claimed_by_user_id?: unknown;
    urgencyLabel?: unknown;
    escalation?: {
      stage?: unknown;
    };
    lastInboundCsNumberId?: unknown;
    last_inbound_cs_number_id?: unknown;
    preferredOutboundCsNumberId?: unknown;
    preferred_outbound_cs_number_id?: unknown;
    display?: {
      stateLabel?: unknown;
      claimContext?: unknown;
    };
    actions?: unknown;
  };

  const current = threadDetail.value;
  const nextStateCandidate = typeof candidate.state === 'string'
    ? candidate.state.trim().toUpperCase()
    : current.state;
  const nextState = isThreadState(nextStateCandidate)
    ? nextStateCandidate
    : current.state;

  const claimedByUserId = typeof candidate.claimedByUserId === 'string'
    ? candidate.claimedByUserId.trim()
    : typeof candidate.claimed_by_user_id === 'string'
      ? candidate.claimed_by_user_id.trim()
      : current.claimedByUserId;

  const escalationStage = typeof candidate.escalation?.stage === 'number'
    ? candidate.escalation.stage
    : current.escalationStage;
  const urgencyLabel = typeof candidate.urgencyLabel === 'string'
    ? candidate.urgencyLabel.trim()
    : current.urgencyLabel;
  const stateLabel = typeof candidate.stateLabel === 'string'
    ? candidate.stateLabel.trim()
    : typeof candidate.display?.stateLabel === 'string'
      ? candidate.display.stateLabel.trim()
      : resolveStateLabel(nextState);
  const claimContextLabel = typeof candidate.display?.claimContext === 'string'
    ? candidate.display.claimContext.trim()
    : resolveClaimContextLabelFromState(nextState);
  const nextActions = parseThreadActions(candidate.actions);
  const resolvedActions = resolveSafeVisibleThreadActions({
    state: nextState,
    rawActions: nextActions || current.actions,
  });

  threadDetail.value = {
    ...current,
    state: nextState,
    stateLabel,
    claimedByUserId: claimedByUserId || null,
    escalationStage,
    urgencyLabel,
    claimContextLabel,
    lastInboundCsNumberId: typeof candidate.lastInboundCsNumberId === 'string'
      ? candidate.lastInboundCsNumberId
      : typeof candidate.last_inbound_cs_number_id === 'string'
        ? candidate.last_inbound_cs_number_id
        : current.lastInboundCsNumberId,
    preferredOutboundCsNumberId: typeof candidate.preferredOutboundCsNumberId === 'string'
      ? candidate.preferredOutboundCsNumberId
      : typeof candidate.preferred_outbound_cs_number_id === 'string'
        ? candidate.preferred_outbound_cs_number_id
        : current.preferredOutboundCsNumberId,
    actions: resolvedActions,
    lifecycle: {
      reopenedByInbound: current.lifecycle?.reopenedByInbound === true,
    },
  };
};

const resolveOverrideAllowedReasons = (payload: unknown): string[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const candidate = payload as {
    preferencePolicy?: {
      allowedOverrideReasons?: unknown;
    };
    allowedOverrideReasons?: unknown;
  };

  const fromPolicy = Array.isArray(candidate.preferencePolicy?.allowedOverrideReasons)
    ? candidate.preferencePolicy?.allowedOverrideReasons
    : Array.isArray(candidate.allowedOverrideReasons)
      ? candidate.allowedOverrideReasons
      : [];

  return fromPolicy
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
};

const isPreferenceOverrideRefusal = (payload: {
  code?: unknown;
  data?: unknown;
}): boolean => {
  const code = typeof payload.code === 'string' ? payload.code : '';
  if (CONNECTSHYFT_OVERRIDE_REFUSAL_CODES.has(code)) {
    return true;
  }

  if (!payload.data || typeof payload.data !== 'object') {
    return false;
  }

  const data = payload.data as {
    preferencePolicy?: {
      overrideRequired?: unknown;
    };
  };

  return data.preferencePolicy?.overrideRequired === true;
};

const openPreferenceOverrideModal = (input: {
  action: 'Text' | 'Send Message';
  message: string;
  allowedReasons: string[];
}): void => {
  if (pendingPreferenceOverrideAction.value !== input.action) {
    preferenceOverrideReason.value = '';
    preferenceOverrideNote.value = '';
  }

  pendingPreferenceOverrideAction.value = input.action;
  preferenceOverrideModalOpen.value = true;
  preferenceOverrideError.value = input.message;
  preferenceOverrideAllowedReasons.value = input.allowedReasons;
};

const executeThreadAction = async (
  action: string,
  options: {
    overrideReason?: string | null;
    overrideNote?: string | null;
    body?: string | null;
  } = {},
): Promise<boolean> => {
  if (!threadDetail.value || !threadId.value) {
    return false;
  }

  if (isViewerRole.value) {
    actionError.value = 'Lifecycle actions are unavailable for your access level.';
    setFeedbackBanner(
      'refusal',
      actionError.value,
      'Lifecycle actions are unavailable for your access level.',
    );
    return false;
  }

  const basePath = `/connectshyft/threads/${encodeURIComponent(threadId.value)}`;
  let path = '';
  let payload: Record<string, unknown> = {
    orgUnitId: threadDetail.value.orgUnitId,
  };

  if (action === 'Claim') {
    path = `${basePath}/claim`;
  } else if (action === 'Take Over') {
    path = `${basePath}/takeover`;
    payload = {
      ...payload,
      reason: 'operator-takeover',
    };
  } else if (action === 'Close') {
    path = `${basePath}/close`;
    payload = {
      ...payload,
      resolution: 'operator-close',
    };
  } else if (action === 'Call') {
    path = `${basePath}/call`;
    payload = {
      ...payload,
      operatorContactPointId: testHarnessOperatorContactPointId.value || undefined,
      targetPhone: testHarnessNeighborTargetPhone.value || undefined,
    };
  } else if (action === 'Send Message' || action === 'Text') {
    path = `${basePath}/messages`;
    payload = {
      ...payload,
      channel: 'sms',
      body: options.body || 'Operator outbound message.',
      overrideReason: options.overrideReason || undefined,
      overrideNote: options.overrideNote || undefined,
    };
  } else {
    actionError.value = `Unsupported action: ${action}`;
    setFeedbackBanner('error', actionError.value, 'Unsupported thread action.');
    return false;
  }

  clearPolicyBanners();
  hiddenTransitionWarning.value = false;
  actionPending.value = true;
  try {
    const response = await api.post(path, payload, {
      headers: buildConnectShyftTestOverrideHeaders(),
    });

    const envelope = (response.data || {}) as {
      ok?: boolean;
      code?: unknown;
      message?: string;
      errorType?: unknown;
      refusalType?: unknown;
      data?: {
        thread?: unknown;
        lifecycleEvent?: unknown;
        operatorFeedback?: unknown;
        operatorFeedbackMeta?: unknown;
        preferencePolicy?: {
          override?: {
            reason?: unknown;
          };
        };
        uiFeedback?: {
          severity?: unknown;
          message?: unknown;
          heading?: unknown;
          hiddenTransition?: unknown;
        };
      };
    };

    if (envelope.ok !== true) {
      const refusalMessage = sanitizeConnectShyftOperatorCopy(
        envelope.message,
        'Unable to complete that thread action.',
      );

      applyThreadUpdate(envelope.data?.thread);

      const refusalLifecycleEvent = typeof envelope.data?.lifecycleEvent === 'string'
        ? envelope.data.lifecycleEvent
        : '';

      const refusalOperatorFeedbackMeta = envelope.data?.operatorFeedbackMeta
        && typeof envelope.data.operatorFeedbackMeta === 'object'
        ? envelope.data.operatorFeedbackMeta as {
          heading?: unknown;
          hiddenTransition?: unknown;
        }
        : envelope.data?.uiFeedback
          && typeof envelope.data.uiFeedback === 'object'
          ? envelope.data.uiFeedback as {
            heading?: unknown;
            hiddenTransition?: unknown;
          }
          : null;

      const refusalHiddenTransitionDetected = refusalOperatorFeedbackMeta?.hiddenTransition === true;
      hiddenTransitionWarning.value = refusalHiddenTransitionDetected;

      if (refusalLifecycleEvent.includes('thread_reopened_by_user')) {
        const reopenHeading = sanitizeConnectShyftOperatorCopy(
          refusalOperatorFeedbackMeta?.heading,
          'Conversation reopened. Escalation and inactivity timers were reset.',
        );
        lifecycleToast.value = reopenHeading;
        inactivityReset.value = true;
        if (threadDetail.value) {
          threadDetail.value.escalationStage = 0;
        }
      } else {
        lifecycleToast.value = '';
        inactivityReset.value = false;
      }

      const requiresOverride = isPreferenceOverrideRefusal({
        code: envelope.code,
        data: envelope.data,
      });

      if (requiresOverride && (action === 'Send Message' || action === 'Text')) {
        const nextStepMessage = `${refusalMessage} Add override reason and submit again.`;
        actionError.value = '';
        policyRefusalBanner.value = nextStepMessage;
        setFeedbackBanner('refusal', refusalMessage, 'Override reason required before sending SMS.');
        openPreferenceOverrideModal({
          action,
          message: refusalMessage,
          allowedReasons: resolveOverrideAllowedReasons(envelope.data),
        });
        return false;
      }

      actionError.value = refusalMessage;
      if (action === 'Send Message' || action === 'Text' || action === 'Call') {
        policyRefusalBanner.value = refusalMessage;
      }
      setFeedbackBanner(
        'refusal',
        refusalMessage,
        'Unable to complete that thread action.',
      );
      return false;
    }

    actionError.value = '';
    lifecycleToast.value = '';
    preferenceOverrideError.value = '';

    applyThreadUpdate(envelope.data?.thread);

    const lifecycleEvent = typeof envelope.data?.lifecycleEvent === 'string'
      ? envelope.data.lifecycleEvent
      : '';

    const operatorFeedbackMeta = envelope.data?.operatorFeedbackMeta
      && typeof envelope.data.operatorFeedbackMeta === 'object'
      ? envelope.data.operatorFeedbackMeta as {
        heading?: unknown;
        hiddenTransition?: unknown;
      }
      : envelope.data?.uiFeedback
        && typeof envelope.data.uiFeedback === 'object'
        ? envelope.data.uiFeedback as {
          heading?: unknown;
          hiddenTransition?: unknown;
        }
        : null;

    const hiddenTransitionDetected = operatorFeedbackMeta?.hiddenTransition === true;
    hiddenTransitionWarning.value = hiddenTransitionDetected;

    if (lifecycleEvent.includes('thread_reopened_by_user')) {
      const reopenHeading = sanitizeConnectShyftOperatorCopy(
        operatorFeedbackMeta?.heading,
        'Conversation reopened. Escalation and inactivity timers were reset.',
      );
      lifecycleToast.value = reopenHeading;
      inactivityReset.value = true;
      if (threadDetail.value) {
        threadDetail.value.escalationStage = 0;
      }
    } else {
      inactivityReset.value = false;
    }

    const operatorFeedback = typeof envelope.data?.operatorFeedback === 'string'
      ? envelope.data.operatorFeedback
      : '';
    const uiFeedbackMessage = sanitizeConnectShyftOperatorCopy(
      envelope.data?.uiFeedback?.message,
      operatorFeedback || envelope.message || 'Thread action completed.',
    );

    const overrideReason = typeof envelope.data?.preferencePolicy?.override?.reason === 'string'
      ? envelope.data.preferencePolicy.override.reason
      : '';
    if (overrideReason) {
      policySuccessAuditReason.value = overrideReason.toUpperCase();
      policySuccessBanner.value = 'Override applied. Outbound message dispatched.';
      preferenceOverrideModalOpen.value = false;
      pendingPreferenceOverrideAction.value = null;
      resetPreferenceOverrideState();
    } else if (action === 'Send Message' || action === 'Text' || action === 'Call') {
      policySuccessBanner.value = uiFeedbackMessage;
    }

    setFeedbackBanner(
      'success',
      uiFeedbackMessage,
      'Thread action completed.',
    );
    if (action === 'Send Message' && options.body) {
      threadComposerBody.value = '';
    }
    return true;
  } catch (error: unknown) {
    const payload = (
      error as {
        response?: {
          data?: {
            message?: unknown;
            data?: {
              uiFeedback?: {
                message?: unknown;
              };
            };
          };
        };
      }
    )?.response?.data;
    actionError.value = sanitizeConnectShyftOperatorCopy(
      payload?.data?.uiFeedback?.message ?? payload?.message,
      'Unable to complete that thread action.',
    );
    if (action === 'Send Message' || action === 'Text' || action === 'Call') {
      policyErrorBanner.value = actionError.value;
    }
    setFeedbackBanner('error', actionError.value, 'Unable to complete that thread action.');
    return false;
  } finally {
    actionPending.value = false;
  }
};

const submitPreferenceOverride = async (): Promise<void> => {
  const pendingAction = pendingPreferenceOverrideAction.value;
  if (!pendingAction) {
    return;
  }

  const normalizedReason = preferenceOverrideReason.value.trim();
  if (!normalizedReason) {
    preferenceOverrideError.value = 'Override reason is required before sending SMS.';
    policyRefusalBanner.value = 'Override reason required. Select a reason and submit again.';
    return;
  }

  preferenceOverrideError.value = '';
  await executeThreadAction(pendingAction, {
    overrideReason: normalizedReason,
    overrideNote: preferenceOverrideNote.value.trim() || null,
  });
};

const closeAddNeighborForm = (): void => {
  addNeighborFormOpen.value = false;
  addNeighborPhone.value = '';
};

const toggleAddNeighborForm = (): void => {
  if (addNeighborFormOpen.value) {
    closeAddNeighborForm();
    return;
  }

  addNeighborFormOpen.value = true;
};

const submitAddNeighbor = async (): Promise<void> => {
  if (!threadDetail.value || isViewerRole.value) {
    setFeedbackBanner(
      'refusal',
      'Add Neighbor is unavailable for your access level.',
      'Add Neighbor is unavailable for your access level.',
    );
    return;
  }

  const phone = addNeighborPhone.value.trim();
  if (!phone) {
    setFeedbackBanner(
      'refusal',
      'Add a phone number before creating a neighbor.',
      'Add a phone number before creating a neighbor.',
    );
    return;
  }

  addNeighborSubmitting.value = true;
  try {
    const result = await createConnectShyftNeighbor({
      firstName: 'Neighbor',
      lastName: 'Contact',
      phones: [
        {
          label: 'mobile',
          value: phone,
        },
      ],
    });

    if (!result.ok) {
      setFeedbackBanner(
        'refusal',
        result.message,
        'Unable to add neighbor right now.',
      );
      return;
    }

    setFeedbackBanner(
      'success',
      'Neighbor added to this orgUnit context.',
      'Neighbor added.',
    );
    closeAddNeighborForm();
  } catch (_error: unknown) {
    setFeedbackBanner('error', '', 'Unable to add neighbor right now.');
  } finally {
    addNeighborSubmitting.value = false;
  }
};

const confirmCloseThread = async () => {
  closeModalOpen.value = false;
  await executeThreadAction('Close');
};

const handleThreadAction = (action: string): void => {
  if (action === 'Close') {
    closeModalOpen.value = true;
    return;
  }

  if (
    (action === 'Send Message' || action === 'Text')
    && pendingPreferenceOverrideAction.value !== null
    && !preferenceOverrideModalOpen.value
  ) {
    preferenceOverrideModalOpen.value = true;
    return;
  }

  void executeThreadAction(action);
};

const loadThreadNeighbors = async (): Promise<void> => {
  const neighborsResult = await fetchConnectShyftNeighborsCollection();
  if (!neighborsResult.ok) {
    threadNeighbors.value = [];
    return;
  }

  threadNeighbors.value = neighborsResult.neighbors;
};

const refreshThreadDetail = async () => {
  availability.value = await fetchConnectShyftAvailability();
  if (showUnavailableState.value) {
    threadDetail.value = null;
    threadNeighbors.value = [];
    detailLoadError.value = '';
    threadComposerBody.value = '';
    closeAddNeighborForm();
    closePreferenceOverrideModal();
    clearPolicyBanners();
    clearFeedbackBanner();
    return;
  }

  await loadThreadNeighbors();

  const detailResult = await fetchConnectShyftThreadDetail(threadId.value);
  if (!detailResult.ok) {
    threadDetail.value = null;
    detailLoadError.value = sanitizeConnectShyftOperatorCopy(
      detailResult.message,
      'Unable to load thread detail.',
    );
    threadComposerBody.value = '';
    setFeedbackBanner(
      'error',
      detailLoadError.value,
      'Unable to load thread detail.',
    );
    closeAddNeighborForm();
    closePreferenceOverrideModal();
    clearPolicyBanners();
    return;
  }

  threadDetail.value = {
    ...detailResult.thread,
    actions: resolveSafeVisibleThreadActions({
      state: detailResult.thread.state,
      rawActions: detailResult.thread.actions,
    }),
  };
  detailLoadError.value = '';
  lifecycleToast.value = '';
  actionError.value = '';
  threadComposerBody.value = '';
  hiddenTransitionWarning.value = false;
  closeModalOpen.value = false;
  inactivityReset.value = false;
  closeAddNeighborForm();
  closePreferenceOverrideModal();
  clearPolicyBanners();
  clearFeedbackBanner();
};

onMounted(() => {
  void refreshThreadDetail();
});

watch(preferenceOverrideModalOpen, (isOpen) => {
  if (!isOpen) {
    return;
  }

  void focusFirstModalElement(preferenceOverrideModalRef.value);
});

watch(closeModalOpen, (isOpen) => {
  if (!isOpen) {
    return;
  }

  void focusFirstModalElement(closeModalRef.value);
});

watch(
  () => route.fullPath,
  () => {
    void refreshThreadDetail();
  },
);
</script>
