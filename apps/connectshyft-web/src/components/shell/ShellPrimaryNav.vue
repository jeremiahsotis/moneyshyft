<template>
  <nav
    aria-label="Primary navigation"
    data-testid="shell-primary-nav"
    class="cs-segmented"
  >
    <RouterLink
      v-for="item in navItems"
      :key="item.path"
      :to="{ path: item.path, query: navigationQuery }"
      :data-testid="`shell-primary-nav-${item.module}`"
      class="cs-segmented__item focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
      :class="isActive(item.module)
        ? 'cs-segmented__item--active'
        : ''"
      :aria-current="isActive(item.module) ? 'page' : undefined"
    >
      {{ item.label }}
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import type { LocationQueryRaw } from 'vue-router';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useShellAvailableOrgUnits } from '@/shell/orgUnitContext';
import { useActiveShellOrgUnitId } from '@/shell/orgUnitState';
import { isShellModuleAvailable, resolveShellModuleAvailability } from '@/shell/featureFlags';
import { SHELL_PRIMARY_NAV_ITEMS, type ShellModuleKey } from '@/shell/routes';

const route = useRoute();
const availableOrgUnits = useShellAvailableOrgUnits();
const currentOrgUnitId = useActiveShellOrgUnitId();
const navItems = computed(() => {
  const moduleAvailability = resolveShellModuleAvailability(
    availableOrgUnits.value,
    currentOrgUnitId.value,
  );

  return SHELL_PRIMARY_NAV_ITEMS.filter((item) =>
    isShellModuleAvailable(moduleAvailability, item.module));
});

const navigationQuery = computed<LocationQueryRaw>(() => {
  const {
    refusedPath: _refusedPath,
    settingsRefusal: _settingsRefusal,
    settingsRefusedPath: _settingsRefusedPath,
    ...rest
  } = route.query;

  return rest as LocationQueryRaw;
});

const activeModule = computed<ShellModuleKey | null>(() => {
  const matchedRecord = [...route.matched]
    .reverse()
    .find((record) => typeof record.meta.shellModule === 'string');
  const moduleKey = matchedRecord?.meta.shellModule;

  return moduleKey === 'people' || moduleKey === 'connect' || moduleKey === 'settings'
    ? moduleKey
    : null;
});

const isActive = (module: ShellModuleKey): boolean => activeModule.value === module;
</script>
