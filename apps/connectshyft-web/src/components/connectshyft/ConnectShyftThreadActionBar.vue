<template>
  <section
    data-testid="connectshyft-thread-action-bar"
    class="cs-action-group"
    :style="actionBarStyle"
  >
    <div data-testid="connectshyft-thread-actions" class="cs-action-group">
      <ActionButton
        v-for="action in actions"
        :key="action"
        :data-testid="resolveConnectShyftThreadActionContract(action).testId"
        :aria-label="resolveConnectShyftThreadActionContract(action).ariaLabel"
        class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
        tone="primary"
        :style="[tapTargetStyle, bodyCopyStyle]"
        :disabled="actionPending"
        @click="$emit('action', action)"
      >
        <span data-testid="connectshyft-thread-action-label">
          {{ resolveConnectShyftThreadActionContract(action).label }}
        </span>
      </ActionButton>

      <ActionButton
        v-if="showAddNeighborAction"
        data-testid="connectshyft-add-neighbor-action"
        aria-label="Add Neighbor"
        class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
        tone="primary"
        :style="[tapTargetStyle, bodyCopyStyle]"
        :disabled="actionPending"
        @click="$emit('add-neighbor')"
      >
        Add Neighbor
      </ActionButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import ActionButton from '@/components/ui/ActionButton.vue';
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
