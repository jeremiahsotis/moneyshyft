<template>
  <article
    data-testid="connectshyft-message-bubble"
    :class="[
      'cs-card cs-card--compact',
      bubbleToneClass,
    ]"
    :style="bubbleStyle"
  >
    <p class="cs-secondary-label" :style="labelStyle">
      {{ title }}
    </p>
    <p class="mt-2 text-stone-800" :style="bodyStyle">
      {{ body }}
    </p>
    <p
      v-if="metaLabel"
      class="mt-2 cs-meta"
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
    return 'bg-stone-100';
  }

  if (props.tone === 'system') {
    return 'bg-blue-50';
  }

  return 'bg-white';
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
