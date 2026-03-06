<template>
  <section
    data-testid="connectshyft-thread-action-bar"
    class="flex flex-wrap items-center"
    :style="actionBarStyle"
  >
    <div data-testid="connectshyft-thread-actions" class="flex flex-wrap items-center gap-2">
      <button
        v-for="action in actions"
        :key="action"
        type="button"
        :data-testid="resolveConnectShyftThreadActionContract(action).testId"
        :aria-label="resolveConnectShyftThreadActionContract(action).ariaLabel"
        :class="[
          'min-h-[44px] rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60',
          focusRingClass,
        ]"
        :style="[tapTargetStyle, bodyCopyStyle]"
        :disabled="actionPending"
        @click="$emit('action', action)"
      >
        <span data-testid="connectshyft-thread-action-label">
          {{ resolveConnectShyftThreadActionContract(action).label }}
        </span>
      </button>

      <button
        v-if="showAddNeighborAction"
        type="button"
        data-testid="connectshyft-add-neighbor-action"
        aria-label="Add Neighbor"
        :class="[
          'min-h-[44px] rounded bg-emerald-700 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60',
          focusRingClass,
        ]"
        :style="[tapTargetStyle, bodyCopyStyle]"
        :disabled="actionPending"
        @click="$emit('add-neighbor')"
      >
        Add Neighbor
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { resolveConnectShyftThreadActionContract } from '@/features/connectshyft/uiContracts';

defineProps<{
  actions: string[];
  actionPending: boolean;
  showAddNeighborAction: boolean;
  focusRingClass: string;
  tapTargetStyle: Record<string, string>;
}>();

defineEmits<{
  action: [action: string];
  'add-neighbor': [];
}>();

const actionBarStyle = {
  minHeight: '44px',
  gap: 'var(--cs-space-3)',
};

const bodyCopyStyle = {
  fontSize: 'var(--cs-type-body-md)',
};
</script>
