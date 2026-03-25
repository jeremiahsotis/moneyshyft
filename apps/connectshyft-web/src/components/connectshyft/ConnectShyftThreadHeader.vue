<template>
  <header
    data-testid="connectshyft-thread-header"
    class="cs-card cs-card--padded cs-card--soft cs-shell-panel"
    :style="headerStyle"
  >
    <div class="space-y-4">
      <div class="space-y-2">
        <p class="cs-kicker">
          Conversation
        </p>
        <div
          data-testid="connectshyft-thread-context-neighbor"
          class="space-y-2"
        >
          <p
            data-testid="connectshyft-thread-header-neighbor-context"
            class="cs-heading-lg"
          >
            {{ title }}
          </p>
          <p
            data-testid="connectshyft-thread-header-conference-context"
            class="cs-body font-medium"
            :style="bodyCopyStyle"
          >
            {{ conferenceContextLabel }}
          </p>
          <p
            data-testid="connectshyft-thread-context-claim"
            class="cs-meta"
          >
            {{ claimContextLabel }}
          </p>
        </div>
      </div>

      <div
        data-testid="connectshyft-thread-primary-context-panel"
        class="flex flex-wrap items-center gap-2"
      >
        <StatusBadge
          test-id="connectshyft-thread-state-chip"
          tone="neutral"
          :label="stateLabel"
          aria-label="Thread state"
        />
        <StatusBadge
          v-if="ownerLabel"
          test-id="connectshyft-thread-owner-chip"
          tone="ownership"
          :label="ownerLabel"
          aria-label="Thread owner"
        />
        <StatusBadge
          test-id="connectshyft-thread-escalation-chip"
          tone="attention"
          :label="escalationLabel"
          aria-label="Conversation urgency"
        />
        <StatusBadge
          test-id="connectshyft-thread-inactivity-chip"
          tone="context"
          :label="inactivityLabel"
          aria-label="Inactivity status"
        />
        <StatusBadge
          v-if="voicemailIndicator"
          test-id="connectshyft-voicemail-indicator"
          tone="voicemail"
          label="Voicemail"
          aria-label="Voicemail"
        />
      </div>
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
import StatusBadge from '@/components/ui/StatusBadge.vue';

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
