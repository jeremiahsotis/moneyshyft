<template>
  <header
    data-testid="connectshyft-thread-header"
    class="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_28px_90px_-56px_rgba(15,23,42,0.45)]"
    :style="headerStyle"
  >
    <div class="flex flex-col gap-4 border-b border-slate-200 pb-4">
      <div data-testid="connectshyft-thread-context-neighbor">
        <p
          data-testid="connectshyft-thread-header-neighbor-context"
          class="text-3xl font-semibold tracking-tight text-slate-900"
        >
          {{ title }}
        </p>
      </div>

      <div class="flex flex-col gap-2 text-base text-slate-500">
        <div
          data-testid="connectshyft-thread-context-conference"
          class="flex flex-wrap items-center gap-x-3 gap-y-1"
        >
          <p
            data-testid="connectshyft-thread-header-conference-context"
            class="font-medium"
            :style="bodyCopyStyle"
          >
            {{ conferenceContextLabel }}
          </p>
        </div>

        <div
          data-testid="connectshyft-thread-context-claim"
          class="flex flex-wrap items-center gap-x-3 gap-y-1"
        >
          <p
            class="font-medium"
            :style="bodyCopyStyle"
          >
            {{ claimContextLabel }}
          </p>
        </div>
      </div>
    </div>

    <div
      data-testid="connectshyft-thread-primary-context-panel"
      class="mt-4 flex flex-wrap items-center gap-2"
    >
      <ConnectShyftPill
        test-id="connectshyft-thread-state-chip"
        tone="neutral"
        :label="stateLabel"
        aria-label="Thread state"
      />
      <ConnectShyftPill
        v-if="ownerLabel"
        test-id="connectshyft-thread-owner-chip"
        tone="neutral"
        :label="ownerLabel"
        aria-label="Thread owner"
      />
      <ConnectShyftPill
        test-id="connectshyft-thread-escalation-chip"
        tone="context"
        :label="escalationLabel"
        aria-label="Escalation status"
      />
      <ConnectShyftPill
        test-id="connectshyft-thread-inactivity-chip"
        tone="context"
        :label="inactivityLabel"
        aria-label="Inactivity status"
      />
      <ConnectShyftPill
        v-if="voicemailIndicator"
        test-id="connectshyft-voicemail-indicator"
        tone="context"
        label="Voicemail waiting"
        aria-label="Voicemail waiting"
      />
    </div>

    <p
      data-testid="connectshyft-thread-detail-body-copy"
      class="sr-only"
      :style="bodyCopyStyle"
    >
      {{ neighborContextLabel }}
    </p>
  </header>
</template>

<script setup lang="ts">
import ConnectShyftPill from '@/components/connectshyft/ConnectShyftPill.vue';

defineProps<{
  title: string;
  neighborContextLabel: string;
  conferenceContextLabel: string;
  claimContextLabel: string;
  stateLabel: string;
  ownerLabel: string;
  escalationLabel: string;
  inactivityLabel: string;
  voicemailIndicator: boolean;
}>();

const headerStyle = {
  borderRadius: 'var(--cs-radius-card)',
  backgroundColor: 'var(--cs-color-surface-subtle)',
};

const bodyCopyStyle = {
  fontSize: 'var(--cs-type-body-md)',
};
</script>
