<template>
  <aside
    data-testid="connectshyft-neighbor-snapshot"
    class="cs-card cs-card--padded cs-shell-panel"
  >
    <header class="border-b border-slate-200 pb-4">
      <p class="cs-kicker">
        Neighbor Snapshot
      </p>
      <h2 class="mt-2 cs-heading-md">
        {{ title }}
      </h2>
      <p class="mt-1 cs-meta">
        {{ subtitle }}
      </p>
    </header>

    <div class="mt-5 space-y-3">
      <div class="cs-card cs-card--compact cs-card--muted shadow-none">
        <p class="cs-kicker">Contact</p>
        <p class="mt-2 text-lg font-semibold text-stone-900">
          {{ resolvedName }}
        </p>
        <p class="mt-3 cs-kicker">
          Phone
        </p>
        <p class="mt-1 cs-body font-medium">
          {{ primaryPhoneLabel }}
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <span
          data-testid="connectshyft-neighbor-snapshot-preference-chip"
          class="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700"
        >
          {{ preferenceChipLabel }}
        </span>
        <span
          data-testid="connectshyft-neighbor-snapshot-phone-count-chip"
          class="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-600"
        >
          {{ phoneCountLabel }}
        </span>
        <span
          v-if="sharedPhoneLabel"
          data-testid="connectshyft-neighbor-snapshot-shared-chip"
          class="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700"
        >
          {{ sharedPhoneLabel }}
        </span>
      </div>

      <div class="rounded-3xl border border-dashed border-stone-200 px-4 py-4 text-base leading-7 text-stone-500">
        <p class="cs-kicker">
          Volunteer note
        </p>
        <p class="mt-2">
        {{ note }}
        </p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ConnectShyftNeighbor } from '@/features/connectshyft/neighbors';
import { resolveConnectShyftPreferenceChip } from '@/features/connectshyft/presentation';

const props = withDefaults(defineProps<{
  neighbor: ConnectShyftNeighbor | null;
  title: string;
  subtitle?: string;
  note?: string;
}>(), {
  subtitle: 'Keep the neighbor context front and center.',
  note: 'Helpful contact context stays visible here without crowding the conversation.',
});

const resolvedName = computed(() => {
  if (!props.neighbor) {
    return props.title;
  }

  const name = `${props.neighbor.firstName} ${props.neighbor.lastName}`.trim();
  return name || props.title;
});

const primaryPhoneLabel = computed(() => {
  const primaryPhone = props.neighbor?.phones.find((phone) => phone.isPrimary)
    || props.neighbor?.phones[0];

  return primaryPhone?.value || 'Phone number unavailable';
});

const phoneCountLabel = computed(() => {
  const count = props.neighbor?.phones.length || 0;
  return `${count || 0} ${count === 1 ? 'number' : 'numbers'}`;
});

const sharedPhoneLabel = computed(() => {
  const sharedCount = props.neighbor?.phones.filter((phone) => phone.isShared).length || 0;
  if (sharedCount === 0) {
    return '';
  }

  return `${sharedCount} shared ${sharedCount === 1 ? 'line' : 'lines'}`;
});

const preferenceChipLabel = computed(() => resolveConnectShyftPreferenceChip(props.neighbor));
</script>
