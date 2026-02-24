<template>
  <nav
    v-if="!hideGlobalMobileNav"
    class="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom"
  >
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
import { computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAccessStore } from '@/stores/access';

const route = useRoute();
const authStore = useAuthStore();
const accessStore = useAccessStore();

const moneyNavItems = [
  { name: 'dashboard', label: 'Dashboard', icon: '📊', path: '/' },
  { name: 'accounts', label: 'Accounts', icon: '💰', path: '/accounts' },
  { name: 'budget', label: 'Budget', icon: '📈', path: '/budget' },
  { name: 'extra-money', label: 'Extra', icon: '💸', path: '/extra-money' },
  { name: 'transactions', label: 'Activity', icon: '📝', path: '/transactions' },
];

const connectShyftNavItems = [
  { name: 'connectshyft-inbox', label: 'Inbox', icon: '📬', path: '/app/connectshyft/inbox' },
  { name: 'connectshyft-availability', label: 'Avail', icon: '🛰️', path: '/app/connectshyft/settings/availability' },
];

const navItems = computed(() => {
  const items: Array<{ name: string; label: string; icon: string; path: string }> = [];

  if (authStore.isAuthenticated && accessStore.canAccessMoneyShyft) {
    items.push(...moneyNavItems);
  }

  if (authStore.isAuthenticated && accessStore.canAccessConnectShyft) {
    items.push(...connectShyftNavItems);
  }

  if (authStore.isAuthenticated && accessStore.hasAnyAdminAccess) {
    const adminPath = accessStore.canAccessSystemAdmin ? '/admin/system' : '/admin/tenant';
    items.push({ name: 'admin', label: 'Admin', icon: '🛡️', path: adminPath });
  }

  return items;
});

const hideGlobalMobileNav = computed(() => route.path.startsWith('/admin/tenant'));

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/');
}

const refreshAccess = async (): Promise<void> => {
  if (!authStore.isAuthenticated) {
    accessStore.clear();
    return;
  }

  await accessStore.refresh({ tenantId: authStore.user?.householdId || undefined });
};

onMounted(() => {
  void refreshAccess();
});

watch(
  () => [authStore.isAuthenticated, authStore.user?.householdId],
  () => {
    void refreshAccess();
  }
);
</script>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
