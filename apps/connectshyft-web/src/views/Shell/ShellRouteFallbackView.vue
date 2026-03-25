<template>
  <section class="mx-auto max-w-3xl px-4 sm:px-6">
    <div
      data-testid="shell-route-fallback"
      class="cs-card cs-card--roomy cs-shell-panel"
    >
      <p class="cs-kicker">
        Route unavailable
      </p>
      <h2 class="mt-3 cs-heading-lg">
        We couldn’t open that page.
      </h2>
      <p class="mt-3 cs-body">
        Return to an available workspace to keep moving.
      </p>

      <div class="cs-action-group mt-6">
        <RouterLink
          v-for="action in fallbackActions"
          :key="action.path"
          :to="{ path: action.path, query: navigationQuery }"
          :data-testid="`shell-route-fallback-${action.module}`"
          class="cs-button cs-button--primary"
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
