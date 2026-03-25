<template>
  <section class="mx-auto max-w-3xl px-4 sm:px-6">
    <div
      data-testid="shell-route-fallback"
      class="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.2)]"
    >
      <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
        Route unavailable
      </p>
      <h2 class="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
        We couldn’t open that page.
      </h2>
      <p class="mt-3 text-base text-slate-600">
        Return to an available workspace to keep moving.
      </p>

      <div class="mt-6 flex flex-wrap gap-3">
        <RouterLink
          v-for="action in fallbackActions"
          :key="action.path"
          :to="{ path: action.path, query: navigationQuery }"
          :data-testid="`shell-route-fallback-${action.module}`"
          class="inline-flex min-h-[44px] items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          {{ action.label }}
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { LocationQueryRaw } from 'vue-router';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useShellAvailableOrgUnits } from '@/shell/orgUnitContext';
import { useActiveShellOrgUnitId } from '@/shell/orgUnitState';
import { isShellModuleAvailable, resolveShellModuleAvailability } from '@/shell/featureFlags';
import { SHELL_PRIMARY_NAV_ITEMS } from '@/shell/routes';

const route = useRoute();
const availableOrgUnits = useShellAvailableOrgUnits();
const currentOrgUnitId = useActiveShellOrgUnitId();

const navigationQuery = computed<LocationQueryRaw>(() => {
  const {
    refusedPath: _refusedPath,
    settingsRefusal: _settingsRefusal,
    settingsRefusedPath: _settingsRefusedPath,
    ...rest
  } = route.query;

  return rest as LocationQueryRaw;
});

const fallbackActions = computed(() => {
  const moduleAvailability = resolveShellModuleAvailability(
    availableOrgUnits.value,
    currentOrgUnitId.value,
  );

  return SHELL_PRIMARY_NAV_ITEMS
    .filter((item) => item.module !== 'settings')
    .filter((item) => isShellModuleAvailable(moduleAvailability, item.module))
    .map((item) => ({
      ...item,
      label: `Open ${item.label}`,
    }));
});
</script>
