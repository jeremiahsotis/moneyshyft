<template>
  <section class="mx-auto max-w-3xl px-4 sm:px-6">
    <div
      data-testid="shell-route-fallback"
      class="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.2)]"
    >
      <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
        Route unavailable
      </p>
      <h2 class="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
        We couldn’t open that page.
      </h2>
      <p class="mt-3 text-base text-slate-600">
        Return to People or ConnectShyft to keep working inside the shared shell.
      </p>

      <div class="mt-6 flex flex-wrap gap-3">
        <RouterLink
          :to="SHELL_ROUTE_PATHS.people"
          class="inline-flex min-h-[44px] items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Open People
        </RouterLink>
        <RouterLink
          :to="SHELL_ROUTE_PATHS.connect"
          class="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Open ConnectShyft
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { SHELL_ROUTE_PATHS } from '@/shell/routes';
</script>
