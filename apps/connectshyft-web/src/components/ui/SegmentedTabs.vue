<template>
  <div
    :data-testid="testId || undefined"
    class="cs-segmented"
    role="tablist"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="tab"
      :data-testid="option.testId || undefined"
      :aria-selected="modelValue === option.value ? 'true' : 'false'"
      :class="[
        'cs-segmented__item',
        modelValue === option.value ? 'cs-segmented__item--active' : '',
      ]"
      :disabled="disabled"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  options: ReadonlyArray<{ label: string; value: string; testId?: string }>;
  disabled?: boolean;
  testId?: string;
}>();

defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>
