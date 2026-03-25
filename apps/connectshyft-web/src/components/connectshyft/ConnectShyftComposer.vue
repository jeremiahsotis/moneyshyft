<template>
  <section
    data-testid="connectshyft-composer"
    class="cs-card cs-card--compact cs-card--muted"
  >
    <label
      class="cs-field-label"
      :for="composerId"
    >
      Message
    </label>
    <textarea
      :id="composerId"
      data-testid="connectshyft-composer-input"
      rows="3"
      :value="modelValue"
      :disabled="disabled"
      :placeholder="placeholder"
      :class="[
        'cs-textarea mt-2',
        focusRingClass,
      ]"
      :style="tapTargetStyle"
      @input="onInput"
    />
    <div class="mt-3 flex justify-end">
      <ActionButton
        data-testid="connectshyft-composer-submit"
        class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
        tone="primary"
        :disabled="disabled || submitDisabled"
        @click="$emit('submit')"
      >
        {{ submitLabel }}
      </ActionButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import ActionButton from '@/components/ui/ActionButton.vue';

withDefaults(defineProps<{
  modelValue: string;
  disabled: boolean;
  submitDisabled: boolean;
  submitLabel: string;
  placeholder?: string;
  focusRingClass: string;
  tapTargetStyle: Record<string, string>;
  composerId?: string;
}>(), {
  placeholder: 'Type a message for this thread',
  composerId: 'connectshyft-composer-input-field',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  submit: [];
}>();

const onInput = (event: Event): void => {
  const target = event.target as HTMLTextAreaElement | null;
  emit('update:modelValue', target?.value ?? '');
};
</script>
