<template>
  <div class="bg-white rounded-lg shadow p-6">
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <p class="text-sm text-gray-600">{{ title }}</p>
          <InfoTooltip v-if="tooltipText" :text="tooltipText" />
        </div>
        <p :class="[valueClass, privacyClass]" class="text-2xl font-bold">{{ formattedValue }}</p>
        <p v-if="subtitle" class="text-xs text-gray-500 mt-1">{{ subtitle }}</p>
      </div>
      <span v-if="icon" class="text-4xl">{{ icon }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import InfoTooltip from '@/components/common/InfoTooltip.vue';

const props = defineProps<{
  title: string;
  value: number | string;
  icon?: string;
  subtitle?: string;
  type?: 'currency' | 'number' | 'text';
  colorClass?: string;
  tooltipText?: string;
}>();

const valueClass = computed(() => {
  return props.colorClass || 'text-gray-900';
});

const privacyClass = computed(() => {
  return props.type === 'currency' ? 'privacy-value' : '';
});

const formattedValue = computed(() => {
  if (props.type === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(props.value as number);
  }
  return props.value.toString();
});
</script>
