<template>
  <main
    data-testid="connectshyft-availability-surface"
    class="min-h-screen bg-slate-50 px-4 py-8 pb-32"
  >
    <section class="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header class="mb-6">
        <h1 class="text-2xl font-semibold text-slate-900">
          ConnectShyft Availability
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          Current module and sub-capability rollout state for this tenant.
        </p>
        <p
          data-testid="connectshyft-admin-settings-context-chip"
          class="mt-3 inline-flex rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700"
        >
          Admin Settings Path
        </p>
      </header>

      <section
        data-testid="connectshyft-availability-config-form"
        class="mb-6 rounded-md border border-slate-200 p-4"
      >
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Capability Status
        </h2>
        <dl class="grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-4">
          <div class="rounded border border-slate-200 p-3">
            <dt>Module</dt>
            <dd class="mt-1 font-medium">
              {{ moduleAvailable ? 'Available' : 'Unavailable' }}
            </dd>
          </div>
          <div class="rounded border border-slate-200 p-3">
            <dt>Inbox</dt>
            <dd
              data-testid="connectshyft-capability-inbox"
              class="mt-1 font-medium"
            >
              {{ inboxAvailable ? 'Available' : 'Unavailable' }}
            </dd>
          </div>
          <div class="rounded border border-slate-200 p-3">
            <dt>Escalation</dt>
            <dd
              data-testid="connectshyft-capability-escalation"
              class="mt-1 font-medium"
            >
              {{ escalationAvailable ? 'Available' : 'Unavailable' }}
            </dd>
          </div>
          <div class="rounded border border-slate-200 p-3">
            <dt>Webhooks</dt>
            <dd
              data-testid="connectshyft-capability-webhooks"
              class="mt-1 font-medium"
            >
              {{ webhooksAvailable ? 'Available' : 'Unavailable' }}
            </dd>
          </div>
        </dl>
      </section>

      <p
        v-if="maintenanceBanner"
        data-testid="connectshyft-capability-maintenance-banner"
        class="mb-4 rounded-md border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700"
      >
        {{ maintenanceBanner }}
      </p>

      <p
        v-if="!moduleAvailable"
        data-testid="connectshyft-unavailable-state"
        class="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        {{
          entitlementDisabled
            ? 'ConnectShyft module entitlement is disabled for this tenant.'
            : 'ConnectShyft module access is unavailable for this tenant.'
        }}
      </p>

      <p
        v-if="!webhooksAvailable"
        class="mb-4 text-sm text-slate-700"
      >
        Inbound webhook processing is currently unavailable for this tenant.
      </p>

      <button
        type="button"
        :disabled="!webhooksAvailable"
        class="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        Replay webhook
      </button>
    </section>

    <ConnectShyftPrimaryNav />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import ConnectShyftPrimaryNav from '@/components/connectshyft/ConnectShyftPrimaryNav.vue';
import {
  DEFAULT_CONNECTSHYFT_AVAILABILITY,
  fetchConnectShyftAvailability,
} from '@/features/connectshyft/flags';

const availability = ref({ ...DEFAULT_CONNECTSHYFT_AVAILABILITY });

onMounted(async () => {
  availability.value = await fetchConnectShyftAvailability();
});

const moduleAvailable = computed(() => availability.value.capabilities.module);
const inboxAvailable = computed(() => availability.value.capabilities.inbox);
const escalationAvailable = computed(() => availability.value.capabilities.escalation);
const webhooksAvailable = computed(() => availability.value.capabilities.webhooks);

const entitlementDisabled = computed(
  () => availability.value.entitlement != null && availability.value.entitlement.enabled === false,
);

const maintenanceBanner = computed(() => {
  if (availability.value.refusal?.message) {
    return availability.value.refusal.message;
  }

  if (!moduleAvailable.value) {
    return '';
  }

  if (!webhooksAvailable.value) {
    return 'Webhook processing is temporarily unavailable for this tenant.';
  }

  return '';
});
</script>
