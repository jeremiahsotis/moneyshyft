import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';
import type { User, SignupData, LoginData } from '@/types';

export const useAuthStore = defineStore('auth', () => {
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
      user.value = response.data.user;
      // Return invitation code if present (new household created)
      return response.data.invitationCode || null;
    } catch (err: any) {
      console.error('Signup error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        url: err.config?.url
      });
      error.value = err.response?.data?.error || err.message || 'Signup failed';
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
      user.value = response.data.user;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Login failed';
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
      user.value = response.data.user;
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
