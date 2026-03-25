<template>
  <section
    v-if="visible"
    data-testid="connectshyft-voicemail-card"
    class="cs-card cs-card--compact bg-blue-50 text-blue-900"
    :style="voicemailStyle"
  >
    <p class="cs-secondary-label text-blue-700" :style="titleStyle">Voicemail</p>
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
