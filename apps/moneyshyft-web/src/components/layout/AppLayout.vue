<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <AppHeader />

    <!-- Main Content -->
    <main class="pb-20 lg:pb-8">
      <slot />
    </main>

    <!-- Bottom Navigation -->
    <AppMobileNav />

    <!-- Undo Toast -->
    <UndoToast />

    <!-- Celebration Toast -->
    <CelebrationToast />
  </div>
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue';
import AppMobileNav from './AppMobileNav.vue';
import UndoToast from '@/components/common/UndoToast.vue';
import CelebrationToast from '@/components/common/CelebrationToast.vue';
</script>
