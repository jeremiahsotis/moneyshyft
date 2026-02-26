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
          class="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {{ unavailableMessage }}
        </p>
      </header>

      <section
        v-if="!showUnavailableState"
        data-testid="connectshyft-thread-detail"
        class="rounded-md border border-slate-200 p-4"
      >
        <p
          v-if="detailLoadError"
          class="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {{ detailLoadError }}
        </p>

        <template v-else-if="threadDetail">
          <header class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-base font-semibold text-slate-900">
              {{ threadDetail.summary || threadDetail.threadId }}
            </p>

            <div class="mt-3 grid gap-2 sm:grid-cols-2">
              <p
                data-testid="connectshyft-thread-header-neighbor-context"
                class="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {{ neighborContextLabel }}
              </p>
              <p
                data-testid="connectshyft-thread-header-conference-context"
                class="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {{ conferenceContextLabel }}
              </p>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
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
            class="mt-3 text-sm text-slate-700"
          >
            Last inbound number: {{ threadDetail.lastInboundCsNumberId }}
          </p>
          <p
            data-testid="connectshyft-thread-metadata-preferred-outbound-number"
            class="mt-1 text-sm text-slate-700"
          >
            Preferred outbound number: {{ threadDetail.preferredOutboundCsNumberId }}
            <span v-if="threadDetail.preferredOutboundContext.label">
              · {{ threadDetail.preferredOutboundContext.label }}
            </span>
          </p>

          <p
            v-if="showActionRefusalBanner"
            data-testid="connectshyft-thread-action-refusal-banner"
            class="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          >
            {{ actionBannerMessage }}
          </p>

          <p
            v-if="lifecycleToast"
            data-testid="connectshyft-thread-reopened-toast"
            class="mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          >
            {{ lifecycleToast }}
          </p>

          <div data-testid="connectshyft-thread-actions" class="mt-4 flex flex-wrap gap-2">
            <button
              v-for="action in visibleActions"
              :key="action"
              type="button"
              class="min-h-[44px] rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="actionPending"
              @click="handleThreadAction(action)"
            >
              {{ action }}
            </button>
          </div>

          <section
            v-if="closeModalOpen"
            data-testid="connectshyft-close-thread-modal"
            class="mt-4 rounded border border-slate-300 bg-slate-50 p-4"
          >
            <p class="text-sm text-slate-900">
              Are you sure you want to close this thread?
            </p>
            <div class="mt-3 flex gap-2">
              <button
                type="button"
                class="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="actionPending"
                @click="confirmCloseThread"
              >
                Confirm Close
              </button>
              <button
                type="button"
                class="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                :disabled="actionPending"
                @click="closeModalOpen = false"
              >
                Cancel
              </button>
            </div>
          </section>
        </template>

        <p v-else class="text-sm text-slate-600">Loading thread detail...</p>
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
import {
  fetchConnectShyftThreadDetail,
  type ConnectShyftThreadDetail,
  type ConnectShyftThreadState,
} from '@/features/connectshyft/readContracts';

const route = useRoute();
const availability = ref({ ...DEFAULT_CONNECTSHYFT_AVAILABILITY });
const threadDetail = ref<ConnectShyftThreadDetail | null>(null);
const detailLoadError = ref('');
const lifecycleToast = ref('');
const actionError = ref('');
const actionPending = ref(false);
const closeModalOpen = ref(false);
const inactivityReset = ref(false);

const role = computed(() => {
  const rawRole = typeof route.query.tenantRole === 'string'
    ? route.query.tenantRole
    : typeof route.query.role === 'string'
      ? route.query.role
      : '';
  return rawRole.trim().toUpperCase();
});

const isViewerRole = computed(() => role.value === 'TENANT_VIEWER');
const canShowTakeover = computed(() => [
  'ORGUNIT_ADMIN',
  'TENANT_ADMIN',
  'TENANT_STAFF',
  'SYSTEM_ADMIN',
].includes(role.value));

const threadId = computed(() => {
  const rawValue = route.params.threadId;
  return typeof rawValue === 'string' ? rawValue.trim() : '';
});

const moduleAvailable = computed(() => availability.value.capabilities.module);
const inboxAvailable = computed(() => availability.value.capabilities.inbox);
const showUnavailableState = computed(() => !moduleAvailable.value || !inboxAvailable.value);

const unavailableMessage = computed(() => {
  if (availability.value.refusal?.message) {
    return availability.value.refusal.message;
  }

  if (!moduleAvailable.value) {
    return 'ConnectShyft is currently unavailable for this tenant. Enable connectshyft_enabled to access this module.';
  }

  return 'ConnectShyft inbox is currently unavailable for this tenant.';
});

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

const allThreadActions = computed<string[]>(() => {
  if (!threadDetail.value) {
    return [];
  }

  const actions = [...threadDetail.value.actions];
  if (
    threadDetail.value.state === 'CLAIMED'
    && canShowTakeover.value
    && !actions.includes('Take Over')
  ) {
    actions.splice(1, 0, 'Take Over');
  }

  return actions;
});

const visibleActions = computed<string[]>(() => {
  if (isViewerRole.value) {
    return [];
  }

  return allThreadActions.value;
});

const showActionRefusalBanner = computed(() => {
  return isViewerRole.value || actionError.value.length > 0;
});

const actionBannerMessage = computed(() => {
  if (isViewerRole.value) {
    return 'Lifecycle actions are restricted for this role.';
  }

  return actionError.value;
});

const neighborContextLabel = computed(() => {
  if (!threadDetail.value) {
    return 'Neighbor context unavailable';
  }

  const neighborToken = threadDetail.value.threadId.split('-').slice(-2).join('-');
  return `Neighbor context: ${neighborToken || threadDetail.value.threadId}`;
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

const actionSetForState = (state: ConnectShyftThreadState): string[] => {
  const byState: Record<ConnectShyftThreadState, string[]> = {
    UNCLAIMED: ['Call', 'Text', 'Claim'],
    CLAIMED: ['Call', 'Text', 'Close'],
    CLOSED: ['Call', 'Send Message'],
  };

  const actions = [...byState[state]];
  if (state === 'CLAIMED' && canShowTakeover.value && !actions.includes('Take Over')) {
    actions.splice(1, 0, 'Take Over');
  }

  return actions;
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
  };

  const current = threadDetail.value;
  const nextState = typeof candidate.state === 'string'
    ? candidate.state.trim().toUpperCase() as ConnectShyftThreadState
    : current.state;

  const claimedByUserId = typeof candidate.claimedByUserId === 'string'
    ? candidate.claimedByUserId.trim()
    : typeof candidate.claimed_by_user_id === 'string'
      ? candidate.claimed_by_user_id.trim()
      : current.claimedByUserId;

  const escalationStage = typeof candidate.escalation?.stage === 'number'
    ? candidate.escalation.stage
    : current.escalationStage;

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
    actions: actionSetForState(nextState),
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
    actionError.value = 'Lifecycle actions are restricted for this role.';
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
      };
    };

    if (envelope.ok !== true) {
      actionError.value = typeof envelope.message === 'string'
        ? envelope.message
        : 'Unable to perform the requested lifecycle action.';
      return;
    }

    actionError.value = '';
    lifecycleToast.value = '';

    applyThreadUpdate(envelope.data?.thread);

    const lifecycleEvent = typeof envelope.data?.lifecycleEvent === 'string'
      ? envelope.data.lifecycleEvent
      : '';

    if (lifecycleEvent.includes('thread_reopened_by_user')) {
      lifecycleToast.value = 'thread_reopened_by_user';
      inactivityReset.value = true;
      if (threadDetail.value) {
        threadDetail.value.escalationStage = 0;
      }
    } else {
      inactivityReset.value = false;
    }
  } catch (error: unknown) {
    const payload = (error as { response?: { data?: { message?: unknown } } })?.response?.data;
    actionError.value = typeof payload?.message === 'string'
      ? payload.message
      : 'Unable to perform the requested lifecycle action.';
  } finally {
    actionPending.value = false;
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
    return;
  }

  const detailResult = await fetchConnectShyftThreadDetail(threadId.value);
  if (!detailResult.ok) {
    threadDetail.value = null;
    detailLoadError.value = detailResult.message;
    return;
  }

  threadDetail.value = {
    ...detailResult.thread,
    actions: actionSetForState(detailResult.thread.state),
  };
  detailLoadError.value = '';
  lifecycleToast.value = '';
  actionError.value = '';
  closeModalOpen.value = false;
  inactivityReset.value = false;
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
