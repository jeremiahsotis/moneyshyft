<template>
  <span
    :data-testid="testId"
    :aria-label="ariaLabel || label"
    :class="[
      'inline-flex items-center rounded-md px-2 py-1 font-semibold',
      toneClass,
    ]"
    :style="pillStyle"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  label: string;
  testId: string;
  ariaLabel?: string;
  tone?: 'urgency' | 'context' | 'neutral';
}>(), {
  ariaLabel: '',
  tone: 'neutral',
});

const toneClass = computed(() => {
  if (props.tone === 'urgency') {
    return 'bg-amber-100 text-amber-900';
  }

  if (props.tone === 'context') {
    return 'bg-blue-100 text-blue-800';
  }

  return 'bg-slate-200 text-slate-700';
});

const pillStyle = {
  borderRadius: 'var(--cs-radius-chip)',
  fontSize: 'var(--cs-type-label-sm)',
};
</script>
