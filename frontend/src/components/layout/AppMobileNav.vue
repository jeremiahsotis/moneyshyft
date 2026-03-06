<template>
  <nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
    <div class="flex justify-around">
      <router-link
        v-for="item in navItems"
        :key="item.name"
        :to="item.path"
        class="flex flex-col items-center py-3 px-4 text-xs transition-colors"
        :class="isActive(item.path) ? 'text-primary-600' : 'text-gray-500'"
      >
        <span class="text-2xl mb-1">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();

const navItems = [
  { name: 'dashboard', label: 'Dashboard', icon: '📊', path: '/' },
  { name: 'accounts', label: 'Accounts', icon: '💰', path: '/accounts' },
  { name: 'budget', label: 'Budget', icon: '📈', path: '/budget' },
  { name: 'extra-money', label: 'Extra', icon: '💸', path: '/extra-money' },
  { name: 'transactions', label: 'Activity', icon: '📝', path: '/transactions' },
];

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/');
}
</script>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
