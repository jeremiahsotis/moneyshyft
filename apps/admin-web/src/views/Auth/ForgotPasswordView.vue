<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
    <div class="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow-xl">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-slate-900">Reset Password</h1>
        <p class="mt-2 text-sm text-slate-600">Enter your email to request a reset link.</p>
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {{ errorMessage }}
        </div>
        <div v-if="successMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {{ successMessage }}
        </div>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700">Email</span>
          <input
            v-model="email"
            type="email"
            required
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span v-if="isSubmitting">Requesting...</span>
          <span v-else>Send reset link</span>
        </button>

        <router-link to="/login" class="block text-center text-sm text-slate-600 hover:text-slate-900">
          Back to login
        </router-link>
      </form>

      <div v-if="debugResetLink" class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 break-all">
        <div class="font-semibold">Development reset link</div>
        <a :href="debugResetLink" class="underline">{{ debugResetLink }}</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import api from '@/services/api';

type ForgotPasswordResponse = {
  data?: {
    debug?: {
      resetLink?: string;
    };
  };
};

const email = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const debugResetLink = ref('');

const resolveResetBaseUrl = (): string => `${window.location.origin}/auth/password/reset`;

const handleSubmit = async (): Promise<void> => {
  isSubmitting.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  debugResetLink.value = '';

  try {
    const response = await api.post<ForgotPasswordResponse>('/auth/password/forgot', {
      email: email.value,
      resetBaseUrl: resolveResetBaseUrl(),
    });

    successMessage.value = 'If an account exists, reset instructions are now available.';
    debugResetLink.value = response.data?.data?.debug?.resetLink || '';
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message
      || error?.response?.data?.error
      || error?.message
      || 'Failed to request password reset';
  } finally {
    isSubmitting.value = false;
  }
};
</script>
