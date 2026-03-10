<template>
  <section
    v-if="visible"
    data-testid="connectshyft-voicemail-card"
    class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-900"
    :style="voicemailStyle"
  >
    <p class="font-semibold" :style="titleStyle">Voicemail</p>
    <p class="mt-1" :style="bodyStyle">
      {{ label }}
    </p>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  visible: boolean;
  label: string;
}>(), {
  label: 'Voicemail waiting',
});

const voicemailStyle = {
  borderRadius: 'var(--cs-radius-card)',
};

const titleStyle = {
  fontSize: 'var(--cs-type-label-sm)',
};

const bodyStyle = {
  fontSize: 'var(--cs-type-body-md)',
};
</script>
