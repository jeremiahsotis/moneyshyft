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
            class="sm:min-w-[14rem]"
          >
            <ShellOrgUnitSelector
              :current-org-unit-id="currentOrgUnitId"
              :options="availableOrgUnits"
              :loading="orgUnitLoading"
              @request-switch="handleOrgUnitSelection"
            />
            <p
              v-if="orgUnitError"
              data-testid="shell-orgunit-error"
              class="mt-2 text-xs text-rose-600"
            >
              {{ orgUnitError }}
            </p>
          </div>
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
      <RouterView v-slot="{ Component }">
        <component
          :is="Component"
          :key="shellRouteViewKey"
        />
      </RouterView>
    </div>

    <div
      v-if="pendingOrgUnitSwitch"
      data-testid="shell-orgunit-confirmation"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shell-orgunit-confirmation-title"
    >
      <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h2
          id="shell-orgunit-confirmation-title"
          class="text-lg font-semibold text-slate-900"
        >
          Switch orgUnit?
        </h2>
        <p class="mt-3 text-sm leading-6 text-slate-600">
          This will clear the current person or conversation and take you to the nearest available page in the selected orgUnit.
        </p>
        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            data-testid="shell-orgunit-cancel"
            class="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            @click="cancelPendingOrgUnitSwitch"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="shell-orgunit-confirm-switch"
            class="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            @click="confirmPendingOrgUnitSwitch"
          >
            Switch orgUnit
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ConnectShyftShellOrgUnitOption } from '@shyft/contracts';
import { computed, onMounted, ref, watch } from 'vue';
import type { LocationQueryRaw } from 'vue-router';
import { useRoute, useRouter } from 'vue-router';
import ShellOrgUnitSelector from '@/components/shell/ShellOrgUnitSelector.vue';
import ShellPrimaryNav from '@/components/shell/ShellPrimaryNav.vue';
import { useShellNavigationState } from '@/shell/navigationState';
import {
  evaluateShellOrgUnitSwitch,
  isShellRouteCompatibleWithOrgUnit,
} from '@/shell/orgUnitRouteSafety';
import {
  findShellOrgUnit,
  loadShellOrgUnitContext,
  selectShellOrgUnit,
  useShellAvailableOrgUnits,
  useShellOrgUnitError,
  useShellOrgUnitLoading,
} from '@/shell/orgUnitContext';
import { useActiveShellOrgUnitId } from '@/shell/orgUnitState';
import {
  clearSubjectContext,
  subjectContextHasActiveSubject,
  useSubjectContext,
} from '@/shell/subjectContext';

const route = useRoute();
const router = useRouter();
const isNavigating = useShellNavigationState();
const availableOrgUnits = useShellAvailableOrgUnits();
const currentOrgUnitId = useActiveShellOrgUnitId();
const orgUnitLoading = useShellOrgUnitLoading();
const orgUnitError = useShellOrgUnitError();
const subjectContext = useSubjectContext();
const pendingOrgUnitSwitch = ref<{
  targetOrgUnit: ConnectShyftShellOrgUnitOption;
  redirectPath: string;
} | null>(null);

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

const shellRouteViewKey = computed(() => `${route.fullPath}::${currentOrgUnitId.value}`);

const buildRouteQueryWithOrgUnit = (orgUnitId: string): LocationQueryRaw => ({
  ...route.query,
  orgUnitId,
});

const syncSubjectOrgUnit = (orgUnitId: string): void => {
  if (!orgUnitId || subjectContextHasActiveSubject(subjectContext.value)) {
    return;
  }

  if (subjectContext.value.orgUnitId === orgUnitId) {
    return;
  }

  subjectContext.value = {
    ...subjectContext.value,
    orgUnitId,
  };
};

const preserveCurrentRouteForOrgUnit = async (orgUnitId: string): Promise<void> => {
  await router.replace({
    path: route.path,
    query: buildRouteQueryWithOrgUnit(orgUnitId),
    hash: route.hash,
  });
};

const redirectToLandingForOrgUnit = async (
  orgUnitId: string,
  redirectPath: string,
): Promise<void> => {
  await router.replace({
    path: redirectPath,
    query: buildRouteQueryWithOrgUnit(orgUnitId),
  });
};

const applyOrgUnitSwitch = async (input: {
  orgUnitId: string;
  redirectPath?: string;
  clearSubject: boolean;
}): Promise<void> => {
  const resolvedOrgUnit = selectShellOrgUnit(input.orgUnitId);
  if (!resolvedOrgUnit) {
    return;
  }

  if (input.clearSubject) {
    clearSubjectContext(subjectContext, resolvedOrgUnit.id);
  } else {
    syncSubjectOrgUnit(resolvedOrgUnit.id);
  }

  if (input.redirectPath) {
    await redirectToLandingForOrgUnit(resolvedOrgUnit.id, input.redirectPath);
    return;
  }

  await preserveCurrentRouteForOrgUnit(resolvedOrgUnit.id);
};

const normalizeShellRoute = async (): Promise<void> => {
  if (!currentOrgUnitId.value) {
    return;
  }

  const resolvedOrgUnit = findShellOrgUnit(currentOrgUnitId.value);
  if (!resolvedOrgUnit) {
    return;
  }

  const routeIsCompatible = isShellRouteCompatibleWithOrgUnit({
    route,
    subjectContext: subjectContext.value,
    targetOrgUnit: resolvedOrgUnit,
  });

  if (routeIsCompatible) {
    syncSubjectOrgUnit(resolvedOrgUnit.id);
    const currentQueryOrgUnitId = typeof route.query.orgUnitId === 'string'
      ? route.query.orgUnitId.trim()
      : '';
    if (currentQueryOrgUnitId !== resolvedOrgUnit.id) {
      await preserveCurrentRouteForOrgUnit(resolvedOrgUnit.id);
    }
    return;
  }

  clearSubjectContext(subjectContext, resolvedOrgUnit.id);
  const fallbackEvaluation = evaluateShellOrgUnitSwitch({
    route,
    subjectContext: subjectContext.value,
    targetOrgUnit: resolvedOrgUnit,
  });
  if (
    fallbackEvaluation.kind === 'destructive'
    && route.path !== fallbackEvaluation.redirectPath
  ) {
    await redirectToLandingForOrgUnit(resolvedOrgUnit.id, fallbackEvaluation.redirectPath);
    return;
  }

  await preserveCurrentRouteForOrgUnit(resolvedOrgUnit.id);
};

const handleOrgUnitSelection = async (targetOrgUnitId: string): Promise<void> => {
  const targetOrgUnit = findShellOrgUnit(targetOrgUnitId);
  if (!targetOrgUnit || targetOrgUnit.id === currentOrgUnitId.value) {
    return;
  }

  const evaluation = evaluateShellOrgUnitSwitch({
    route,
    subjectContext: subjectContext.value,
    targetOrgUnit,
  });

  if (evaluation.kind === 'safe') {
    await applyOrgUnitSwitch({
      orgUnitId: targetOrgUnit.id,
      clearSubject: false,
    });
    return;
  }

  pendingOrgUnitSwitch.value = {
    targetOrgUnit,
    redirectPath: evaluation.redirectPath,
  };
};

const cancelPendingOrgUnitSwitch = (): void => {
  pendingOrgUnitSwitch.value = null;
};

const confirmPendingOrgUnitSwitch = async (): Promise<void> => {
  const pendingSwitch = pendingOrgUnitSwitch.value;
  pendingOrgUnitSwitch.value = null;

  if (!pendingSwitch) {
    return;
  }

  await applyOrgUnitSwitch({
    orgUnitId: pendingSwitch.targetOrgUnit.id,
    redirectPath: pendingSwitch.redirectPath,
    clearSubject: true,
  });
};

onMounted(async () => {
  const context = await loadShellOrgUnitContext();
  if (!context) {
    return;
  }

  await normalizeShellRoute();
});

watch(
  () => route.fullPath,
  () => {
    if (!currentOrgUnitId.value) {
      return;
    }

    void normalizeShellRoute();
  },
);

defineExpose({
  handleOrgUnitSelection,
  confirmPendingOrgUnitSwitch,
  cancelPendingOrgUnitSwitch,
});
</script>
