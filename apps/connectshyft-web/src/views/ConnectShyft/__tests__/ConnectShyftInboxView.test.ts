import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { nextTick } from 'vue';
import ConnectShyftInboxView from '../ConnectShyftInboxView.vue';
import * as flagsModule from '@/features/connectshyft/flags';
import * as neighborsModule from '@/features/connectshyft/neighbors';
import * as readContractsModule from '@/features/connectshyft/readContracts';
import * as threadsModule from '@/features/connectshyft/threads';

vi.mock('@/features/connectshyft/flags', () => ({
  DEFAULT_CONNECTSHYFT_AVAILABILITY: {
    flags: {
      connectshyft_enabled: true,
      connectshyft_inbox_enabled: true,
      connectshyft_escalation_enabled: true,
      connectshyft_webhooks_enabled: true,
    },
    entitlement: null,
    capabilities: {
      module: true,
      inbox: true,
      escalation: true,
      webhooks: true,
    },
    refusal: null,
  },
  fetchConnectShyftAvailability: vi.fn(),
}));

vi.mock('@/features/connectshyft/neighbors', () => ({
  fetchConnectShyftNeighborsCollection: vi.fn(),
}));

vi.mock('@/features/connectshyft/readContracts', () => ({
  fetchConnectShyftThreadBucket: vi.fn(),
}));

vi.mock('@/features/connectshyft/threads', () => ({
  ensureConnectShyftThread: vi.fn(),
  dispatchConnectShyftThreadCall: vi.fn(),
  dispatchConnectShyftThreadMessage: vi.fn(),
}));

const fetchAvailabilityMock = vi.mocked(flagsModule.fetchConnectShyftAvailability);
const fetchNeighborsMock = vi.mocked(neighborsModule.fetchConnectShyftNeighborsCollection);
const fetchBucketMock = vi.mocked(readContractsModule.fetchConnectShyftThreadBucket);
const ensureThreadMock = vi.mocked(threadsModule.ensureConnectShyftThread);

const buildRouter = async (initialPath = '/app/connectshyft') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/app/connectshyft',
        name: 'connectshyft-inbox',
        component: ConnectShyftInboxView,
      },
      {
        path: '/app/connectshyft/mine',
        name: 'connectshyft-mine',
        component: ConnectShyftInboxView,
      },
      {
        path: '/app/connectshyft/threads/:threadId',
        component: {
          template: '<div>Thread</div>',
        },
      },
      {
        path: '/app/connectshyft/neighbors/new',
        component: {
          template: '<div>New Neighbor</div>',
        },
      },
      {
        path: '/connect/neighbors/new',
        component: {
          template: '<div>New Neighbor Shortcut</div>',
        },
      },
    ],
  });

  await router.push(initialPath);
  await router.isReady();
  return router;
};

const renderInbox = async (initialPath?: string) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: 390,
  });

  const router = await buildRouter(initialPath);
  const wrapper = mount(ConnectShyftInboxView, {
    global: {
      plugins: [router],
      stubs: {
        ConnectShyftComposer: true,
        ConnectShyftMessageBubble: true,
        ConnectShyftNeighborSnapshot: true,
        ConnectShyftQueueCard: true,
        ConnectShyftThreadActionBar: true,
        ConnectShyftVoicemailCard: true,
      },
    },
  });

  await flushPromises();
  await nextTick();
  return { wrapper, router };
};

beforeEach(() => {
  fetchAvailabilityMock.mockResolvedValue({
    flags: {
      connectshyft_enabled: true,
      connectshyft_inbox_enabled: true,
      connectshyft_escalation_enabled: true,
      connectshyft_webhooks_enabled: true,
    },
    entitlement: null,
    capabilities: {
      module: true,
      inbox: true,
      escalation: true,
      webhooks: true,
    },
    refusal: null,
  });
  fetchNeighborsMock.mockResolvedValue({
    ok: true,
    code: 'CONNECTSHYFT_NEIGHBORS_LISTED',
    neighbors: [
      {
        neighborId: 'neighbor-inbox-1001',
        tenantId: 'tenant-connectshyft-ui',
        orgUnitId: 'org-connectshyft-ui-east',
        firstName: 'Jordan',
        lastName: 'Lee',
        prefersTexting: 'YES',
        phones: [
          {
            phoneId: 'phone-inbox-1001',
            label: 'Mobile',
            value: '(317) 555-0100',
            sortOrder: 0,
            isPrimary: true,
            isShared: false,
            verificationStatus: 'verified',
            status: null,
          },
        ],
      },
    ],
    scope: {
      tenantId: 'tenant-connectshyft-ui',
      orgUnitId: 'org-connectshyft-ui-east',
    },
  });
  fetchBucketMock.mockResolvedValue({
    ok: true,
    code: 'CONNECTSHYFT_BUCKET_LOADED',
    message: 'Threads loaded',
    items: [
      {
        threadId: 'thread-inbox-1001',
        neighborId: 'neighbor-inbox-1001',
        orgUnitId: 'org-connectshyft-ui-east',
        state: 'CLAIMED',
        stateLabel: 'Claimed',
        claimedByUserId: 'user-connectshyft-operator',
        bucket: 'mine',
        escalationStage: 1,
        priorityRank: 2,
        urgencyLabel: 'Needs attention',
        lastActivityAtUtc: '2026-03-24T14:00:00.000Z',
        lastInboundCsNumberId: 'cs-inbound-1001',
        lastInboundContext: 'Main line',
        preferredOutboundCsNumberId: 'cs-outbound-1001',
        preferredOutboundContextLabel: 'Main line',
        neighborContextLabel: 'Jordan Lee',
        conferenceContextLabel: 'East conference',
        claimContextLabel: 'Claimed by you',
        preferredOutboundContext: {
          csNumberId: 'cs-outbound-1001',
          label: 'Main line',
        },
        voicemailIndicator: false,
        voicemailLabel: null,
        summary: 'Jordan Lee',
        preview: 'Needs a follow-up call.',
      },
    ],
    actions: {
      claim: true,
      takeover: true,
    },
    context: {
      tenantId: 'tenant-connectshyft-ui',
      orgUnitId: 'org-connectshyft-ui-east',
      bypassedOrgUnitMembership: false,
    },
  });
  ensureThreadMock.mockResolvedValue({
    ok: true,
    code: 'CONNECTSHYFT_THREAD_READY',
    thread: {
      threadId: 'thread-inbox-2001',
    },
    createdNewThread: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

describe('ConnectShyftInboxView', () => {
  it('renders Assigned with shared search-first triage copy and actions', async () => {
    const { wrapper } = await renderInbox('/app/connectshyft/mine?actorUserId=user-connectshyft-operator');

    expect(wrapper.text()).toContain('Assigned conversations');
    expect(wrapper.text()).toContain('1 conversation needs attention');
    expect(wrapper.get('[data-testid="connectshyft-queue-search-input"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="connectshyft-open-conversation-action"]').text()).toContain(
      'Open Conversation',
    );
    expect(wrapper.get('[data-testid="connectshyft-compose-message-action"]').text()).toContain(
      'Send Message',
    );
  });

  it('shows a plain-language empty state when nothing is waiting in the queue', async () => {
    fetchNeighborsMock.mockResolvedValueOnce({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBORS_LISTED',
      neighbors: [],
      scope: {
        tenantId: 'tenant-connectshyft-ui',
        orgUnitId: 'org-connectshyft-ui-east',
      },
    });
    fetchBucketMock.mockResolvedValueOnce({
      ok: true,
      code: 'CONNECTSHYFT_BUCKET_LOADED',
      message: 'Threads loaded',
      items: [],
      actions: {
        claim: true,
        takeover: true,
      },
      context: {
        tenantId: 'tenant-connectshyft-ui',
        orgUnitId: 'org-connectshyft-ui-east',
        bypassedOrgUnitMembership: false,
      },
    });

    const { wrapper } = await renderInbox('/app/connectshyft');

    expect(wrapper.text()).toContain('Nothing is waiting right now');
    expect(wrapper.text()).toContain(
      'When a new conversation needs attention, it will appear here.',
    );
  });
});
