<template>
  <div class="min-h-screen bg-slate-100 px-4 py-12">
    <div class="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <div class="mb-8 text-center">
        <h1 class="text-3xl font-semibold text-slate-900">ConnectShyft</h1>
        <p class="mt-2 text-sm text-slate-600">Sign in to access inbox, threads, and settings.</p>
      </div>

      <form class="space-y-5" @submit.prevent="handleLogin">
        <div
          v-if="errorMessage"
          class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          role="alert"
        >
          {{ errorMessage }}
        </div>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700">Email</span>
          <input
            v-model="email"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            type="email"
            autocomplete="email"
            required
          />
        </label>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700">Password</span>
          <input
            v-model="password"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            type="password"
            autocomplete="current-password"
            required
          />
        </label>

        <label class="flex items-center gap-2 text-sm text-slate-700">
          <input
            v-model="rememberMe"
            class="h-4 w-4 rounded border-slate-300"
            type="checkbox"
          />
          Keep me signed in
        </label>

        <button
          class="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isSubmitting"
          type="submit"
        >
          <span v-if="isSubmitting">Signing in...</span>
          <span v-else>Sign in</span>
        </button>

        <router-link
          to="/auth/password/forgot"
          class="block text-center text-sm text-slate-600 hover:text-slate-900"
        >
          Forgot password?
        </router-link>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/services/api';
import { SHELL_ROUTE_PATHS } from '@/shell/routes';

const route = useRoute();
const router = useRouter();

const email = ref('');
const password = ref('');
const rememberMe = ref(true);
const isSubmitting = ref(false);
const errorMessage = ref('');

const resolveLoginErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== 'object') {
    return 'Sign in failed';
  }

  const maybeAxiosError = error as {
    response?: {
      data?: {
        message?: string;
        error?: string;
      };
    };
    message?: string;
  };

  return maybeAxiosError.response?.data?.message
    || maybeAxiosError.response?.data?.error
    || maybeAxiosError.message
    || 'Sign in failed';
};

const resolveRedirectPath = (): string => {
  if (typeof route.query.redirect !== 'string') {
    return SHELL_ROUTE_PATHS.people;
  }

  const trimmed = route.query.redirect.trim();
  if (!trimmed.startsWith('/')) {
    return SHELL_ROUTE_PATHS.people;
  }

  return trimmed;
};

const handleLogin = async (): Promise<void> => {
  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    await api.post('/auth/login', {
      email: email.value,
      password: password.value,
      rememberMe: rememberMe.value,
    });

    await router.replace(resolveRedirectPath());
  } catch (error) {
    errorMessage.value = resolveLoginErrorMessage(error);
  } finally {
    isSubmitting.value = false;
  }
};
</script>
