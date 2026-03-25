<template>
  <section
    v-if="visible"
    data-testid="connectshyft-voicemail-card"
    :class="cardClasses"
    :style="voicemailStyle"
  >
    <div
      v-if="variant === 'timeline'"
      class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
    >
      <div class="space-y-2">
        <p class="cs-kicker">Voicemail</p>
        <h3 class="cs-heading-md">
          {{ label }}
        </h3>
        <p
          v-if="occurredAtLabel"
          class="cs-meta"
        >
          {{ occurredAtLabel }}
        </p>
      </div>

      <span class="cs-chip cs-chip--voicemail">
        {{ directionLabel }}
      </span>
    </div>

    <template v-else>
      <p class="cs-secondary-label text-blue-700" :style="titleStyle">Voicemail</p>
      <p class="mt-1" :style="bodyStyle">
        {{ label }}
      </p>
    </template>

    <p
      v-if="variant === 'timeline'"
      class="mt-4 cs-body"
    >
      {{ summary || label }}
    </p>

    <p
      v-if="variant === 'timeline' && detailMeta"
      class="mt-3 cs-meta"
    >
      {{ detailMeta }}
    </p>

    <audio
      v-if="variant === 'timeline' && recordingUrl"
      data-testid="connectshyft-voicemail-audio"
      class="mt-4 w-full"
      controls
      preload="none"
      :src="recordingUrl"
    />

    <div
      v-else-if="variant === 'timeline'"
      class="mt-4 rounded-3xl border border-dashed border-stone-200 bg-white/70 px-4 py-3 text-sm text-stone-600"
    >
      Recording will appear here when it is ready.
    </div>

    <div
      v-if="variant === 'timeline' && transcript"
      class="mt-4 rounded-3xl border border-stone-200 bg-white/70 px-4 py-4"
    >
      <p class="cs-kicker">Transcript</p>
      <p
        data-testid="connectshyft-voicemail-transcript"
        class="mt-3 cs-body text-stone-800"
      >
        {{ transcript }}
      </p>
    </div>

    <p
      v-else-if="variant === 'timeline' && transcriptStatusLabel"
      data-testid="connectshyft-voicemail-transcript-status"
      class="mt-4 rounded-3xl border border-stone-200 bg-white/70 px-4 py-3 text-sm text-stone-600"
    >
      {{ transcriptStatusLabel }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  visible: boolean;
  label: string;
  summary?: string;
  variant?: 'compact' | 'timeline';
  direction?: 'inbound' | 'outbound' | 'system';
  recordingUrl?: string | null;
  occurredAtLabel?: string;
  durationLabel?: string;
  transcript?: string | null;
  transcriptStatusLabel?: string;
}>(), {
  label: 'Voicemail waiting',
  summary: '',
  variant: 'compact',
  direction: 'inbound',
  recordingUrl: null,
  occurredAtLabel: '',
  durationLabel: '',
  transcript: null,
  transcriptStatusLabel: '',
});

const directionLabel = computed(() => {
  if (props.direction === 'outbound') {
    return 'Sent';
  }

  if (props.direction === 'system') {
    return 'Shared';
  }

  return 'Received';
});

const detailMeta = computed(() => {
  const details = [props.durationLabel, props.transcriptStatusLabel]
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return details.join(' / ');
});

const cardClasses = computed(() => {
  if (props.variant === 'timeline') {
    return 'cs-card cs-card--padded cs-card--soft text-stone-900';
  }

  return 'cs-card cs-card--compact bg-blue-50 text-blue-900';
});

const voicemailStyle = {
  borderRadius: 'var(--cs-radius-card)',
};

const titleStyle = {
  fontSize: 'var(--cs-type-label-sm)',
};

const bodyStyle = {
  fontSize: 'var(--cs-type-body-md)',
};
</script>
