import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAccessStore } from '@/stores/access';
import { redirectToAdminApp } from '@/utils/adminAppUrl';
import pinia from '@/pinia';
import type { RouteRecordRaw } from 'vue-router';

type GovernedModule = 'moneyshyft';

const resolveGovernedModule = (value: unknown): GovernedModule | null => {
  if (value === 'moneyshyft') {
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
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true, moduleGate: 'moneyshyft' }
  },
  {
    path: '/app/route/requests',
    name: 'moneyshyft-request-lifecycle',
    component: () => import('@/views/MoneyShyft/RouteRequestLifecycleView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/accounts',
    name: 'accounts',
    component: () => import('@/views/Accounts/AccountsListView.vue'),
    meta: { requiresAuth: true, moduleGate: 'moneyshyft' }
  },
  {
    path: '/transactions',
    name: 'transactions',
    component: () => import('@/views/Transactions/TransactionsListView.vue'),
    meta: { requiresAuth: true, moduleGate: 'moneyshyft' }
  },
  {
    path: '/recurring-transactions',
    name: 'recurring-transactions',
    component: () => import('@/views/Transactions/RecurringTransactionsView.vue'),
    meta: { requiresAuth: true, moduleGate: 'moneyshyft' }
  },
  {
    path: '/budget',
    name: 'budget',
    component: () => import('@/views/Budget/BudgetView.vue'),
    meta: { requiresAuth: true, moduleGate: 'moneyshyft' }
  },
  {
    path: '/budget/setup',
    name: 'budget-setup',
    component: () => import('@/views/Budget/BudgetSetupWizard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/goals',
    name: 'goals',
    component: () => import('@/views/Goals/GoalsListView.vue'),
    meta: { requiresAuth: true, moduleGate: 'moneyshyft' }
  },
  {
    path: '/debts',
    name: 'debts',
    component: () => import('@/views/Debts/DebtsView.vue'),
    meta: { requiresAuth: true, moduleGate: 'moneyshyft' }
  },
  {
    path: '/extra-money',
    name: 'extra-money',
    component: () => import('@/views/ExtraMoneyView.vue'),
    meta: { requiresAuth: true, moduleGate: 'moneyshyft' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/Settings/HouseholdSettingsView.vue'),
    meta: { requiresAuth: true, moduleGate: 'moneyshyft' }
  },
  {
    path: '/scenarios',
    name: 'scenarios',
    component: () => import('@/views/Scenarios/ScenariosListView.vue'),
    meta: { requiresAuth: true, moduleGate: 'moneyshyft' }
  },
  {
    path: '/scenarios/:id',
    name: 'scenario-detail',
    component: () => import('@/views/Scenarios/ScenarioDetailView.vue'),
    meta: { requiresAuth: true, moduleGate: 'moneyshyft' }
  },
  {
    path: '/scenarios/:id/projection',
    name: 'scenario-projection',
    component: () => import('@/views/Scenarios/ScenarioComparisonView.vue'),
    meta: { requiresAuth: true, moduleGate: 'moneyshyft' }
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL || '/'),
  routes
});

const hasAuthCookie = (): boolean => {
  if (typeof document === 'undefined') {
    return false;
  }

  return /(?:^|;\s*)access_token=/.test(document.cookie || '');
};

// Navigation guards
router.beforeEach(async (to, _from, next) => {
  if (to.path.startsWith('/admin')) {
    redirectToAdminApp(to.fullPath || to.path);
    next(false);
    return;
  }

  const authStore = useAuthStore(pinia);
  const accessStore = useAccessStore(pinia);

  // Try to load user if not already loaded
  const shouldBootstrapSession =
    !authStore.user
    && !authStore.isLoading
    && (to.meta.requiresAuth === true || hasAuthCookie());

  if (shouldBootstrapSession) {
    try {
      await authStore.fetchCurrentUser();
    } catch (_error) {
      // Failed to load user - that's ok, they're probably not authenticated
      // Let the requiresAuth check handle it below
    }
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    accessStore.clear();
    // Redirect to login if route requires auth and user is not authenticated
    next({ name: 'login', query: { redirect: to.fullPath } });
    return;
  }

  const moduleGate = resolveGovernedModule(to.meta.moduleGate);

  if (authStore.isAuthenticated && (to.meta.requiresAuth || moduleGate)) {
    await accessStore.refresh({ tenantId: authStore.user?.householdId || undefined });
  }

  if (authStore.isAuthenticated && authStore.user?.mustResetPassword === true && to.name !== 'first-login-reset') {
    next({ name: 'first-login-reset' });
    return;
  }

  if (authStore.isAuthenticated && authStore.user?.mustResetPassword !== true && to.name === 'first-login-reset') {
    next(accessStore.defaultAuthorizedPath);
    return;
  }

  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next(accessStore.defaultAuthorizedPath);
    return;
  }

  if (authStore.isAuthenticated && moduleGate && !accessStore.isModuleEnabled(moduleGate)) {
    const fallbackPath = accessStore.defaultAuthorizedPath;
    if (to.fullPath !== fallbackPath) {
      next(fallbackPath);
      return;
    }

    next('/budget/setup');
    return;
  }

  if (
    authStore.isAuthenticated &&
    authStore.user?.householdId &&
    authStore.user?.setupWizardCompleted === false &&
    to.name !== 'budget-setup' &&
    to.meta.allowIncompleteSetup !== true
  ) {
    next({ name: 'budget-setup' });
    return;
  }

  next();
});

export default router;
