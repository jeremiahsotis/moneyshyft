<template>
  <component
    :is="tag"
    :data-testid="testId || undefined"
    :class="cardClasses"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  tag?: string;
  testId?: string;
  tone?: 'default' | 'muted' | 'soft';
  padding?: 'none' | 'compact' | 'default' | 'roomy';
  interactive?: boolean;
  panel?: boolean;
}>(), {
  tag: 'section',
  testId: '',
  tone: 'default',
  padding: 'default',
  interactive: false,
  panel: false,
});

const paddingClassMap = {
  none: '',
  compact: 'cs-card--compact',
  default: 'cs-card--padded',
  roomy: 'cs-card--roomy',
} as const;

const toneClassMap = {
  default: '',
  muted: 'cs-card--muted',
  soft: 'cs-card--soft',
} as const;

const cardClasses = computed(() => [
  'cs-card',
  paddingClassMap[props.padding],
  toneClassMap[props.tone],
  props.interactive ? 'cs-card--interactive' : '',
  props.panel ? 'cs-shell-panel' : '',
]);
</script>
