<template>
  <div :class="layoutClasses">
    <div class="min-w-0">
      <slot name="main" />
    </div>
    <aside
      v-if="$slots.rail"
      class="cs-panel-layout__rail"
    >
      <slot name="rail" />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  variant?: 'stack' | 'two-column' | 'queue-thread-rail';
}>(), {
  variant: 'stack',
});

const layoutClasses = computed(() => [
  'cs-panel-layout',
  props.variant === 'two-column' ? 'cs-panel-layout--two-column' : '',
  props.variant === 'queue-thread-rail' ? 'cs-panel-layout--queue-thread-rail' : '',
]);
</script>
