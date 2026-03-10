<template>
  <article
    data-testid="connectshyft-message-bubble"
    :class="[
      'rounded-lg border px-3 py-2',
      bubbleToneClass,
    ]"
    :style="bubbleStyle"
  >
    <p class="font-semibold" :style="labelStyle">
      {{ title }}
    </p>
    <p class="mt-1 text-slate-800" :style="bodyStyle">
      {{ body }}
    </p>
    <p
      v-if="metaLabel"
      class="mt-1 text-slate-500"
      :style="metaStyle"
    >
      {{ metaLabel }}
    </p>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  title?: string;
  body: string;
  metaLabel?: string;
  tone?: 'inbound' | 'outbound' | 'system';
}>(), {
  title: 'Latest update',
  metaLabel: '',
  tone: 'inbound',
});

const bubbleToneClass = computed(() => {
  if (props.tone === 'outbound') {
    return 'border-slate-200 bg-slate-100';
  }

  if (props.tone === 'system') {
    return 'border-blue-200 bg-blue-50';
  }

  return 'border-slate-200 bg-white';
});

const bubbleStyle = {
  borderRadius: 'var(--cs-radius-card)',
};

const labelStyle = {
  fontSize: 'var(--cs-type-label-sm)',
};

const bodyStyle = {
  fontSize: 'var(--cs-type-body-md)',
};

const metaStyle = {
  fontSize: 'var(--cs-type-body-sm)',
};
</script>
