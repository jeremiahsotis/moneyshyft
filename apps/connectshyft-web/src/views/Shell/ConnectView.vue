<template>
  <div class="space-y-4">
    <section class="mx-auto max-w-7xl px-4 sm:px-6">
      <div class="rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.24)]">
        <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          ConnectShyft
        </p>
        <p class="mt-2 text-sm text-slate-600">
          Inbox, directory, and conversations stay together here.
        </p>
      </div>

      <div class="mt-4">
        <ConnectShyftPrimaryNav />
      </div>
    </section>

    <RouterView />
  </div>
</template>

<script setup lang="ts">
import ConnectShyftPrimaryNav from '@/components/connectshyft/ConnectShyftPrimaryNav.vue';
</script>
