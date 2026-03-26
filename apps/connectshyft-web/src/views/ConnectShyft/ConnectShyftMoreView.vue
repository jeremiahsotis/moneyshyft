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
          description="Keep the essentials close without crowding the everyday work."
          size="md"
        />
        <p
          :data-testid="layoutTestId"
          aria-hidden="true"
          class="hidden"
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
          <p class="mt-2 cs-meta">Set your callback number and review calling and texting setup.</p>
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
import { normalizeConnectShyftQueryValue } from '@/features/connectshyft/settingsAccess';

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

  return 'That page is only available to people with the right permissions. Use the settings pages available for your role.';
});

const handleSignOut = async (): Promise<void> => {
  await router.push('/login');
};
</script>
