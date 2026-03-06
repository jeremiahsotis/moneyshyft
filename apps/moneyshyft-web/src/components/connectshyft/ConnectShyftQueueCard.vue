<template>
  <article
    data-testid="connectshyft-queue-card"
    class="rounded-xl border border-slate-200 p-1"
    :style="queueCardStyle"
  >
    <div
      role="button"
      tabindex="0"
      data-testid="connectshyft-queue-card-tap-target"
      :aria-label="tapTargetAriaLabel"
      :style="tapTargetStyle"
      :class="[
        'w-full rounded-xl p-3 text-left transition hover:bg-slate-50',
        focusRingClass,
      ]"
      @click="emit('open-thread', threadId)"
      @keydown.enter.prevent="emit('open-thread', threadId)"
      @keydown.space.prevent="emit('open-thread', threadId)"
    >
      <div
        data-testid="connectshyft-thread-card"
        class="space-y-3"
      >
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div class="min-w-[14rem] flex-1">
            <p
              data-testid="connectshyft-queue-card-summary"
              class="font-semibold leading-6 text-slate-900"
              :style="bodyCopyStyle"
            >
              {{ summary }}
            </p>
            <p
              data-testid="connectshyft-thread-card-body"
              class="mt-1 text-slate-700"
              :style="bodyCopyStyle"
            >
              <span data-testid="connectshyft-queue-card-preview">{{ preview }}</span>
            </p>
            <p
              data-testid="connectshyft-queue-card-timestamp"
              class="mt-2 text-slate-500"
              :style="metaCopyStyle"
            >
              {{ timestampLabel }}
            </p>
          </div>

          <div class="flex flex-wrap items-start gap-2 md:justify-end">
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
        </div>

        <div class="grid gap-1">
          <p
            data-testid="connectshyft-thread-last-inbound-number"
            class="text-slate-700"
            :style="bodyCopyStyle"
          >
            {{ lastInboundContext }}
          </p>
          <p
            data-testid="connectshyft-thread-preferred-outbound-number"
            class="text-slate-700"
            :style="bodyCopyStyle"
          >
            {{ preferredOutboundContext }}
          </p>
        </div>

        <div class="flex justify-end">
          <RouterLink
            :to="threadPath"
            data-testid="connectshyft-thread-card-primary-action"
            :aria-label="tapTargetAriaLabel"
            :class="[
              'inline-flex min-h-[44px] min-w-[88px] items-center justify-center rounded-lg bg-slate-900 px-4 font-semibold text-white',
              focusRingClass,
            ]"
            :style="tapTargetStyle"
            @click.stop
          >
            Open
          </RouterLink>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import ConnectShyftPill from '@/components/connectshyft/ConnectShyftPill.vue';

defineProps<{
  threadId: string;
  summary: string;
  preview: string;
  timestampLabel: string;
  urgencyLabel: string;
  contextPills: string[];
  lastInboundContext: string;
  preferredOutboundContext: string;
  stateLabel: string;
  voicemailIndicator: boolean;
  voicemailLabel: string;
  threadPath: string;
  tapTargetAriaLabel: string;
  focusRingClass: string;
  tapTargetStyle: Record<string, string>;
}>();
const emit = defineEmits<{
  (event: 'open-thread', threadId: string): void;
}>();

const queueCardStyle = {
  borderRadius: 'var(--cs-radius-card)',
  boxShadow: 'var(--cs-shadow-card)',
  backgroundColor: 'var(--cs-color-surface)',
};

const bodyCopyStyle = {
  fontSize: 'var(--cs-type-body-md)',
};

const metaCopyStyle = {
  fontSize: 'var(--cs-type-body-sm)',
};
</script>
