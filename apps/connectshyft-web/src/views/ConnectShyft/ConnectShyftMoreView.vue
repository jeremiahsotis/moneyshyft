<template>
  <main class="min-h-screen bg-slate-50 px-4 py-6 pb-32 sm:py-8">
    <section
      data-testid="connectshyft-more-surface"
      class="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header class="mb-6">
        <h1 class="text-2xl font-semibold text-slate-900">ConnectShyft More</h1>
        <p class="mt-2 text-sm text-slate-600">
          Secondary tools and policy-safe settings for ConnectShyft operators.
        </p>
        <p
          :data-testid="layoutTestId"
          class="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
        >
          {{ layoutLabel }}
        </p>
        <p
          v-if="settingsRefusalGuidance"
          data-testid="connectshyft-settings-refusal-guidance"
          class="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {{ settingsRefusalGuidance }}
        </p>
      </header>

      <section class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <RouterLink
          :to="{ path: '/app/connectshyft/directory', query: navigationQuery }"
          data-testid="connectshyft-more-option-directory"
          class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100"
        >
          <p class="font-semibold text-slate-900">Directory</p>
          <p class="mt-1">Find and open neighbor records for conversation work.</p>
        </RouterLink>

        <RouterLink
          :to="{ path: '/app/connectshyft/settings', query: navigationQuery }"
          data-testid="connectshyft-more-option-settings"
          class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100"
        >
          <p class="font-semibold text-slate-900">ConnectShyft Settings</p>
          <p class="mt-1">Set your callback / forwarding number and check voice forwarding readiness.</p>
        </RouterLink>

        <div
          data-testid="connectshyft-more-option-notifications"
          class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700"
        >
          <p class="font-semibold text-slate-900">Notifications</p>
          <p class="mt-1">Review notification preferences for volunteer-safe updates.</p>
        </div>

        <div
          data-testid="connectshyft-more-option-display-preferences"
          class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700"
        >
          <p class="font-semibold text-slate-900">Display Preferences</p>
          <p class="mt-1">Keep conversation views readable and volunteer-first.</p>
        </div>

        <RouterLink
          v-if="canAccessAdminSettings"
          :to="{ path: '/app/connectshyft/settings/availability', query: navigationQuery }"
          data-testid="connectshyft-more-admin-option-availability"
          class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100"
        >
          <p class="font-semibold text-slate-900">Availability</p>
          <p class="mt-1">Check module and capability rollout state for the current tenant.</p>
        </RouterLink>

        <RouterLink
          v-if="canAccessAdminSettings"
          :to="{ path: '/app/connectshyft/settings/numbers', query: navigationQuery }"
          data-testid="connectshyft-more-admin-option-numbers"
          class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100"
        >
          <p class="font-semibold text-slate-900">Number Mappings</p>
          <p class="mt-1">Review inbound and outbound ConnectShyft number assignments.</p>
        </RouterLink>

        <RouterLink
          v-if="canAccessAdminSettings"
          :to="{ path: '/app/connectshyft/settings/escalation', query: navigationQuery }"
          data-testid="connectshyft-more-admin-option-escalation"
          class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100"
        >
          <p class="font-semibold text-slate-900">Escalation Settings</p>
          <p class="mt-1">Manage escalation baselines and recipient policy routing.</p>
        </RouterLink>
      </section>

      <div class="mt-6">
        <button
          type="button"
          data-testid="connectshyft-more-option-sign-out"
          class="min-h-[44px] rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          @click="handleSignOut"
        >
          Sign Out
        </button>
      </div>
    </section>

    <ConnectShyftPrimaryNav />
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ConnectShyftPrimaryNav from '@/components/connectshyft/ConnectShyftPrimaryNav.vue';
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
