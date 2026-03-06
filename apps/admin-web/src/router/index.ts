import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAccessStore } from '@/stores/access';
import pinia from '@/pinia';

type AdminScope = 'any' | 'tenant' | 'system';

const resolveAdminScope = (value: unknown): AdminScope | null => {
  if (value === 'any' || value === 'tenant' || value === 'system') {
    return value;
  }

  return null;
};

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Auth/LoginView.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/auth/password/forgot',
    name: 'forgot-password',
    component: () => import('@/views/Auth/ForgotPasswordView.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/auth/password/reset',
    name: 'reset-password',
    component: () => import('@/views/Auth/ResetPasswordView.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/auth/password/first-login-reset',
    name: 'first-login-reset',
    component: () => import('@/views/Auth/FirstLoginResetView.vue'),
    meta: { requiresAuth: true, allowIncompleteSetup: true }
  },
  {
    path: '/',
    redirect: '/admin',
  },
  {
    path: '/admin',
    name: 'admin-home',
    component: () => import('@/views/Admin/AdminLandingView.vue'),
    meta: {
      requiresAuth: true,
      adminScope: 'any',
      allowIncompleteSetup: true,
    }
  },
  {
    path: '/admin/system',
    name: 'admin-system',
    component: () => import('@/views/Admin/SystemAdminView.vue'),
    meta: {
      requiresAuth: true,
      adminScope: 'system',
      allowIncompleteSetup: true,
    }
  },
  {
    path: '/admin/tenant',
    name: 'admin-tenant',
    component: () => import('@/views/Admin/TenantAdminView.vue'),
    meta: {
      requiresAuth: true,
      adminScope: 'tenant',
      allowIncompleteSetup: true,
    }
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore(pinia);
  const accessStore = useAccessStore(pinia);

  if (!authStore.user && !authStore.isLoading) {
    await authStore.fetchCurrentUser();
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } });
    return;
  }

  if (authStore.isAuthenticated && (to.meta.requiresAuth || to.meta.adminScope)) {
    await accessStore.refresh();
  }

  if (authStore.isAuthenticated && authStore.user?.mustResetPassword === true && to.name !== 'first-login-reset') {
    next({ name: 'first-login-reset' });
    return;
  }

  if (authStore.isAuthenticated && authStore.user?.mustResetPassword !== true && to.name === 'first-login-reset') {
    next({ name: 'admin-home' });
    return;
  }

  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next({ name: 'admin-home' });
    return;
  }

  const adminScope = resolveAdminScope(to.meta.adminScope);
  if (authStore.isAuthenticated && adminScope) {
    if (adminScope === 'system' && !accessStore.canAccessSystemAdmin) {
      if (accessStore.canAccessTenantAdmin) {
        next({ name: 'admin-tenant' });
      } else {
        next({ name: 'admin-home' });
      }
      return;
    }

    if (adminScope === 'tenant' && !accessStore.canAccessTenantAdmin) {
      next({ name: 'admin-home' });
      return;
    }

    if (adminScope === 'any') {
      if (accessStore.canAccessSystemAdmin) {
        next({ name: 'admin-system' });
      } else if (accessStore.canAccessTenantAdmin) {
        next({ name: 'admin-tenant' });
      } else {
        next({ name: 'admin-home' });
      }
      return;
    }
  }

  next();
});

export default router;
