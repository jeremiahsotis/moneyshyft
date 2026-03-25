<template>
  <span
    :data-testid="testId || undefined"
    :aria-label="ariaLabel || label"
    :class="badgeClasses"
  >
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  label: string;
  testId?: string;
  ariaLabel?: string;
  tone?: 'neutral' | 'context' | 'attention' | 'success' | 'ownership' | 'review' | 'voicemail' | 'danger';
}>(), {
  testId: '',
  ariaLabel: '',
  tone: 'neutral',
});

const toneClassMap = {
  neutral: 'cs-chip--neutral',
  context: 'cs-chip--context',
  attention: 'cs-chip--attention',
  success: 'cs-chip--success',
  ownership: 'cs-chip--ownership',
  review: 'cs-chip--review',
  voicemail: 'cs-chip--voicemail',
  danger: 'cs-chip--danger',
} as const;

const badgeClasses = computed(() => [
  'cs-chip',
  toneClassMap[props.tone],
]);
</script>
