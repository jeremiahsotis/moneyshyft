import { createAuthStore } from '../../../../libs/ui-shell/dist/createAuthStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import api from '@/services/api';
import type { User, SignupData, LoginData } from '@/types';

export const useAuthStore = createAuthStore<User, SignupData, LoginData>({
  deps: {
    defineStore,
    computed,
    ref,
  },
  storeId: 'auth',
  api,
  logger: console,
});
