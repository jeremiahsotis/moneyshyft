<template>
  <nav
    data-testid="connectshyft-section-nav"
    class="cs-segmented"
  >
    <RouterLink
      v-for="item in navItems"
      :key="item.path"
      :to="{
        path: item.path,
        query: sanitizedQuery(),
      }"
      :data-testid="item.testId"
      :aria-label="item.ariaLabel"
      :style="tapTargetStyle"
      class="cs-segmented__item focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
      :class="isActive(item.path)
        ? 'cs-segmented__item--active'
        : ''"
    >
      {{ item.label }}
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import type { LocationQueryRaw } from 'vue-router';
import { useRoute } from 'vue-router';
import { CONNECTSHYFT_ACCESSIBILITY_LOCKS } from '@/features/connectshyft/uiContracts';
import { SHELL_ROUTE_PATHS } from '@/shell/routes';

const route = useRoute();
const tapTargetStyle = {
  minHeight: `${CONNECTSHYFT_ACCESSIBILITY_LOCKS.minTapTargetPx}px`,
};

const navItems = [
  {
    label: 'Inbox',
    ariaLabel: 'Open Inbox',
    path: SHELL_ROUTE_PATHS.connect,
    testId: 'connectshyft-section-nav-inbox',
  },
  {
    label: 'Mine',
    ariaLabel: 'Open Mine',
    path: SHELL_ROUTE_PATHS.connectMine,
    testId: 'connectshyft-section-nav-mine',
  },
  {
    label: 'Directory',
    ariaLabel: 'Open Directory',
    path: SHELL_ROUTE_PATHS.connectDirectory,
    testId: 'connectshyft-section-nav-directory',
  },
];

const sanitizedQuery = (): LocationQueryRaw => {
  const {
    refusedPath: _refusedPath,
    settingsRefusal: _settingsRefusal,
    settingsRefusedPath: _settingsRefusedPath,
    ...rest
  } = route.query;

  return rest as LocationQueryRaw;
};

const isActive = (path: string): boolean => {
  if (path === SHELL_ROUTE_PATHS.connectDirectory) {
    return route.path === path || route.path.startsWith(`${path}/`);
  }

  if (path === SHELL_ROUTE_PATHS.connectMine) {
    return route.path === path || route.path.startsWith(`${path}/`);
  }

  return route.path.startsWith(SHELL_ROUTE_PATHS.connect)
    && !route.path.startsWith(SHELL_ROUTE_PATHS.connectMine)
    && !route.path.startsWith(SHELL_ROUTE_PATHS.connectDirectory);
};
</script>
