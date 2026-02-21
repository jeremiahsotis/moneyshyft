import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';
import type { User, SignupData, LoginData } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const unwrapPayload = <T extends Record<string, unknown>>(payload: unknown): T => {
    if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>;
      if (record.data && typeof record.data === 'object') {
        return record.data as T;
      }

      return record as T;
    }

    return {} as T;
  };

  const extractErrorMessage = (err: any, fallback: string): string =>
    err?.response?.data?.message
    || err?.response?.data?.error
    || err?.message
    || fallback;

  // State
  const user = ref<User | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const isAuthenticated = computed(() => user.value !== null);
  const fullName = computed(() => {
    if (!user.value) return '';
    return `${user.value.firstName} ${user.value.lastName}`;
  });

  // Actions
  async function signup(data: SignupData): Promise<string | null> {
    isLoading.value = true;
    error.value = null;
    try {
      console.log('Attempting signup with:', { ...data, password: '[REDACTED]' });
      const response = await api.post('/auth/signup', data);
      console.log('Signup successful:', response.data);
      const payload = unwrapPayload<{ user?: User; invitationCode?: string }>(response.data);
      user.value = payload.user ?? null;
      // Return invitation code if present (new household created)
      return payload.invitationCode ?? null;
    } catch (err: any) {
      console.error('Signup error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        url: err.config?.url
      });
      error.value = extractErrorMessage(err, 'Signup failed');
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function login(data: LoginData): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post('/auth/login', data);
      const payload = unwrapPayload<{ user?: User }>(response.data);
      user.value = payload.user ?? null;
    } catch (err: any) {
      error.value = extractErrorMessage(err, 'Login failed');
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function logout(): Promise<void> {
    isLoading.value = true;
    try {
      await api.post('/auth/logout');
      user.value = null;
    } catch (err: any) {
      console.error('Logout error:', err);
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchCurrentUser(): Promise<void> {
    isLoading.value = true;
    try {
      const response = await api.get('/auth/me');
      const payload = unwrapPayload<{ user?: User }>(response.data);
      user.value = payload.user ?? null;
    } catch (err: any) {
      // Not authenticated, that's okay
      user.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  function clearError(): void {
    error.value = null;
  }

  return {
    // State
    user,
    isLoading,
    error,
    // Getters
    isAuthenticated,
    fullName,
    // Actions
    signup,
    login,
    logout,
    fetchCurrentUser,
    clearError,
  };
});
