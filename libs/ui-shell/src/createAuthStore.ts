type ApiClient = {
  post<T = unknown>(url: string, body?: unknown): Promise<{ data: T }>;
  get<T = unknown>(url: string): Promise<{ data: T }>;
};

type AuthStoreDeps = {
  defineStore: any;
  ref: any;
  computed: any;
};

type LoggerLike = Pick<Console, 'error' | 'log'>;

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

type NameLike = {
  firstName?: string;
  lastName?: string;
};

export const createAuthStore = <
  TUser extends NameLike,
  TSignupData,
  TLoginData
>({
  deps,
  storeId,
  api,
  logger = console,
}: {
  deps: AuthStoreDeps;
  storeId: string;
  api: ApiClient;
  logger?: LoggerLike;
}) => deps.defineStore(storeId, () => {
  const user = deps.ref(null as TUser | null);
  const isLoading = deps.ref(false);
  const error = deps.ref(null as string | null);

  const isAuthenticated = deps.computed(() => user.value !== null);
  const fullName = deps.computed(() => {
    if (!user.value) {
      return '';
    }

    const firstName = typeof user.value.firstName === 'string' ? user.value.firstName : '';
    const lastName = typeof user.value.lastName === 'string' ? user.value.lastName : '';
    return `${firstName} ${lastName}`.trim();
  });

  async function signup(data: TSignupData): Promise<string | null> {
    isLoading.value = true;
    error.value = null;
    try {
      logger.log('Attempting signup with:', { ...((data as Record<string, unknown>) ?? {}), password: '[REDACTED]' });
      const response = await api.post('/auth/signup', data);
      logger.log('Signup successful:', response.data);
      const payload = unwrapPayload<{ user?: TUser; invitationCode?: string }>(response.data);
      user.value = payload.user ?? null;
      return payload.invitationCode ?? null;
    } catch (err: any) {
      logger.error('Signup error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        url: err.config?.url,
      });
      error.value = extractErrorMessage(err, 'Signup failed');
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function login(data: TLoginData): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post('/auth/login', data);
      const payload = unwrapPayload<{ user?: TUser }>(response.data);
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
      logger.error('Logout error:', err);
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchCurrentUser(): Promise<void> {
    isLoading.value = true;
    try {
      const response = await api.get('/auth/me');
      const payload = unwrapPayload<{ user?: TUser }>(response.data);
      user.value = payload.user ?? null;
    } catch (_err: any) {
      user.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  async function resetFirstLoginPassword(currentPassword: string, newPassword: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await api.post('/auth/password/first-login-reset', {
        currentPassword,
        newPassword,
      });
      const payload = unwrapPayload<{ user?: TUser }>(response.data);
      user.value = payload.user ?? user.value;
    } catch (err: any) {
      error.value = extractErrorMessage(err, 'Password reset failed');
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function clearError(): void {
    error.value = null;
  }

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    fullName,
    signup,
    login,
    logout,
    fetchCurrentUser,
    resetFirstLoginPassword,
    clearError,
  };
});
