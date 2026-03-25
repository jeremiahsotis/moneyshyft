<template>
  <article
    data-testid="connectshyft-queue-card"
    class="cs-card cs-card--compact cs-card--interactive"
    :class="selected ? 'border-teal-200 bg-teal-50/60' : 'cs-card--soft'"
    :style="queueCardStyle"
  >
    <button
      type="button"
      data-testid="connectshyft-queue-card-tap-target"
      :aria-label="tapTargetAriaLabel"
      :style="tapTargetStyle"
      :class="[
        'w-full rounded-[calc(var(--cs-radius-card)-0.25rem)] border-0 bg-transparent px-2 py-2 text-left transition hover:bg-white/70',
        focusRingClass,
      ]"
      @click="emit('open-thread', threadId)"
    >
      <div
        data-testid="connectshyft-thread-card"
        class="space-y-4"
      >
        <div
          data-testid="connectshyft-thread-card-body"
          class="block w-full space-y-3"
          :style="bodyCopyStyle"
        >
          <p
            v-if="conferenceLabel"
            data-testid="connectshyft-thread-card-conference"
            class="cs-meta font-semibold"
          >
            {{ conferenceLabel }}
          </p>
          <p
            data-testid="connectshyft-queue-card-summary"
            class="relative z-10 cs-heading-md"
            :style="bodyCopyStyle"
          >
            {{ title }}
          </p>
          <p class="relative z-10 cs-body">
            <span data-testid="connectshyft-queue-card-preview">{{ preview }}</span>
          </p>
        </div>

        <div class="flex flex-wrap items-start gap-2">
          <div
            class="sr-only"
            data-testid="connectshyft-thread-last-inbound-number"
          >
            {{ lastInboundContext }}
          </div>
          <div
            class="sr-only"
            data-testid="connectshyft-thread-preferred-outbound-number"
          >
            {{ preferredOutboundContext }}
          </div>
          <ConnectShyftPill
            test-id="connectshyft-thread-state-chip"
            tone="neutral"
            :label="stateLabel"
            aria-label="Thread state"
          />
          <ConnectShyftPill
            v-if="urgencyLabel"
            test-id="connectshyft-urgency-pill"
            tone="urgency"
            :label="urgencyLabel"
            aria-label="Thread urgency"
          />
          <ConnectShyftPill
            v-for="pill in contextPills"
            :key="`${threadId}-${pill}`"
            test-id="connectshyft-queue-context-pill"
            tone="context"
            :label="pill"
            aria-label="Queue context"
          />
          <ConnectShyftPill
            v-if="voicemailIndicator"
            :test-id="`connectshyft-voicemail-indicator-${threadId}`"
            tone="context"
            label="Voicemail waiting"
            aria-label="Voicemail waiting"
          />
          <ConnectShyftPill
            v-if="voicemailIndicator && voicemailLabel"
            :test-id="`connectshyft-voicemail-label-${threadId}`"
            tone="neutral"
            :label="voicemailLabel"
            aria-label="Voicemail context"
          />
        </div>

        <div class="flex flex-wrap items-center gap-3 cs-meta">
          <span
            v-for="indicator in phoneIndicators"
            :key="`${threadId}-${indicator}`"
            class="font-semibold"
            :style="metaCopyStyle"
          >
            {{ indicator }}
          </span>
          <p
            v-if="claimLabel"
            data-testid="connectshyft-thread-card-claim"
            class="font-medium text-slate-500"
            :style="metaCopyStyle"
          >
            {{ claimLabel }}
          </p>
          <p
            data-testid="connectshyft-queue-card-timestamp"
            class="font-medium text-slate-500"
            :style="metaCopyStyle"
          >
            {{ timestampLabel }}
          </p>
        </div>
      </div>
    </button>

    <div class="flex justify-end px-2 pb-2 pt-1">
      <RouterLink
        :to="threadPath"
        data-testid="connectshyft-thread-card-primary-action"
        :aria-label="tapTargetAriaLabel"
        :class="[
          'cs-button cs-button--secondary',
          focusRingClass,
        ]"
        :style="tapTargetStyle"
      >
        View
      </RouterLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import ConnectShyftPill from '@/components/connectshyft/ConnectShyftPill.vue';

defineProps<{
  threadId: string;
  title: string;
  conferenceLabel: string;
  claimLabel: string;
  preview: string;
  timestampLabel: string;
  urgencyLabel: string;
  contextPills: string[];
  phoneIndicators: string[];
  lastInboundContext: string;
  preferredOutboundContext: string;
  stateLabel: string;
  voicemailIndicator: boolean;
  voicemailLabel: string;
  threadPath: string;
  tapTargetAriaLabel: string;
  focusRingClass: string;
  tapTargetStyle: Record<string, string>;
  selected?: boolean;
}>();
const emit = defineEmits<{
  (event: 'open-thread', threadId: string): void;
}>();

const queueCardStyle = {
  borderRadius: 'var(--cs-radius-card)',
  boxShadow: 'var(--cs-shadow-card)',
};

const bodyCopyStyle = {
  fontSize: 'var(--cs-type-body-md)',
};

const metaCopyStyle = {
  fontSize: 'var(--cs-type-body-sm)',
};
</script>
