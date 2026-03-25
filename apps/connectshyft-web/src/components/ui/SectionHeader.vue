<template>
  <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div class="space-y-2">
      <p
        v-if="eyebrow"
        class="cs-kicker"
      >
        {{ eyebrow }}
      </p>
      <div class="space-y-2">
        <h1 :class="titleClass">
          {{ title }}
        </h1>
        <p
          v-if="description"
          class="cs-body"
        >
          {{ description }}
        </p>
      </div>
    </div>
    <div
      v-if="$slots.actions"
      class="cs-action-group"
    >
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  eyebrow?: string;
  title: string;
  description?: string;
  size?: 'lg' | 'md';
}>(), {
  eyebrow: '',
  description: '',
  size: 'lg',
});

const titleClass = computed(() => (
  props.size === 'md' ? 'cs-heading-md' : 'cs-heading-lg'
));
</script>
