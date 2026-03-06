<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
    <div class="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow-xl">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-slate-900">Set New Password</h1>
        <p class="mt-2 text-sm text-slate-600">Choose a new password to complete reset.</p>
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {{ errorMessage }}
        </div>
        <div v-if="successMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {{ successMessage }}
        </div>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700">Reset Token</span>
          <input
            v-model="token"
            type="text"
            required
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700">New Password</span>
          <input
            v-model="newPassword"
            type="password"
            minlength="8"
            required
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700">Confirm New Password</span>
          <input
            v-model="confirmPassword"
            type="password"
            minlength="8"
            required
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span v-if="isSubmitting">Resetting...</span>
          <span v-else>Reset password</span>
        </button>

        <router-link to="/login" class="block text-center text-sm text-slate-600 hover:text-slate-900">
          Back to login
        </router-link>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/services/api';

const route = useRoute();
const router = useRouter();

const token = ref(typeof route.query.token === 'string' ? route.query.token : '');
const newPassword = ref('');
const confirmPassword = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const handleSubmit = async (): Promise<void> => {
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    await api.post('/auth/password/reset', {
      token: token.value,
      newPassword: newPassword.value,
    });

    successMessage.value = 'Password reset complete. Redirecting to login...';
    window.setTimeout(() => {
      router.replace({ name: 'login' });
    }, 800);
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message
      || error?.response?.data?.error
      || error?.message
      || 'Failed to reset password';
  } finally {
    isSubmitting.value = false;
  }
};
</script>
