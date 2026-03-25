<template>
  <label class="flex min-w-[14rem] flex-col gap-2 text-sm text-slate-600">
    <span class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
      Org unit
    </span>
    <select
      :value="currentOrgUnitId"
      :disabled="disabled || loading || options.length === 0"
      data-testid="shell-orgunit-selector"
      class="min-h-[44px] rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      @change="handleChange"
    >
      <option v-if="loading" value="">
        Loading org units...
      </option>
      <option
        v-for="option in options"
        :key="option.id"
        :value="option.id"
      >
        {{ option.label }}
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
import type { ConnectShyftShellOrgUnitOption } from '@shyft/contracts';

const props = defineProps<{
  currentOrgUnitId: string;
  options: readonly ConnectShyftShellOrgUnitOption[];
  loading?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  requestSwitch: [orgUnitId: string];
}>();

const handleChange = (event: Event): void => {
  const nextOrgUnitId = (event.target as HTMLSelectElement).value.trim();
  if (!nextOrgUnitId || nextOrgUnitId === props.currentOrgUnitId) {
    return;
  }

  emit('requestSwitch', nextOrgUnitId);
};
</script>
