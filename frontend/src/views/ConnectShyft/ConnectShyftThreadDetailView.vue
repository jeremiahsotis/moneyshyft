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

          <template v-else-if="threadDetail">
            <header class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p data-testid="connectshyft-thread-detail-body-copy" class="text-base font-semibold text-slate-900">
                {{ threadDetail.summary || threadDetail.threadId }}
              </p>

              <div class="mt-3 grid gap-2 sm:grid-cols-2">
                <p
                  data-testid="connectshyft-thread-header-neighbor-context"
                  class="rounded-md border border-slate-200 bg-white px-3 py-2 text-base text-slate-700"
                >
                  {{ neighborContextLabel }}
                </p>
                <p
                  data-testid="connectshyft-thread-header-conference-context"
                  class="rounded-md border border-slate-200 bg-white px-3 py-2 text-base text-slate-700"
                >
                  {{ conferenceContextLabel }}
                </p>
              </div>

              <div class="mt-3 flex flex-wrap items-center gap-2 text-base">
                <span
                  data-testid="connectshyft-thread-id-chip"
                  class="rounded-full border border-slate-300 bg-white px-2 py-1 text-slate-800"
                >
                  Thread {{ threadDetail.threadId }}
                </span>
                <span
                  data-testid="connectshyft-thread-state-chip"
                  class="rounded-full border border-slate-300 bg-white px-2 py-1 text-slate-800"
                >
                  {{ threadDetail.state }}
                </span>
                <span
                  v-if="threadDetail.state === 'CLAIMED'"
                  data-testid="connectshyft-thread-owner-chip"
                  class="rounded-full border border-slate-300 bg-white px-2 py-1 text-slate-800"
                >
                  Owner: {{ threadDetail.claimedByUserId || 'unassigned' }}
                </span>
                <span
                  data-testid="connectshyft-thread-escalation-chip"
                  class="rounded-full border border-slate-300 bg-white px-2 py-1 text-slate-800"
                >
                  {{ escalationChipLabel }}
                </span>
                <span
                  data-testid="connectshyft-thread-inactivity-chip"
                  class="rounded-full border border-slate-300 bg-white px-2 py-1 text-slate-800"
                >
                  {{ inactivityChipLabel }}
                </span>
                <span
                  v-if="threadDetail.voicemailIndicator"
                  data-testid="connectshyft-voicemail-indicator"
                  class="rounded-full border border-blue-200 bg-blue-100 px-2 py-1 font-semibold text-blue-800"
                >
                  Voicemail waiting
                </span>
              </div>
            </header>

            <p
              data-testid="connectshyft-thread-metadata-last-inbound-number"
              class="text-base text-slate-700"
            >
              Last inbound number: {{ threadDetail.lastInboundCsNumberId }}
            </p>
            <p
              data-testid="connectshyft-thread-metadata-preferred-outbound-number"
              class="text-base text-slate-700"
            >
              Preferred outbound number: {{ threadDetail.preferredOutboundCsNumberId }}
              <span v-if="threadDetail.preferredOutboundContext.label">
                · {{ threadDetail.preferredOutboundContext.label }}
              </span>
            </p>

            <p
              v-if="showActionRefusalBanner"
              data-testid="connectshyft-thread-action-refusal-banner"
              class="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-base text-amber-900"
            >
              {{ actionBannerMessage }}
            </p>

            <p
              v-if="lifecycleToast"
              data-testid="connectshyft-thread-reopened-toast"
              class="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-base text-emerald-900"
            >
              {{ lifecycleToast }}
            </p>

            <div data-testid="connectshyft-thread-actions" class="flex flex-wrap gap-2">
              <button
                v-for="action in visibleActions"
                :key="action"
                type="button"
                :data-testid="resolveConnectShyftThreadActionContract(action).testId"
                :aria-label="resolveConnectShyftThreadActionContract(action).ariaLabel"
                :class="[
                  'min-h-[44px] rounded bg-slate-900 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-60',
                  focusRingClass,
                ]"
                :style="tapTargetStyle"
                :disabled="actionPending"
                @click="handleThreadAction(action)"
              >
                <span data-testid="connectshyft-thread-action-label">
                  {{ resolveConnectShyftThreadActionContract(action).label }}
                </span>
              </button>

              <button
                v-if="!isViewerRole"
                type="button"
                data-testid="connectshyft-add-neighbor-action"
                aria-label="Add Neighbor"
                :class="[
                  'min-h-[44px] rounded bg-emerald-700 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-60',
                  focusRingClass,
                ]"
                :style="tapTargetStyle"
                :disabled="actionPending || addNeighborSubmitting"
                @click="toggleAddNeighborForm"
              >
                Add Neighbor
              </button>
            </div>

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
              v-if="closeModalOpen"
              data-testid="connectshyft-close-thread-modal"
              class="rounded border border-slate-300 bg-slate-50 p-4"
            >
              <p class="text-base text-slate-900">
                Are you sure you want to close this thread?
              </p>
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
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import ConnectShyftPrimaryNav from '@/components/connectshyft/ConnectShyftPrimaryNav.vue';
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
  CONNECTSHYFT_FOCUS_RING_CLASS,
  createConnectShyftFeedback,
  resolveConnectShyftThreadActionContract,
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
const actionPending = ref(false);
const closeModalOpen = ref(false);
const inactivityReset = ref(false);
const feedbackBanner = ref<ConnectShyftFeedback | null>(null);
const addNeighborFormOpen = ref(false);
const addNeighborPhone = ref('');
const addNeighborSubmitting = ref(false);
const focusRingClass = CONNECTSHYFT_FOCUS_RING_CLASS;
const bodyTextStyle = {
  fontSize: `${CONNECTSHYFT_ACCESSIBILITY_LOCKS.minBodyTextPx}px`,
};
const tapTargetStyle = {
  minHeight: `${CONNECTSHYFT_ACCESSIBILITY_LOCKS.minTapTargetPx}px`,
};

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

const inactivityChipLabel = computed(() => {
  return inactivityReset.value ? 'Inactivity reset' : 'Inactivity stable';
});

const escalationChipLabel = computed(() => {
  if (!threadDetail.value || threadDetail.value.escalationStage <= 0) {
    return 'Monitoring';
  }

  if (threadDetail.value.escalationStage === 1) {
    return 'Needs attention soon';
  }

  return 'Needs urgent attention';
});

const visibleActions = computed<string[]>(() => {
  if (isViewerRole.value) {
    return [];
  }

  return threadDetail.value ? [...threadDetail.value.actions] : [];
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

const neighborContextLabel = computed(() => {
  if (!threadDetail.value) {
    return 'Neighbor context unavailable';
  }

  const summary = threadDetail.value.summary.trim();
  if (summary.length > 0) {
    return `Neighbor context: ${summary}`;
  }

  return 'Neighbor context: Active thread';
});

const conferenceContextLabel = computed(() => {
  if (!threadDetail.value) {
    return 'Conference context unavailable';
  }

  const label = threadDetail.value.preferredOutboundContext.label
    || threadDetail.value.preferredOutboundCsNumberId
    || 'Unassigned outbound conference line';
  return `Conference context: ${label}`;
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
  const nextActions = parseThreadActions(candidate.actions);

  threadDetail.value = {
    ...current,
    state: nextState,
    claimedByUserId: claimedByUserId || null,
    escalationStage,
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
    actions: nextActions || current.actions,
    lifecycle: {
      reopenedByInbound: current.lifecycle?.reopenedByInbound === true,
    },
  };
};

const executeThreadAction = async (action: string): Promise<void> => {
  if (!threadDetail.value || !threadId.value) {
    return;
  }

  if (isViewerRole.value) {
    actionError.value = 'Lifecycle actions are unavailable for your access level.';
    setFeedbackBanner(
      'refusal',
      actionError.value,
      'Lifecycle actions are unavailable for your access level.',
    );
    return;
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
      body: 'Operator outbound message.',
    };
  } else {
    actionError.value = `Unsupported action: ${action}`;
    setFeedbackBanner('error', actionError.value, 'Unsupported thread action.');
    return;
  }

  actionPending.value = true;
  try {
    const response = await api.post(path, payload, {
      headers: buildConnectShyftTestOverrideHeaders(),
    });

    const envelope = (response.data || {}) as {
      ok?: boolean;
      message?: string;
      data?: {
        thread?: unknown;
        lifecycleEvent?: unknown;
        operatorFeedback?: unknown;
      };
    };

    if (envelope.ok !== true) {
      actionError.value = sanitizeConnectShyftOperatorCopy(
        envelope.message,
        'Unable to complete that thread action.',
      );
      setFeedbackBanner('refusal', actionError.value, 'Unable to complete that thread action.');
      return;
    }

    actionError.value = '';
    lifecycleToast.value = '';

    applyThreadUpdate(envelope.data?.thread);

    const lifecycleEvent = typeof envelope.data?.lifecycleEvent === 'string'
      ? envelope.data.lifecycleEvent
      : '';

    if (lifecycleEvent.includes('thread_reopened_by_user')) {
      lifecycleToast.value = 'Conversation reopened. Escalation and inactivity timers were reset.';
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

    setFeedbackBanner(
      'success',
      operatorFeedback || envelope.message,
      'Thread action completed.',
    );
  } catch (error: unknown) {
    const payload = (error as { response?: { data?: { message?: unknown } } })?.response?.data;
    actionError.value = sanitizeConnectShyftOperatorCopy(
      payload?.message,
      'Unable to complete that thread action.',
    );
    setFeedbackBanner('error', actionError.value, 'Unable to complete that thread action.');
  } finally {
    actionPending.value = false;
  }
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

  void executeThreadAction(action);
};

const refreshThreadDetail = async () => {
  availability.value = await fetchConnectShyftAvailability();
  if (showUnavailableState.value) {
    threadDetail.value = null;
    detailLoadError.value = '';
    closeAddNeighborForm();
    clearFeedbackBanner();
    return;
  }

  const detailResult = await fetchConnectShyftThreadDetail(threadId.value);
  if (!detailResult.ok) {
    threadDetail.value = null;
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
    return;
  }

  threadDetail.value = {
    ...detailResult.thread,
  };
  detailLoadError.value = '';
  lifecycleToast.value = '';
  actionError.value = '';
  closeModalOpen.value = false;
  inactivityReset.value = false;
  closeAddNeighborForm();
  clearFeedbackBanner();
};

onMounted(() => {
  void refreshThreadDetail();
});

watch(
  () => route.fullPath,
  () => {
    void refreshThreadDetail();
  },
);
</script>
