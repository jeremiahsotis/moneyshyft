<template>
  <header
    data-testid="connectshyft-thread-header"
    class="rounded-xl border border-slate-200 bg-slate-50 p-4"
    :style="headerStyle"
  >
    <p
      data-testid="connectshyft-thread-detail-body-copy"
      class="font-semibold text-slate-900"
      :style="bodyCopyStyle"
    >
      {{ title }}
    </p>

    <section data-testid="connectshyft-thread-primary-context-panel" class="mt-3 space-y-2">
      <div
        data-testid="connectshyft-thread-context-neighbor"
        class="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-700"
      >
        <p
          data-testid="connectshyft-thread-header-neighbor-context"
          :style="bodyCopyStyle"
        >
          {{ neighborContextLabel }}
        </p>
      </div>

      <div
        data-testid="connectshyft-thread-context-conference"
        class="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-700"
      >
        <p
          data-testid="connectshyft-thread-header-conference-context"
          :style="bodyCopyStyle"
        >
          {{ conferenceContextLabel }}
        </p>
      </div>

      <p
        data-testid="connectshyft-thread-context-claim"
        class="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-700"
        :style="bodyCopyStyle"
      >
        {{ claimContextLabel }}
      </p>
    </section>

    <div class="mt-3 flex flex-wrap items-center gap-2">
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
