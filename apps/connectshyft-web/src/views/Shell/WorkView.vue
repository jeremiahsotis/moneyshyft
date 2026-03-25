<template>
  <div class="space-y-4">
    <section class="mx-auto max-w-7xl px-4 sm:px-6">
      <SurfaceCard tone="soft" padding="compact" panel>
        <SectionHeader
          eyebrow="Settings"
          title="Workspace setup"
          description="Call routing and workspace settings live here."
          size="md"
        />
        <p
          v-if="settingsRefusalGuidance"
          data-testid="shell-settings-refusal-guidance"
          class="cs-shell-notice cs-shell-notice--warning mt-4"
        >
          {{ settingsRefusalGuidance }}
        </p>
      </SurfaceCard>

      <nav
        v-if="navigationItems.length > 0"
        data-testid="shell-settings-nav"
        class="cs-segmented mt-4"
      >
        <RouterLink
          v-for="item in navigationItems"
          :key="item.path"
          :to="{ path: item.path, query: navigationQuery }"
          :data-testid="`shell-settings-nav-${item.key}`"
          class="cs-segmented__item"
          :class="isActive(item.path)
            ? 'cs-segmented__item--active'
            : ''"
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
import SectionHeader from '@/components/ui/SectionHeader.vue';
import SurfaceCard from '@/components/ui/SurfaceCard.vue';
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

const settingsRefusalGuidance = computed(() => (
  typeof route.query.refusedPath === 'string' && route.query.refusedPath.trim().length > 0
    ? 'That settings page is not available for your current access in this workspace.'
    : ''
));

const isActive = (path: string): boolean => route.path === path || route.path.startsWith(`${path}/`);

onMounted(async () => {
  navigationItems.value = await fetchConnectShyftSettingsNavigation();
});
</script>
