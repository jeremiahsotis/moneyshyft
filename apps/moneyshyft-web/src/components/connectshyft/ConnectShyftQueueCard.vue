<template>
  <article
    data-testid="connectshyft-queue-card"
    class="rounded-xl border border-slate-200 p-4"
    :style="queueCardStyle"
  >
    <div
      data-testid="connectshyft-thread-card"
      class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div class="min-w-0">
        <p
          data-testid="connectshyft-thread-card-body"
          class="font-semibold leading-6 text-slate-900"
          :style="bodyCopyStyle"
        >
          {{ title }}
        </p>
        <ConnectShyftPill
          v-if="urgencyLabel"
          class="mt-2"
          test-id="connectshyft-urgency-pill"
          tone="urgency"
          :label="urgencyLabel"
          aria-label="Thread urgency"
        />
        <p
          data-testid="connectshyft-thread-last-inbound-number"
          class="mt-3 text-slate-700"
          :style="bodyCopyStyle"
        >
          {{ lastInboundContext }}
        </p>
        <p
          data-testid="connectshyft-thread-preferred-outbound-number"
          class="mt-1 text-slate-700"
          :style="bodyCopyStyle"
        >
          {{ preferredOutboundContext }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 sm:justify-end">
        <ConnectShyftPill
          test-id="connectshyft-thread-state-chip"
          tone="neutral"
          :label="stateLabel"
          aria-label="Thread state"
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
        <RouterLink
          :to="threadPath"
          data-testid="connectshyft-thread-card-primary-action"
          :aria-label="primaryActionAriaLabel"
          :style="tapTargetStyle"
          :class="[
            'inline-flex min-h-[44px] min-w-[88px] items-center justify-center rounded-lg bg-slate-900 px-4 font-semibold text-white',
            focusRingClass,
          ]"
        >
          {{ primaryActionLabel }}
        </RouterLink>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import ConnectShyftPill from '@/components/connectshyft/ConnectShyftPill.vue';

defineProps<{
  threadId: string;
  title: string;
  urgencyLabel: string;
  lastInboundContext: string;
  preferredOutboundContext: string;
  stateLabel: string;
  voicemailIndicator: boolean;
  voicemailLabel: string;
  threadPath: string;
  primaryActionLabel: string;
  primaryActionAriaLabel: string;
  focusRingClass: string;
  tapTargetStyle: Record<string, string>;
}>();

const queueCardStyle = {
  borderRadius: 'var(--cs-radius-card)',
  boxShadow: 'var(--cs-shadow-card)',
  backgroundColor: 'var(--cs-color-surface)',
};

const bodyCopyStyle = {
  fontSize: 'var(--cs-type-body-md)',
};
</script>
