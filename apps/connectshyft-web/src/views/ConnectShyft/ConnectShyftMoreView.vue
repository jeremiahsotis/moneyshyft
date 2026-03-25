<template>
  <main class="cs-page-shell">
    <section
      data-testid="connectshyft-more-surface"
      class="cs-page-shell__inner--narrow cs-card cs-card--padded cs-shell-panel"
    >
      <header class="mb-6">
        <SectionHeader
          eyebrow="ConnectShyft"
          title="ConnectShyft More"
          description="Secondary tools and policy-safe settings for ConnectShyft operators."
          size="md"
        />
        <p
          :data-testid="layoutTestId"
          class="cs-shell-notice cs-shell-notice--info mt-4"
        >
          {{ layoutLabel }}
        </p>
        <p
          v-if="settingsRefusalGuidance"
          data-testid="connectshyft-settings-refusal-guidance"
          class="cs-shell-notice cs-shell-notice--warning mt-4"
        >
          {{ settingsRefusalGuidance }}
        </p>
      </header>

      <section class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <RouterLink
          :to="{ path: '/app/connectshyft/directory', query: navigationQuery }"
          data-testid="connectshyft-more-option-directory"
          class="cs-card cs-card--compact cs-card--interactive cs-card--muted text-left"
        >
          <p class="cs-heading-md">Directory</p>
          <p class="mt-2 cs-meta">Find and open neighbor records for conversation work.</p>
        </RouterLink>

        <RouterLink
          :to="{ path: '/app/connectshyft/settings', query: navigationQuery }"
          data-testid="connectshyft-more-option-settings"
          class="cs-card cs-card--compact cs-card--interactive cs-card--muted text-left"
        >
          <p class="cs-heading-md">ConnectShyft Settings</p>
          <p class="mt-2 cs-meta">Set your callback / forwarding number and check voice forwarding readiness.</p>
        </RouterLink>

        <div
          data-testid="connectshyft-more-option-notifications"
          class="cs-card cs-card--compact cs-card--muted text-left"
        >
          <p class="cs-heading-md">Notifications</p>
          <p class="mt-2 cs-meta">Review notification preferences for volunteer-safe updates.</p>
        </div>

        <div
          data-testid="connectshyft-more-option-display-preferences"
          class="cs-card cs-card--compact cs-card--muted text-left"
        >
          <p class="cs-heading-md">Display Preferences</p>
          <p class="mt-2 cs-meta">Keep conversation views readable and volunteer-first.</p>
        </div>

        <RouterLink
          v-if="canAccessAdminSettings"
          :to="{ path: '/app/connectshyft/settings/availability', query: navigationQuery }"
          data-testid="connectshyft-more-admin-option-availability"
          class="cs-card cs-card--compact cs-card--interactive cs-card--muted text-left"
        >
          <p class="cs-heading-md">Availability</p>
          <p class="mt-2 cs-meta">Check module and capability rollout state for the current tenant.</p>
        </RouterLink>

        <RouterLink
          v-if="canAccessAdminSettings"
          :to="{ path: '/app/connectshyft/settings/numbers', query: navigationQuery }"
          data-testid="connectshyft-more-admin-option-numbers"
          class="cs-card cs-card--compact cs-card--interactive cs-card--muted text-left"
        >
          <p class="cs-heading-md">Number Mappings</p>
          <p class="mt-2 cs-meta">Review inbound and outbound ConnectShyft number assignments.</p>
        </RouterLink>

        <RouterLink
          v-if="canAccessAdminSettings"
          :to="{ path: '/app/connectshyft/settings/escalation', query: navigationQuery }"
          data-testid="connectshyft-more-admin-option-escalation"
          class="cs-card cs-card--compact cs-card--interactive cs-card--muted text-left"
        >
          <p class="cs-heading-md">Escalation Settings</p>
          <p class="mt-2 cs-meta">Manage escalation baselines and recipient policy routing.</p>
        </RouterLink>
      </section>

      <div class="mt-6">
        <ActionButton
          type="button"
          data-testid="connectshyft-more-option-sign-out"
          tone="secondary"
          @click="handleSignOut"
        >
          Sign Out
        </ActionButton>
      </div>
    </section>

  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ActionButton from '@/components/ui/ActionButton.vue';
import SectionHeader from '@/components/ui/SectionHeader.vue';
import { CONNECTSHYFT_RESPONSIVE_BREAKPOINTS } from '@/features/connectshyft/uiContracts';
import {
  hasConnectShyftAdminSettingsCapability,
  normalizeConnectShyftQueryValue,
  resolveConnectShyftAdminAccessFromQuery,
} from '@/features/connectshyft/settingsAccess';

const route = useRoute();
const router = useRouter();
const viewportWidth = ref<number>(typeof window === 'undefined' ? 1280 : window.innerWidth);

const updateViewportWidth = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  viewportWidth.value = window.innerWidth;
};

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateViewportWidth);
  }
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportWidth);
  }
});

const canAccessAdminSettings = computed(() => {
  const queryScopedAccess = resolveConnectShyftAdminAccessFromQuery(route.query);
  const capabilityScopedAccess = hasConnectShyftAdminSettingsCapability({
    hasAnyAdminAccess: false,
    hasCapability: () => false,
  });

  return queryScopedAccess === null ? capabilityScopedAccess : queryScopedAccess;
});

const navigationQuery = computed(() => {
  const {
    refusedPath: _refusedPath,
    settingsRefusal: _settingsRefusal,
    settingsRefusedPath: _settingsRefusedPath,
    ...rest
  } = route.query;

  return rest;
});

const layoutTestId = computed(() => {
  if (viewportWidth.value <= CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.mobile) {
    return 'connectshyft-more-layout-mobile';
  }

  if (viewportWidth.value <= CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.tablet) {
    return 'connectshyft-more-layout-tablet';
  }

  return 'connectshyft-more-layout-desktop';
});

const layoutLabel = computed(() => {
  if (layoutTestId.value === 'connectshyft-more-layout-mobile') {
    return 'Mobile More layout active';
  }

  if (layoutTestId.value === 'connectshyft-more-layout-tablet') {
    return 'Tablet More layout active';
  }

  return 'Desktop More layout active';
});

const settingsRefusalGuidance = computed(() => {
  const refusedPath = normalizeConnectShyftQueryValue(route.query.refusedPath);
  if (!refusedPath) {
    return '';
  }

  return `Access to ${refusedPath} is available to authorized admin users only. Use the approved settings entry points for your role.`;
});

const handleSignOut = async (): Promise<void> => {
  await router.push('/login');
};
</script>
