<template>
  <button
    :type="type"
    :data-testid="testId || undefined"
    :aria-label="ariaLabel || undefined"
    :disabled="disabled"
    :class="buttonClasses"
  >
    <slot>{{ label }}</slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  label?: string;
  testId?: string;
  ariaLabel?: string;
  tone?: 'primary' | 'secondary' | 'quiet' | 'danger';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  block?: boolean;
}>(), {
  label: '',
  testId: '',
  ariaLabel: '',
  tone: 'primary',
  type: 'button',
  disabled: false,
  block: false,
});

const toneClassMap = {
  primary: 'cs-button--primary',
  secondary: 'cs-button--secondary',
  quiet: 'cs-button--quiet',
  danger: 'cs-button--danger',
} as const;

const buttonClasses = computed(() => [
  'cs-button',
  toneClassMap[props.tone],
  props.block ? 'w-full' : '',
]);
</script>
