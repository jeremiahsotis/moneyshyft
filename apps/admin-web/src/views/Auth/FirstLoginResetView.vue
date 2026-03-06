<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-100 to-blue-100 px-4">
    <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
      <header class="text-center">
        <p class="text-xs uppercase tracking-[0.08em] text-slate-500 font-semibold">Security Check</p>
        <h1 class="mt-2 text-2xl font-bold text-slate-900">Set your permanent password</h1>
        <p class="mt-2 text-sm text-slate-600">
          Your account was created with a temporary password. Create a new one to continue.
        </p>
      </header>

      <form class="mt-6 space-y-4" @submit.prevent="submitReset">
        <div v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ errorMessage }}
        </div>

        <div>
          <label for="current-password" class="block text-sm font-medium text-slate-700">Temporary password</label>
          <input
            id="current-password"
            v-model="currentPassword"
            type="password"
            class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            required
          />
        </div>

        <div>
          <label for="new-password" class="block text-sm font-medium text-slate-700">New password</label>
          <input
            id="new-password"
            v-model="newPassword"
            type="password"
            class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            required
          />
        </div>

        <div>
          <label for="confirm-password" class="block text-sm font-medium text-slate-700">Confirm new password</label>
          <input
            id="confirm-password"
            v-model="confirmPassword"
            type="password"
            class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            required
          />
        </div>

        <button
          type="submit"
          class="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="authStore.isLoading"
        >
          {{ authStore.isLoading ? 'Updating password…' : 'Update password' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAccessStore } from '@/stores/access';

const router = useRouter();
const authStore = useAuthStore();
const accessStore = useAccessStore();

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const errorMessage = ref('');

const submitReset = async (): Promise<void> => {
  errorMessage.value = '';

  if (newPassword.value.length < 10) {
    errorMessage.value = 'Use at least 10 characters for the new password.';
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'New password and confirmation do not match.';
    return;
  }

  try {
    await authStore.resetFirstLoginPassword(currentPassword.value, newPassword.value);
    await accessStore.refresh({
      tenantId: authStore.user?.activeTenantId || authStore.user?.householdId || undefined,
    });
    router.replace(accessStore.defaultAuthorizedPath);
  } catch (error: any) {
    errorMessage.value = authStore.error || error?.response?.data?.message || error?.message || 'Password reset failed';
  }
};
</script>
