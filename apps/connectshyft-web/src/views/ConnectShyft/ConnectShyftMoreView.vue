<template>
  <main class="min-h-screen bg-slate-50 px-4 py-6 pb-32 sm:py-8">
    <section class="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header class="mb-6">
        <h1 class="text-2xl font-semibold text-slate-900">ConnectShyft More</h1>
        <p class="mt-2 text-sm text-slate-600">
          Secondary tools and policy-safe settings for ConnectShyft operators.
        </p>
      </header>

      <section class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <RouterLink
          to="/app/connectshyft/directory"
          class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100"
        >
          <p class="font-semibold text-slate-900">Directory</p>
          <p class="mt-1">Find and open neighbor records for conversation work.</p>
        </RouterLink>

        <RouterLink
          to="/app/connectshyft/settings"
          class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100"
        >
          <p class="font-semibold text-slate-900">Settings</p>
          <p class="mt-1">Open personal account settings and profile defaults.</p>
        </RouterLink>

        <RouterLink
          to="/app/connectshyft/settings/availability"
          v-if="canAccessAdminSettings"
          class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100"
        >
          <p class="font-semibold text-slate-900">Availability</p>
          <p class="mt-1">Check module and capability rollout state for the current tenant.</p>
        </RouterLink>

        <RouterLink
          to="/app/connectshyft/settings/numbers"
          v-if="canAccessAdminSettings"
          class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100"
        >
          <p class="font-semibold text-slate-900">Number Mappings</p>
          <p class="mt-1">Review inbound and outbound ConnectShyft number assignments.</p>
        </RouterLink>

        <RouterLink
          to="/app/connectshyft/settings/escalation"
          v-if="canAccessAdminSettings"
          class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100"
        >
          <p class="font-semibold text-slate-900">Escalation Settings</p>
          <p class="mt-1">Manage escalation baselines and recipient policy routing.</p>
        </RouterLink>
      </section>
    </section>

    <ConnectShyftPrimaryNav />
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ConnectShyftPrimaryNav from '@/components/connectshyft/ConnectShyftPrimaryNav.vue';
import {
  hasConnectShyftAdminSettingsCapability,
  resolveConnectShyftAdminAccessFromQuery,
} from '@/features/connectshyft/settingsAccess';

const route = useRoute();

const canAccessAdminSettings = computed(() => {
  const queryScopedAccess = resolveConnectShyftAdminAccessFromQuery(route.query);
  const capabilityScopedAccess = hasConnectShyftAdminSettingsCapability({
    hasAnyAdminAccess: false,
    hasCapability: () => false,
  });

  return queryScopedAccess === null ? capabilityScopedAccess : queryScopedAccess;
});
</script>
