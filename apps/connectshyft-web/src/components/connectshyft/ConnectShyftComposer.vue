<template>
  <section
    data-testid="connectshyft-composer"
    class="rounded-lg border border-slate-300 bg-slate-50 p-3"
    :style="composerStyle"
  >
    <label
      class="block text-slate-700"
      :for="composerId"
      :style="labelStyle"
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
        'mt-2 w-full rounded border border-slate-300 px-3 py-2 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100',
        focusRingClass,
      ]"
      :style="[tapTargetStyle, inputStyle]"
      @input="onInput"
    />
    <div class="mt-2 flex justify-end">
      <button
        type="button"
        data-testid="connectshyft-composer-submit"
        :class="[
          'min-h-[44px] rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60',
          focusRingClass,
        ]"
        :style="tapTargetStyle"
        :disabled="disabled || submitDisabled"
        @click="$emit('submit')"
      >
        {{ submitLabel }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
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

const composerStyle = {
  borderRadius: 'var(--cs-radius-card)',
};

const labelStyle = {
  fontSize: 'var(--cs-type-body-sm)',
};

const inputStyle = {
  fontSize: 'var(--cs-type-body-md)',
};

</script>
