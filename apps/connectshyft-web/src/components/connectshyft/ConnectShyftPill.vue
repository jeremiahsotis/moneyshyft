<template>
  <StatusBadge
    :label="label"
    :test-id="testId"
    :aria-label="ariaLabel || label"
    :tone="toneClass"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';

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
    return 'attention';
  }

  if (props.tone === 'context') {
    return 'context';
  }

  return 'neutral';
});
</script>
