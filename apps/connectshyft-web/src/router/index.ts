import { createRouter, createWebHistory } from 'vue-router';
import api from '@/services/api';
import { beginShellNavigation, endShellNavigation } from '@/shell/navigationState';
import { SHELL_ROUTE_PATHS } from '@/shell/routes';
import { resolveConnectShyftAdminAccessFromQuery } from '@/features/connectshyft/settingsAccess';
import ConnectShyftLoginView from '../views/Auth/ConnectShyftLoginView.vue';
import ForgotPasswordView from '../views/Auth/ForgotPasswordView.vue';
import ResetPasswordView from '../views/Auth/ResetPasswordView.vue';
import ConnectShyftInboxView from '../views/ConnectShyft/ConnectShyftInboxView.vue';
import ConnectShyftSettingsView from '../views/ConnectShyft/ConnectShyftSettingsView.vue';
import ConnectShyftThreadDetailView from '../views/ConnectShyft/ConnectShyftThreadDetailView.vue';
import ConnectShyftNeighborProfileView from '../views/ConnectShyft/ConnectShyftNeighborProfileView.vue';
import ConnectShyftNeighborCreateView from '../views/ConnectShyft/ConnectShyftNeighborCreateView.vue';
import ConnectShyftDirectoryView from '../views/ConnectShyft/ConnectShyftDirectoryView.vue';
import ConnectShyftAvailabilityView from '../views/ConnectShyft/ConnectShyftAvailabilityView.vue';
import ConnectShyftNumberMappingsView from '../views/ConnectShyft/ConnectShyftNumberMappingsView.vue';
import ConnectShyftEscalationSettingsView from '../views/ConnectShyft/ConnectShyftEscalationSettingsView.vue';
import AppShellView from '../views/Shell/AppShellView.vue';
import ConnectView from '../views/Shell/ConnectView.vue';
import PeopleView from '../views/Shell/PeopleView.vue';
import ShellRouteFallbackView from '../views/Shell/ShellRouteFallbackView.vue';
import WorkView from '../views/Shell/WorkView.vue';

const extractCurrentUser = (payload: unknown): Record<string, unknown> | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  if (record.data && typeof record.data === 'object') {
    const envelopeData = record.data as Record<string, unknown>;
    if (envelopeData.user && typeof envelopeData.user === 'object') {
      return envelopeData.user as Record<string, unknown>;
    }
  }

  if (record.user && typeof record.user === 'object') {
    return record.user as Record<string, unknown>;
  }

  return null;
};

let cachedSessionState: boolean | null = null;

const hasValidSession = async (): Promise<boolean> => {
  if (cachedSessionState !== null) {
    return cachedSessionState;
  }

  try {
    const response = await api.get('/auth/me');
    cachedSessionState = extractCurrentUser(response.data) !== null;
    return cachedSessionState;
  } catch (_error) {
    cachedSessionState = false;
    return false;
  }
};

const refreshSessionState = async (): Promise<boolean> => {
  cachedSessionState = null;
  return hasValidSession();
};

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: SHELL_ROUTE_PATHS.login,
      name: 'connectshyft-login',
      component: ConnectShyftLoginView,
    },
    {
      path: SHELL_ROUTE_PATHS.forgotPassword,
      name: 'connectshyft-forgot-password',
      component: ForgotPasswordView,
    },
    {
      path: SHELL_ROUTE_PATHS.resetPassword,
      name: 'connectshyft-reset-password',
      component: ResetPasswordView,
    },
    {
      path: '/',
      component: AppShellView,
      meta: {
        requiresAuth: true,
      },
      children: [
        {
          path: '',
          redirect: SHELL_ROUTE_PATHS.people,
        },
        {
          path: 'people',
          alias: ['/app/people'],
          name: 'shell-people',
          component: PeopleView,
          meta: {
            shellModule: 'people',
            shellTitle: 'People',
          },
        },
        {
          path: 'connect',
          alias: ['/app/connect'],
          component: ConnectView,
          meta: {
            shellModule: 'connect',
            shellTitle: 'ConnectShyft',
          },
          children: [
            {
              path: '',
              alias: ['/app/connectshyft/inbox'],
              name: 'connectshyft-inbox',
              component: ConnectShyftInboxView,
              meta: {
                shellTitle: 'ConnectShyft',
              },
            },
            {
              path: 'mine',
              alias: ['/app/connectshyft/mine'],
              name: 'connectshyft-mine',
              component: ConnectShyftInboxView,
              meta: {
                shellTitle: 'ConnectShyft',
              },
            },
            {
              path: 'threads/:threadId',
              alias: ['/app/connectshyft/threads/:threadId'],
              name: 'connectshyft-thread',
              component: ConnectShyftThreadDetailView,
              meta: {
                shellTitle: 'ConnectShyft',
              },
            },
            {
              path: 'directory',
              alias: ['/app/connectshyft/directory'],
              name: 'connectshyft-directory',
              component: ConnectShyftDirectoryView,
              meta: {
                shellTitle: 'ConnectShyft',
              },
            },
            {
              path: 'neighbors/new',
              alias: ['/app/connectshyft/neighbors/new'],
              name: 'connectshyft-neighbor-new',
              component: ConnectShyftNeighborCreateView,
              meta: {
                shellTitle: 'ConnectShyft',
              },
            },
            {
              path: 'neighbors/:neighborId',
              alias: ['/app/connectshyft/neighbors/:neighborId'],
              name: 'connectshyft-neighbor',
              component: ConnectShyftNeighborProfileView,
              meta: {
                shellTitle: 'ConnectShyft',
              },
            },
          ],
        },
        {
          path: 'settings',
          alias: ['/app/work', '/app/connectshyft/more'],
          component: WorkView,
          meta: {
            shellModule: 'settings',
            shellTitle: 'Settings',
          },
          children: [
            {
              path: '',
              alias: ['/app/connectshyft/settings'],
              name: 'connectshyft-settings',
              component: ConnectShyftSettingsView,
              meta: {
                shellTitle: 'Settings',
              },
            },
            {
              path: 'availability',
              alias: ['/app/connectshyft/settings/availability'],
              name: 'connectshyft-availability',
              component: ConnectShyftAvailabilityView,
              meta: {
                shellTitle: 'Settings',
                requiresConnectShyftAdminSettings: true,
              },
            },
            {
              path: 'numbers',
              alias: ['/app/connectshyft/settings/numbers'],
              name: 'connectshyft-number-mappings',
              component: ConnectShyftNumberMappingsView,
              meta: {
                shellTitle: 'Settings',
                requiresConnectShyftAdminSettings: true,
              },
            },
            {
              path: 'escalation',
              alias: ['/app/connectshyft/settings/escalation'],
              name: 'connectshyft-escalation',
              component: ConnectShyftEscalationSettingsView,
              meta: {
                shellTitle: 'Settings',
                requiresConnectShyftAdminSettings: true,
              },
            },
          ],
        },
        {
          path: ':pathMatch(.*)*',
          name: 'shell-route-fallback',
          component: ShellRouteFallbackView,
          meta: {
            shellTitle: 'Workspace unavailable',
          },
        },
      ],
    },
  ],
});

router.beforeEach(async (to) => {
  beginShellNavigation();

  if (
    to.path === SHELL_ROUTE_PATHS.login
    || to.path === SHELL_ROUTE_PATHS.forgotPassword
    || to.path === SHELL_ROUTE_PATHS.resetPassword
  ) {
    const authenticated = await refreshSessionState();
    return authenticated ? SHELL_ROUTE_PATHS.people : true;
  }

  if (!to.matched.some((record) => record.meta.requiresAuth === true)) {
    return true;
  }

  const authenticated = await refreshSessionState();
  if (authenticated) {
    if (to.matched.some((record) => record.meta.requiresConnectShyftAdminSettings === true)) {
      const canAccessAdminSettings = resolveConnectShyftAdminAccessFromQuery(to.query);
      if (canAccessAdminSettings === false) {
        return {
          path: SHELL_ROUTE_PATHS.settings,
          query: {
            ...to.query,
            refusedPath: to.path,
          },
        };
      }
    }

    return true;
  }

  return {
    path: SHELL_ROUTE_PATHS.login,
    query: {
      redirect: to.fullPath,
    },
  };
});

router.afterEach(() => {
  endShellNavigation();
});

router.onError(() => {
  endShellNavigation();
});

export default router;
