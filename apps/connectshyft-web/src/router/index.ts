import { createRouter, createWebHistory } from 'vue-router';
import api from '@/services/api';

import ConnectShyftLoginView from '../views/Auth/ConnectShyftLoginView.vue';
import ForgotPasswordView from '../views/Auth/ForgotPasswordView.vue';
import ResetPasswordView from '../views/Auth/ResetPasswordView.vue';
import ConnectShyftInboxView from '../views/ConnectShyft/ConnectShyftInboxView.vue';
import ConnectShyftMoreView from '../views/ConnectShyft/ConnectShyftMoreView.vue';
import ConnectShyftThreadDetailView from '../views/ConnectShyft/ConnectShyftThreadDetailView.vue';
import ConnectShyftNeighborProfileView from '../views/ConnectShyft/ConnectShyftNeighborProfileView.vue';
import ConnectShyftNeighborCreateView from '../views/ConnectShyft/ConnectShyftNeighborCreateView.vue';
import ConnectShyftAvailabilityView from '../views/ConnectShyft/ConnectShyftAvailabilityView.vue';
import ConnectShyftNumberMappingsView from '../views/ConnectShyft/ConnectShyftNumberMappingsView.vue';
import ConnectShyftEscalationSettingsView from '../views/ConnectShyft/ConnectShyftEscalationSettingsView.vue';

const CONNECTSHYFT_APP_PREFIX = '/app/connectshyft';

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
      path: '/login',
      name: 'connectshyft-login',
      component: ConnectShyftLoginView,
    },
    {
      path: '/auth/password/forgot',
      name: 'connectshyft-forgot-password',
      component: ForgotPasswordView,
    },
    {
      path: '/auth/password/reset',
      name: 'connectshyft-reset-password',
      component: ResetPasswordView,
    },
    {
      path: '/',
      redirect: '/app/connectshyft/inbox',
    },
    {
      path: '/app/connectshyft/inbox',
      name: 'connectshyft-inbox',
      component: ConnectShyftInboxView,
    },
    {
      path: '/app/connectshyft/mine',
      name: 'connectshyft-mine',
      component: ConnectShyftInboxView,
    },
    {
      path: '/app/connectshyft/more',
      name: 'connectshyft-more',
      component: ConnectShyftMoreView,
    },
    {
      path: '/app/connectshyft/threads/:threadId',
      name: 'connectshyft-thread',
      component: ConnectShyftThreadDetailView,
    },
    {
      path: '/app/connectshyft/neighbors/new',
      name: 'connectshyft-neighbor-new',
      component: ConnectShyftNeighborCreateView,
    },
    {
      path: '/app/connectshyft/neighbors/:neighborId',
      name: 'connectshyft-neighbor',
      component: ConnectShyftNeighborProfileView,
    },
    {
      path: '/app/connectshyft/settings/availability',
      name: 'connectshyft-availability',
      component: ConnectShyftAvailabilityView,
    },
    {
      path: '/app/connectshyft/settings/numbers',
      name: 'connectshyft-number-mappings',
      component: ConnectShyftNumberMappingsView,
    },
    {
      path: '/app/connectshyft/settings/escalation',
      name: 'connectshyft-escalation',
      component: ConnectShyftEscalationSettingsView,
    },
  ],
});

router.beforeEach(async (to) => {
  if (to.path === '/login' || to.path === '/auth/password/forgot' || to.path === '/auth/password/reset') {
    const authenticated = await refreshSessionState();
    return authenticated ? '/app/connectshyft/inbox' : true;
  }

  if (!to.path.startsWith(CONNECTSHYFT_APP_PREFIX)) {
    return true;
  }

  const authenticated = await refreshSessionState();
  if (authenticated) {
    return true;
  }

  return {
    path: '/login',
    query: {
      redirect: to.fullPath,
    },
  };
});

export default router;
