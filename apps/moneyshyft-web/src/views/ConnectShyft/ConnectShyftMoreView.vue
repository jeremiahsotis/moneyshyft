<template>
  <main
    data-testid="connectshyft-more-surface"
    class="min-h-screen bg-slate-50 px-4 py-6 pb-32 sm:py-8"
  >
    <section
      :data-testid="layoutTestId"
      class="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header class="mb-6">
        <h1 class="text-2xl font-semibold text-slate-900">ConnectShyft More & Settings</h1>
        <p class="mt-2 text-sm text-slate-600">
          Volunteer-first tools for directory work, personal preferences, and sign-out.
        </p>
      </header>

      <p
        v-if="settingsRefusalMessage"
        data-testid="connectshyft-settings-refusal-guidance"
        class="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        {{ settingsRefusalMessage }}
      </p>

      <section class="mb-6">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Volunteer Tools
        </h2>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RouterLink
            to="/app/connectshyft/directory"
            :style="tapTargetStyle"
            data-testid="connectshyft-more-option-directory"
            aria-label="Open directory"
            class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            <p class="font-semibold text-slate-900">Directory</p>
            <p class="mt-1">Find and open neighbor records for communication work.</p>
          </RouterLink>

          <RouterLink
            to="/app/connectshyft/settings"
            :style="tapTargetStyle"
            data-testid="connectshyft-more-option-settings"
            aria-label="Open ConnectShyft settings"
            class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            <p class="font-semibold text-slate-900">Settings</p>
            <p class="mt-1">Open personal account settings and profile defaults.</p>
          </RouterLink>

          <article
            :style="tapTargetStyle"
            data-testid="connectshyft-more-option-notifications"
            class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700"
          >
            <p class="font-semibold text-slate-900">Notification Preferences</p>
            <p class="mt-1">Notification preferences are available in the next update.</p>
          </article>

          <article
            :style="tapTargetStyle"
            data-testid="connectshyft-more-option-display-preferences"
            class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700"
          >
            <p class="font-semibold text-slate-900">Display Preferences</p>
            <p class="mt-1">Display preferences are available in the next update.</p>
          </article>

          <button
            type="button"
            :style="tapTargetStyle"
            data-testid="connectshyft-more-option-sign-out"
            aria-label="Sign out"
            class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            @click="handleSignOut"
          >
            <p class="font-semibold text-slate-900">Sign Out</p>
            <p class="mt-1">End this session and return to the login screen.</p>
          </button>
        </div>
      </section>

      <section v-if="canAccessAdminSettings">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Admin Settings
        </h2>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RouterLink
            to="/app/connectshyft/settings/availability"
            :style="tapTargetStyle"
            data-testid="connectshyft-more-admin-option-availability"
            class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            <p class="font-semibold text-slate-900">Availability</p>
            <p class="mt-1">Review module rollout and admin capability status.</p>
          </RouterLink>

          <RouterLink
            to="/app/connectshyft/settings/numbers"
            :style="tapTargetStyle"
            data-testid="connectshyft-more-admin-option-numbers"
            class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            <p class="font-semibold text-slate-900">Number Mappings</p>
            <p class="mt-1">Manage inbound and outbound number assignments.</p>
          </RouterLink>

          <RouterLink
            to="/app/connectshyft/settings/escalation"
            :style="tapTargetStyle"
            data-testid="connectshyft-more-admin-option-escalation"
            class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            <p class="font-semibold text-slate-900">Escalation Settings</p>
            <p class="mt-1">Set escalation baseline and recipient policies.</p>
          </RouterLink>
        </div>
      </section>
    </section>

    <ConnectShyftPrimaryNav />
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ConnectShyftPrimaryNav from '@/components/connectshyft/ConnectShyftPrimaryNav.vue';
import {
  CONNECTSHYFT_ACCESSIBILITY_LOCKS,
  CONNECTSHYFT_RESPONSIVE_BREAKPOINTS,
  sanitizeConnectShyftOperatorCopy,
} from '@/features/connectshyft/uiContracts';
import {
  hasConnectShyftAdminSettingsCapability,
  normalizeConnectShyftQueryValue,
  resolveConnectShyftAdminAccessFromQuery,
} from '@/features/connectshyft/settingsAccess';
import { useAccessStore } from '@/stores/access';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const accessStore = useAccessStore();
const authStore = useAuthStore();

const viewportWidth = ref(
  typeof window === 'undefined'
    ? CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.desktop
    : window.innerWidth,
);

const tapTargetStyle = {
  minHeight: `${CONNECTSHYFT_ACCESSIBILITY_LOCKS.minTapTargetPx}px`,
};

const canAccessAdminSettings = computed(() => {
  const queryScopedAccess = resolveConnectShyftAdminAccessFromQuery(route.query);
  const capabilityScopedAccess = hasConnectShyftAdminSettingsCapability({
    hasAnyAdminAccess: accessStore.hasAnyAdminAccess,
    hasCapability: accessStore.hasCapability,
  });

  return queryScopedAccess === null
    ? capabilityScopedAccess
    : queryScopedAccess;
});

const settingsRefusalMessage = computed(() => {
  const settingsRefusal = normalizeConnectShyftQueryValue(route.query.settingsRefusal);
  if (settingsRefusal !== 'admin-path-forbidden') {
    return '';
  }

  const rawRefusedPath = normalizeConnectShyftQueryValue(route.query.settingsRefusedPath);
  const message = rawRefusedPath
    ? `That path is for authorized admin users only. Open an admin account to access ${rawRefusedPath}.`
    : 'That path is for authorized admin users only. Open an admin account to continue.';

  return sanitizeConnectShyftOperatorCopy(
    message,
    'That path is for authorized admin users only.',
  );
});

const layoutTestId = computed(() => {
  if (viewportWidth.value >= CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.desktop) {
    return 'connectshyft-more-layout-desktop';
  }

  if (viewportWidth.value >= CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.tablet) {
    return 'connectshyft-more-layout-tablet';
  }

  return 'connectshyft-more-layout-mobile';
});

const updateViewportWidth = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  viewportWidth.value = window.innerWidth;
};

const handleSignOut = async (): Promise<void> => {
  await authStore.logout();
  accessStore.clear();
  await router.push({ name: 'login' });
};

onMounted(() => {
  updateViewportWidth();
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateViewportWidth);
  }
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportWidth);
  }
});
</script>
