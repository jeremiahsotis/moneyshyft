<template>
  <div data-testid="app-shell-root" class="min-h-screen bg-slate-100 text-slate-900">
    <header class="border-b border-slate-200 bg-white/95 backdrop-blur">
      <div class="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="space-y-1">
            <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              ShyftUnity
            </p>
            <div class="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
              <h1 class="text-2xl font-semibold tracking-tight text-slate-900">
                {{ currentTitle }}
              </h1>
              <p class="text-sm text-slate-500">
                {{ currentSummary }}
              </p>
            </div>
          </div>

          <div
            data-testid="shell-orgunit-slot"
            class="hidden min-h-[44px] min-w-[12rem] rounded-full border border-dashed border-slate-200 px-4 py-2 sm:block"
            aria-hidden="true"
          />
        </div>

        <div class="mt-4">
          <ShellPrimaryNav />
        </div>

        <p
          v-if="isNavigating"
          data-testid="shell-loading-state"
          class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
        >
          Loading workspace...
        </p>

        <div
          data-testid="shell-subject-slot"
          class="mt-4"
          aria-hidden="true"
        />
      </div>
    </header>

    <div class="py-6">
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ShellPrimaryNav from '@/components/shell/ShellPrimaryNav.vue';
import { useShellNavigationState } from '@/shell/navigationState';

const route = useRoute();
const isNavigating = useShellNavigationState();

const currentTitle = computed(() => {
  const titledRecord = [...route.matched]
    .reverse()
    .find((record) => typeof record.meta.shellTitle === 'string');

  return typeof titledRecord?.meta.shellTitle === 'string'
    ? titledRecord.meta.shellTitle
    : 'ShyftUnity';
});

const currentSummary = computed(() => {
  const moduleRecord = [...route.matched]
    .reverse()
    .find((record) => typeof record.meta.shellModule === 'string');

  switch (moduleRecord?.meta.shellModule) {
    case 'people':
      return 'Identity and resolver work stays inside one shared workspace.';
    case 'connect':
      return 'Inbox, directory, and thread work stay inside the shared shell.';
    case 'settings':
      return 'Callback setup and operational settings stay inside the same app frame.';
    default:
      return 'One shared shell for People and ConnectShyft.';
  }
});
</script>
