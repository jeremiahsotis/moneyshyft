<template>
  <div class="space-y-4">
    <section class="mx-auto max-w-7xl px-4 sm:px-6">
      <div class="rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.24)]">
        <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          Settings
        </p>
        <p class="mt-2 text-sm text-slate-600">
          Callback setup and operational settings stay in the same shared application frame.
        </p>
      </div>

      <nav
        v-if="navigationItems.length > 0"
        data-testid="shell-settings-nav"
        class="mt-4 flex flex-wrap gap-2"
      >
        <RouterLink
          v-for="item in navigationItems"
          :key="item.path"
          :to="{ path: item.path, query: navigationQuery }"
          :data-testid="`shell-settings-nav-${item.key}`"
          class="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition"
          :class="isActive(item.path)
            ? 'bg-slate-900 text-white shadow-sm'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </section>

    <RouterView />
  </div>
</template>

<script setup lang="ts">
import type { LocationQueryRaw } from 'vue-router';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { ShellSettingsNavigationItem } from '@/features/connectshyft/settingsNavigation';
import { fetchConnectShyftSettingsNavigation } from '@/features/connectshyft/settingsNavigation';
import { SHELL_ROUTE_PATHS } from '@/shell/routes';

const route = useRoute();
const navigationItems = ref<ShellSettingsNavigationItem[]>([
  {
    key: 'settings',
    label: 'Call routing',
    path: SHELL_ROUTE_PATHS.settings,
  },
]);

const navigationQuery = computed<LocationQueryRaw>(() => {
  const {
    refusedPath: _refusedPath,
    settingsRefusal: _settingsRefusal,
    settingsRefusedPath: _settingsRefusedPath,
    ...rest
  } = route.query;

  return rest as LocationQueryRaw;
});

const isActive = (path: string): boolean => route.path === path || route.path.startsWith(`${path}/`);

onMounted(async () => {
  navigationItems.value = await fetchConnectShyftSettingsNavigation();
});
</script>
