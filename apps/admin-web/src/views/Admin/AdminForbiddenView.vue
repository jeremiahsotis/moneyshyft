<template>
  <AppLayout>
    <div class="max-w-3xl mx-auto px-4 py-10">
      <div class="bg-white rounded-xl shadow p-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Admin Access Required</h1>
        <p class="text-gray-600">
          Your account is authenticated, but it does not currently have tenant or system admin access in this scope.
        </p>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/components/layout/AppLayout.vue';
</script>
