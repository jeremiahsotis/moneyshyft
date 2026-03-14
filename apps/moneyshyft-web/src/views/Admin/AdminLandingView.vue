<template>
  <AppLayout>
    <div class="max-w-3xl mx-auto px-4 py-10">
      <div class="bg-white rounded-xl shadow p-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Administration</h1>
        <p class="text-gray-600">Resolving the best administration workspace for your role.</p>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import { useAccessStore } from '@/stores/access';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const accessStore = useAccessStore();

const redirectToWorkspace = async (): Promise<void> => {
  if (!authStore.user) {
    await authStore.fetchCurrentUser();
  }

  if (!authStore.user) {
    router.replace({ name: 'login' });
    return;
  }

  await accessStore.refresh({ tenantId: authStore.user.householdId });

  if (accessStore.canAccessSystemAdmin) {
    router.replace({ name: 'admin-system' });
    return;
  }

  if (accessStore.canAccessTenantAdmin) {
    router.replace({ name: 'admin-tenant' });
    return;
  }

  router.replace({ name: 'dashboard' });
};

onMounted(() => {
  void redirectToWorkspace();
});
</script>
