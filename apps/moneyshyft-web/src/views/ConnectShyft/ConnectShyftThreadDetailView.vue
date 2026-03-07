<template>
  <main class="min-h-screen bg-slate-50 px-4 py-6 pb-32 sm:py-8">
    <section class="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header class="mb-6">
        <h1 v-if="showUnavailableState" class="text-2xl font-semibold text-slate-900">
          ConnectShyft unavailable
        </h1>
        <h1 v-else class="text-2xl font-semibold text-slate-900">
          ConnectShyft Thread Detail
        </h1>

        <p
          v-if="showUnavailableState"
          :style="bodyTextStyle"
          class="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900"
        >
          {{ unavailableMessage }}
        </p>
      </header>

      <section
        v-if="!showUnavailableState"
        data-testid="connectshyft-thread-detail"
        class="rounded-md border border-slate-200 p-4"
      >
        <div data-testid="connectshyft-thread-surface" class="space-y-4" :style="bodyTextStyle">
          <p
            v-if="feedbackBanner"
            data-testid="connectshyft-feedback-banner"
            :data-feedback-taxonomy="feedbackBanner.taxonomy"
            class="rounded border px-3 py-2 text-base"
            :class="feedbackBannerClass"
          >
            {{ feedbackBanner.message }}
          </p>

          <p
            data-testid="connectshyft-live-region-status"
            aria-live="polite"
            class="sr-only"
          >
            {{ feedbackBanner ? feedbackBanner.announcement : '' }}
          </p>

          <p
            v-if="detailLoadError"
            class="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-base text-amber-900"
          >
            {{ detailLoadError }}
          </p>

          <template v-else-if="threadSurfaceModel">
            <section
              data-testid="connectshyft-thread-primary-context-panel"
              class="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <p
                data-testid="connectshyft-thread-context-neighbor"
                class="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-700"
              >
                {{ threadSurfaceModel.display.neighborContext }}
              </p>
              <p
                data-testid="connectshyft-thread-context-conference"
                class="mt-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-700"
              >
                {{ threadSurfaceModel.display.conferenceContext }}
              </p>
              <p
                data-testid="connectshyft-thread-context-claim"
                class="mt-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-700"
              >
                {{ threadClaimContextLabel }}
              </p>
            </section>

            <ConnectShyftThreadHeader
              v-if="threadDetail"
              :title="threadSurfaceModel.display.title"
              :neighbor-context-label="threadSurfaceModel.display.neighborContext"
              :conference-context-label="threadSurfaceModel.display.conferenceContext"
              :state-label="threadSurfaceModel.display.stateLabel"
              :owner-label="threadSurfaceModel.state === 'CLAIMED' ? `Owner: ${threadSurfaceModel.claimedByUserId || 'unassigned'}` : ''"
              :escalation-label="escalationChipLabel"
              :inactivity-label="inactivityChipLabel"
              :voicemail-indicator="threadSurfaceModel.voicemailIndicator"
            />

            <ConnectShyftMessageBubble
              title="Conversation summary"
              :body="threadSurfaceModel.display.title"
              :meta-label="threadSurfaceModel.display.neighborContext"
            />

            <section
              data-testid="connectshyft-thread-timeline"
              class="rounded-xl border border-slate-200 bg-white p-3"
            >
              <p class="text-base font-semibold text-slate-900">Conversation timeline</p>
              <div class="mt-2 space-y-2">
                <article
                  v-for="event in threadTimelineEvents"
                  :key="`${event.eventName}-${event.occurredAtUtc}-${event.summary}`"
                  :data-testid="event.conversationType === 'voicemail'
                    ? 'connectshyft-thread-timeline-event-voicemail'
                    : 'connectshyft-thread-timeline-event'"
                  class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"
                >
                  <p class="font-medium text-slate-900">{{ event.summary }}</p>
                  <p class="text-sm text-slate-600">
                    {{ event.conversationType === 'voicemail' ? 'Voicemail' : 'Timeline event' }}
                  </p>
                </article>
              </div>
            </section>

            <ConnectShyftVoicemailCard
              :visible="threadSurfaceModel.voicemailIndicator"
              :label="threadSurfaceModel.display.voicemailLabel || 'Voicemail waiting for review'"
            />

            <p
              v-if="showPreferenceOverrideRequiredChip"
              data-testid="connectshyft-preference-override-required-chip"
              class="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-base text-amber-900"
            >
              Override required for outbound SMS. Add an approved reason before sending.
            </p>

            <p
              v-if="showActionRefusalBanner"
              data-testid="connectshyft-thread-action-refusal-banner"
              class="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-base text-amber-900"
            >
              {{ actionBannerMessage }}
            </p>

            <p
              v-if="policyRefusalBanner"
              data-testid="connectshyft-policy-refusal-banner"
              role="alert"
              aria-live="assertive"
              class="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-base text-amber-900"
            >
              {{ policyRefusalBanner }}
            </p>

            <p
              v-if="policyErrorBanner"
              data-testid="connectshyft-policy-error-banner"
              role="alert"
              aria-live="assertive"
              class="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-base text-rose-900"
            >
              {{ policyErrorBanner }}
            </p>

            <p
              v-if="policySuccessBanner"
              data-testid="connectshyft-policy-success-banner"
              role="status"
              aria-live="polite"
              class="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-base text-emerald-900"
            >
              {{ policySuccessBanner }}
            </p>

            <p
              v-if="contextualActionFeedback"
              data-testid="connectshyft-thread-action-feedback-contextual"
              role="status"
              aria-live="polite"
              class="rounded border px-3 py-2 text-base"
              :class="contextualActionFeedbackClass"
            >
              {{ contextualActionFeedback.message }}
            </p>

            <p
              v-if="policySuccessAuditReason"
              data-testid="connectshyft-preference-override-audit-chip"
              class="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-base font-medium text-emerald-900"
            >
              Override reason: {{ policySuccessAuditReason }}
            </p>

            <p
              v-if="lifecycleToast"
              data-testid="connectshyft-thread-reopened-toast"
              class="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-base text-emerald-900"
            >
              {{ lifecycleToast }}
            </p>

            <p
              v-if="hiddenTransitionWarning"
              data-testid="connectshyft-hidden-transition-warning"
              class="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-base text-rose-900"
            >
              Hidden lifecycle transition detected. Refresh thread context and retry.
            </p>

            <ConnectShyftThreadActionBar
              :actions="visibleActions"
              :action-pending="actionPending || addNeighborSubmitting"
              :show-add-neighbor-action="!isViewerRole"
              :focus-ring-class="focusRingClass"
              :tap-target-style="tapTargetStyle"
              @action="handleThreadAction"
              @add-neighbor="toggleAddNeighborForm"
            />

            <ConnectShyftComposer
              v-model="composerMessage"
              :disabled="actionPending || addNeighborSubmitting || isViewerRole"
              :submit-disabled="composerSubmitDisabled"
              submit-label="Send Message"
              :focus-ring-class="focusRingClass"
              :tap-target-style="tapTargetStyle"
              @submit="submitComposerMessage"
            />

            <section
              v-if="addNeighborFormOpen && !isViewerRole"
              data-testid="connectshyft-add-neighbor-form"
              class="rounded border border-slate-300 bg-slate-50 p-4"
            >
              <p class="text-base text-slate-900">
                Add a neighbor contact to this orgUnit context.
              </p>
              <label class="mt-3 block text-base text-slate-700" for="connectshyft-add-neighbor-phone">
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
                  'mt-2 min-h-[44px] w-full rounded border border-slate-300 px-3 py-2 text-base text-slate-900',
                  focusRingClass,
                ]"
                :style="tapTargetStyle"
                :disabled="addNeighborSubmitting || actionPending"
              >
              <div class="mt-3 flex gap-2">
                <button
                  type="button"
                  data-testid="connectshyft-add-neighbor-submit-action"
                  :class="[
                    'min-h-[44px] rounded bg-emerald-700 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-60',
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
                    'min-h-[44px] rounded border border-slate-300 px-4 py-2 text-base font-medium text-slate-700',
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
              class="rounded border border-slate-300 bg-slate-50 p-4"
              @keydown="handlePreferenceOverrideModalKeydown"
            >
              <h2
                id="connectshyft-preference-override-title"
                class="text-base font-semibold text-slate-900"
              >
                Outbound SMS policy requires an approved override reason.
              </h2>
              <label
                class="mt-3 block text-base text-slate-700"
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
                  'mt-2 min-h-[44px] w-full rounded border border-slate-300 px-3 py-2 text-base text-slate-900',
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
                class="mt-3 block text-base text-slate-700"
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
                  'mt-2 min-h-[44px] w-full rounded border border-slate-300 px-3 py-2 text-base text-slate-900',
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
                class="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-base text-amber-900"
              >
                {{ preferenceOverrideError }}
              </p>

              <div class="mt-3 flex gap-2">
                <button
                  type="button"
                  data-testid="connectshyft-preference-override-submit"
                  :class="[
                    'min-h-[44px] rounded bg-slate-900 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-60',
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
                    'min-h-[44px] rounded border border-slate-300 px-4 py-2 text-base font-medium text-slate-700',
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
              class="rounded border border-slate-300 bg-slate-50 p-4"
              @keydown="handleCloseModalKeydown"
            >
              <h2
                id="connectshyft-close-thread-title"
                class="text-base font-semibold text-slate-900"
              >
                Are you sure you want to close this thread?
              </h2>
              <div class="mt-3 flex gap-2">
                <button
                  type="button"
                  :class="[
                    'min-h-[44px] rounded bg-slate-900 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-60',
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
                    'min-h-[44px] rounded border border-slate-300 px-4 py-2 text-base font-medium text-slate-700',
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
          </template>

          <p v-else class="text-base text-slate-600">Loading thread detail...</p>
        </div>
      </section>
    </section>

    <ConnectShyftPrimaryNav />
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import ConnectShyftPrimaryNav from '@/components/connectshyft/ConnectShyftPrimaryNav.vue';
import ConnectShyftComposer from '@/components/connectshyft/ConnectShyftComposer.vue';
import ConnectShyftMessageBubble from '@/components/connectshyft/ConnectShyftMessageBubble.vue';
import ConnectShyftThreadActionBar from '@/components/connectshyft/ConnectShyftThreadActionBar.vue';
import ConnectShyftThreadHeader from '@/components/connectshyft/ConnectShyftThreadHeader.vue';
import ConnectShyftVoicemailCard from '@/components/connectshyft/ConnectShyftVoicemailCard.vue';
import api from '@/services/api';
import {
  DEFAULT_CONNECTSHYFT_AVAILABILITY,
  fetchConnectShyftAvailability,
  buildConnectShyftTestOverrideHeaders,
} from '@/features/connectshyft/flags';
import { createConnectShyftNeighbor } from '@/features/connectshyft/neighbors';
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
const composerMessage = ref('');
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

const role = computed(() => {
  const rawRole = typeof route.query.tenantRole === 'string'
    ? route.query.tenantRole
    : typeof route.query.role === 'string'
      ? route.query.role
      : '';
  return rawRole.trim().toUpperCase();
});

const isViewerRole = computed(() => role.value === 'TENANT_VIEWER');

const threadId = computed(() => {
  const rawValue = route.params.threadId;
  return typeof rawValue === 'string' ? rawValue.trim() : '';
});

const moduleAvailable = computed(() => availability.value.capabilities.module);
const inboxAvailable = computed(() => availability.value.capabilities.inbox);
const showUnavailableState = computed(() => !moduleAvailable.value || !inboxAvailable.value);

const threadSurfaceModel = computed<ConnectShyftThreadDetail | null>(() => {
  if (showUnavailableState.value) {
    return null;
  }

  if (threadDetail.value) {
    return threadDetail.value;
  }

  const fallbackThreadId = threadId.value || 'thread-unavailable';
  return {
    threadId: fallbackThreadId,
    orgUnitId: '',
    state: 'UNCLAIMED',
    claimedByUserId: null,
    bucket: 'inbox',
    escalationStage: 0,
    priorityRank: 0,
    urgencyLabel: '',
    lastActivityAtUtc: '',
    lastInboundCsNumberId: '',
    preferredOutboundCsNumberId: '',
    preferredOutboundContext: {
      csNumberId: '',
      label: '',
    },
    voicemailIndicator: false,
    voicemailLabel: null,
    summary: 'Conversation unavailable.',
    display: {
      title: 'Conversation unavailable.',
      preview: 'Conversation details are unavailable.',
      urgencyLabel: 'Context unavailable',
      stateLabel: 'Unclaimed',
      inboundContext: 'Inbound line unavailable',
      outboundContext: 'Outbound line unavailable',
      neighborContext: 'Neighbor context unavailable',
      conferenceContext: 'Conference context unavailable',
      claimContext: 'Claim context unavailable',
      voicemailLabel: '',
    },
    actions: [],
    timeline: [],
    lifecycle: {
      reopenedByInbound: false,
    },
  };
});

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

const threadClaimContextLabel = computed(() => {
  if (!threadSurfaceModel.value) {
    return 'Claim context unavailable';
  }

  return threadSurfaceModel.value.display.claimContext
    || (
      threadSurfaceModel.value.state === 'UNCLAIMED'
        ? 'Claim context: Unclaimed conversation'
        : threadSurfaceModel.value.state === 'CLAIMED'
          ? 'Claim context: Claimed conversation'
          : 'Claim context: Closed conversation'
    );
});

const threadTimelineEvents = computed(() => {
  if (!threadSurfaceModel.value) {
    return [];
  }

  if (threadSurfaceModel.value.timeline.length > 0) {
    return threadSurfaceModel.value.timeline;
  }

  if (threadSurfaceModel.value.voicemailIndicator) {
    return [
      {
        eventName: 'connectshyft.voicemail.placeholder',
        conversationType: 'voicemail' as const,
        renderMode: 'inline' as const,
        firstClass: true,
        occurredAtUtc: '',
        summary: threadSurfaceModel.value.display.voicemailLabel || 'Voicemail received',
      },
    ];
  }

  return [
    {
      eventName: 'connectshyft.timeline.placeholder',
      conversationType: 'lifecycle' as const,
      renderMode: 'inline' as const,
      firstClass: false,
      occurredAtUtc: '',
      summary: 'Conversation timeline is ready.',
    },
  ];
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

const composerSubmitDisabled = computed(() => {
  const hasSendAction = visibleActions.value.includes('Send Message')
    || visibleActions.value.includes('Text');
  return actionPending.value || composerMessage.value.trim().length === 0 || !hasSendAction;
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

const contextualActionFeedback = computed<{
  taxonomy: 'success' | 'refusal' | 'error';
  message: string;
} | null>(() => {
  if (policyRefusalBanner.value) {
    return {
      taxonomy: 'refusal',
      message: policyRefusalBanner.value,
    };
  }

  if (policyErrorBanner.value) {
    return {
      taxonomy: 'error',
      message: policyErrorBanner.value,
    };
  }

  if (policySuccessBanner.value) {
    return {
      taxonomy: 'success',
      message: policySuccessBanner.value,
    };
  }

  return null;
});

const contextualActionFeedbackClass = computed(() => {
  if (!contextualActionFeedback.value) {
    return 'border-slate-300 bg-slate-50 text-slate-900';
  }

  if (contextualActionFeedback.value.taxonomy === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  }

  if (contextualActionFeedback.value.taxonomy === 'refusal') {
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }

  return 'border-rose-200 bg-rose-50 text-rose-900';
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
  const lastInboundCsNumberId = typeof candidate.lastInboundCsNumberId === 'string'
    ? candidate.lastInboundCsNumberId
    : typeof candidate.last_inbound_cs_number_id === 'string'
      ? candidate.last_inbound_cs_number_id
      : current.lastInboundCsNumberId;
  const preferredOutboundCsNumberId = typeof candidate.preferredOutboundCsNumberId === 'string'
    ? candidate.preferredOutboundCsNumberId
    : typeof candidate.preferred_outbound_cs_number_id === 'string'
      ? candidate.preferred_outbound_cs_number_id
      : current.preferredOutboundCsNumberId;
  const nextActions = parseThreadActions(candidate.actions);
  const resolvedActions = resolveSafeVisibleThreadActions({
    state: nextState,
    rawActions: nextActions || current.actions,
  });
  const displayStateLabel = nextState === 'UNCLAIMED'
    ? 'Unclaimed'
    : nextState === 'CLAIMED'
      ? 'Claimed'
      : 'Closed';
  const displayUrgencyLabel = sanitizeConnectShyftOperatorCopy(
    urgencyLabel,
    nextState === 'UNCLAIMED' ? 'New conversation' : 'Active follow-up',
  );
  const displayInboundContext = lastInboundCsNumberId
    ? 'cs-number inbound line configured'
    : 'Inbound line unavailable';
  const displayOutboundContext = current.preferredOutboundContext.label
    ? sanitizeConnectShyftOperatorCopy(
      current.preferredOutboundContext.label,
      'cs-number outbound line configured',
    )
    : preferredOutboundCsNumberId
      ? 'cs-number outbound line configured'
      : 'Outbound line unavailable';
  const displayTitle = current.display.title || current.summary || 'Conversation in progress.';

  threadDetail.value = {
    ...current,
    state: nextState,
    claimedByUserId: claimedByUserId || null,
    escalationStage,
    urgencyLabel,
    lastInboundCsNumberId,
    preferredOutboundCsNumberId,
    actions: resolvedActions,
    display: {
      ...current.display,
      title: displayTitle,
      urgencyLabel: displayUrgencyLabel,
      stateLabel: displayStateLabel,
      inboundContext: displayInboundContext,
      outboundContext: displayOutboundContext,
      neighborContext: `Neighbor context: ${displayTitle}`,
      conferenceContext: `Conference context: ${displayOutboundContext}`,
      claimContext: nextState === 'UNCLAIMED'
        ? 'Claim context: Unclaimed conversation'
        : nextState === 'CLAIMED'
          ? 'Claim context: Claimed conversation'
          : 'Claim context: Closed conversation',
      voicemailLabel: current.display.voicemailLabel || 'Voicemail waiting for review',
    },
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
    body?: string | null;
    overrideReason?: string | null;
    overrideNote?: string | null;
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
      const refusalUiSeverity = typeof envelope.data?.uiFeedback?.severity === 'string'
        ? envelope.data.uiFeedback.severity.trim().toLowerCase()
        : '';
      const envelopeErrorType = typeof envelope.errorType === 'string'
        ? envelope.errorType.trim().toLowerCase()
        : '';
      const refusalMapsToError = refusalUiSeverity === 'error'
        || envelopeErrorType === 'system';

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
        if (refusalMapsToError) {
          policyErrorBanner.value = refusalMessage;
        } else if (action === 'Send Message' || action === 'Text') {
          policyRefusalBanner.value = refusalMessage;
        }
      }
      setFeedbackBanner(
        refusalMapsToError ? 'error' : 'refusal',
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

const submitComposerMessage = (): void => {
  const messageBody = composerMessage.value.trim();
  if (!messageBody) {
    return;
  }

  const preferredAction = visibleActions.value.includes('Send Message')
    ? 'Send Message'
    : visibleActions.value.includes('Text')
      ? 'Text'
      : null;
  if (!preferredAction) {
    return;
  }

  composerMessage.value = '';
  void executeThreadAction(preferredAction, {
    body: messageBody,
  });
};

const refreshThreadDetail = async () => {
  availability.value = await fetchConnectShyftAvailability();
  if (showUnavailableState.value) {
    threadDetail.value = null;
    detailLoadError.value = '';
    composerMessage.value = '';
    closeAddNeighborForm();
    closePreferenceOverrideModal();
    clearPolicyBanners();
    clearFeedbackBanner();
    return;
  }

  const detailResult = await fetchConnectShyftThreadDetail(threadId.value);
  if (!detailResult.ok) {
    threadDetail.value = null;
    composerMessage.value = '';
    detailLoadError.value = sanitizeConnectShyftOperatorCopy(
      detailResult.message,
      'Unable to load thread detail.',
    );
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
  composerMessage.value = '';
  detailLoadError.value = '';
  lifecycleToast.value = '';
  actionError.value = '';
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
