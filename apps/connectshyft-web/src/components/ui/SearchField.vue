<template>
  <label
    class="cs-field-label"
    :for="resolvedId"
  >
    <span>{{ label }}</span>
    <div class="cs-search">
      <input
        :id="resolvedId"
        :data-testid="testId || undefined"
        class="cs-input cs-search__input"
        type="search"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-label="ariaLabel || label"
        @input="onInput"
      >
      <p
        v-if="hint"
        class="cs-meta"
      >
        {{ hint }}
      </p>
    </div>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: string;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
  testId?: string;
  id?: string;
  ariaLabel?: string;
}>(), {
  placeholder: '',
  disabled: false,
  hint: '',
  testId: '',
  id: '',
  ariaLabel: '',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const resolvedId = computed(() => props.id || `search-field-${props.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);

const onInput = (event: Event): void => {
  const target = event.target as HTMLInputElement | null;
  emit('update:modelValue', target?.value ?? '');
};
</script>
