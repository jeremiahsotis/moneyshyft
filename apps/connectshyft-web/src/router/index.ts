import { createRouter, createWebHistory } from 'vue-router';

import ConnectShyftInboxView from '../views/ConnectShyft/ConnectShyftInboxView.vue';
import ConnectShyftMoreView from '../views/ConnectShyft/ConnectShyftMoreView.vue';
import ConnectShyftThreadDetailView from '../views/ConnectShyft/ConnectShyftThreadDetailView.vue';
import ConnectShyftNeighborProfileView from '../views/ConnectShyft/ConnectShyftNeighborProfileView.vue';
import ConnectShyftNeighborCreateView from '../views/ConnectShyft/ConnectShyftNeighborCreateView.vue';
import ConnectShyftAvailabilityView from '../views/ConnectShyft/ConnectShyftAvailabilityView.vue';
import ConnectShyftNumberMappingsView from '../views/ConnectShyft/ConnectShyftNumberMappingsView.vue';
import ConnectShyftEscalationSettingsView from '../views/ConnectShyft/ConnectShyftEscalationSettingsView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
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

export default router;
