<template>
  <label class="cs-field-label min-w-[14rem]">
    <span class="cs-kicker">
      Workspace
    </span>
    <select
      :value="currentOrgUnitId"
      :disabled="disabled || loading || options.length === 0"
      data-testid="shell-orgunit-selector"
      class="cs-select"
      @change="handleChange"
    >
      <option v-if="loading" value="">
        Loading workspaces...
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
