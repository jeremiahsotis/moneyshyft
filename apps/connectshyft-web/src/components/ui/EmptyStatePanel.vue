<template>
  <section
    :data-testid="testId || undefined"
    class="cs-empty-state"
  >
    <p
      v-if="eyebrow"
      class="cs-kicker"
    >
      {{ eyebrow }}
    </p>
    <h2 class="cs-heading-md">
      {{ title }}
    </h2>
    <p class="cs-body">
      {{ description }}
    </p>
    <div
      v-if="$slots.actions"
      class="cs-action-group"
    >
      <slot name="actions" />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string;
  description: string;
  eyebrow?: string;
  testId?: string;
}>(), {
  eyebrow: '',
  testId: '',
});
</script>
