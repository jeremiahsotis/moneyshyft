<template>
  <nav
    data-testid="connectshyft-bottom-nav"
    class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-300 bg-white/95 backdrop-blur-sm"
  >
    <div class="mx-auto flex w-full max-w-4xl items-center justify-around gap-2 px-3 py-2">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="buildNavTarget(item.path)"
        :data-testid="item.testId"
        :aria-label="item.ariaLabel"
        :style="tapTargetStyle"
        class="inline-flex min-h-[44px] min-w-[96px] items-center justify-center rounded-lg px-3 text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        :class="isActive(item.path) ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'"
      >
        {{ item.label }}
        <span
          v-if="item.path === '/app/connectshyft/more' && isActive(item.path)"
          data-testid="connectshyft-primary-nav-more-active"
          class="sr-only"
        >
          More active
        </span>
      </RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRoute, type LocationQueryRaw } from 'vue-router';
import { CONNECTSHYFT_ACCESSIBILITY_LOCKS } from '@/features/connectshyft/uiContracts';

const route = useRoute();
const tapTargetStyle = {
  minHeight: `${CONNECTSHYFT_ACCESSIBILITY_LOCKS.minTapTargetPx}px`,
};

const navItems = [
  {
    label: 'Inbox',
    ariaLabel: 'Open Inbox',
    path: '/app/connectshyft/inbox',
    testId: 'connectshyft-bottom-nav-inbox',
  },
  {
    label: 'Mine',
    ariaLabel: 'Open Mine',
    path: '/app/connectshyft/mine',
    testId: 'connectshyft-bottom-nav-mine',
  },
  {
    label: 'More',
    ariaLabel: 'Open More',
    path: '/app/connectshyft/more',
    testId: 'connectshyft-bottom-nav-more',
  },
];

const TRANSIENT_QUERY_KEYS = new Set([
  'settingsRefusal',
  'settingsRefusedPath',
]);

const isActive = (path: string): boolean => {
  if (path === '/app/connectshyft/more') {
    return route.path.startsWith('/app/connectshyft/more')
      || route.path.startsWith('/app/connectshyft/settings');
  }

  return route.path === path || route.path.startsWith(`${path}/`);
};

const buildNavTarget = (path: string): { path: string; query: LocationQueryRaw } => {
  const query: LocationQueryRaw = {};

  for (const [key, value] of Object.entries(route.query)) {
    if (TRANSIENT_QUERY_KEYS.has(key)) {
      continue;
    }
    query[key] = value;
  }

  return {
    path,
    query,
  };
};
</script>
