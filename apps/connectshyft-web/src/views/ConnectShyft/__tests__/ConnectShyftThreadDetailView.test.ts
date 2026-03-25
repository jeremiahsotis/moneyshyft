import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { nextTick, ref } from 'vue';
import ConnectShyftThreadDetailView from '../ConnectShyftThreadDetailView.vue';
import { SUBJECT_CONTEXT_KEY } from '../../../shell/subjectContext';
import * as flagsModule from '@/features/connectshyft/flags';
import * as neighborsModule from '@/features/connectshyft/neighbors';
import * as readContractsModule from '@/features/connectshyft/readContracts';

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
  buildConnectShyftTestOverrideHeaders: vi.fn(() => ({})),
  resolveConnectShyftDeterministicTestPhone: vi.fn(() => '+13175550100'),
}));

vi.mock('@/features/connectshyft/neighbors', () => ({
  fetchConnectShyftNeighborsCollection: vi.fn(),
  createConnectShyftNeighbor: vi.fn(),
}));

vi.mock('@/features/connectshyft/readContracts', () => ({
  fetchConnectShyftThreadDetail: vi.fn(),
}));

const fetchAvailabilityMock = vi.mocked(flagsModule.fetchConnectShyftAvailability);
const fetchNeighborsMock = vi.mocked(neighborsModule.fetchConnectShyftNeighborsCollection);
const fetchThreadDetailMock = vi.mocked(readContractsModule.fetchConnectShyftThreadDetail);

const buildThreadDetail = (overrides: Record<string, unknown> = {}) => ({
  threadId: 'thread-detail-view-1001',
  neighborId: 'neighbor-detail-view-1001',
  orgUnitId: 'org-connectshyft-ui-east',
  state: 'CLAIMED',
  stateLabel: 'Claimed',
  claimedByUserId: 'user-connectshyft-ui-operator',
  bucket: 'mine',
  escalationStage: 1,
  priorityRank: 2,
  urgencyLabel: 'Needs attention soon',
  lastActivityAtUtc: '2026-03-23T10:15:00.000Z',
  lastInboundCsNumberId: '+12605550191',
  lastInboundContext: 'Mapped inbound number configured',
  preferredOutboundCsNumberId: '+12605550191',
  preferredOutboundContextLabel: 'Primary Queue',
  neighborContextLabel: 'Neighbor context: Jordan Lee',
  conferenceContextLabel: 'Conference context: Primary Queue',
  claimContextLabel: 'Claimed by you',
  preferredOutboundContext: {
    csNumberId: '+12605550191',
    label: 'Primary Queue',
  },
  voicemailIndicator: false,
  voicemailLabel: null,
  summary: 'Jordan Lee',
  preview: 'Latest update: Jordan Lee',
  personId: 'person-detail-view-1001',
  identityState: 'confirmed',
  subjectImpact: null,
  subjectContext: {
    orgUnitId: 'org-connectshyft-ui-east',
    personId: 'person-detail-view-1001',
    threadId: 'thread-detail-view-1001',
    identityState: 'confirmed',
  },
  actions: ['Call', 'Text', 'Close'],
  timeline: [],
  lifecycle: {
    reopenedByInbound: false,
  },
  ...overrides,
});

const buildRouter = async (initialPath: string) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/login',
        component: {
          template: '<div>Login</div>',
        },
      },
      {
        path: '/app/connectshyft/threads/:threadId',
        component: ConnectShyftThreadDetailView,
      },
    ],
  });

  await router.push(initialPath);
  await router.isReady();
  return router;
};

const renderThreadDetailView = async (input?: {
  initialPath?: string;
  shellSubjectContext?: {
    orgUnitId: string;
    personId?: string;
    provisionalPersonId?: string;
  };
}) => {
  const router = await buildRouter(
    input?.initialPath || '/app/connectshyft/threads/thread-detail-view-1001',
  );
  const shellSubjectContext = ref({
    orgUnitId: input?.shellSubjectContext?.orgUnitId || 'demo-org',
    ...(input?.shellSubjectContext?.personId
      ? { personId: input.shellSubjectContext.personId }
      : {}),
    ...(input?.shellSubjectContext?.provisionalPersonId
      ? { provisionalPersonId: input.shellSubjectContext.provisionalPersonId }
      : {}),
  });

  const wrapper = mount(ConnectShyftThreadDetailView, {
    global: {
      plugins: [router],
      provide: {
        [SUBJECT_CONTEXT_KEY as symbol]: shellSubjectContext,
      },
      stubs: {
        ConnectShyftComposer: true,
        ConnectShyftMessageBubble: true,
        ConnectShyftNeighborSnapshot: true,
        ConnectShyftPrimaryNav: true,
        ConnectShyftThreadActionBar: true,
        ConnectShyftThreadHeader: true,
      },
    },
  });

  await flushPromises();
  await nextTick();

  return {
    wrapper,
    shellSubjectContext,
  };
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
    neighbors: [],
    scope: {
      tenantId: 'tenant-connectshyft-ui',
      orgUnitId: 'org-connectshyft-ui-east',
    },
  });
  fetchThreadDetailMock.mockResolvedValue({
    ok: true,
    code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
    message: 'Thread detail loaded',
    thread: buildThreadDetail(),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('ConnectShyftThreadDetailView', () => {
  it('renders provisional identity state and syncs the shell subject context without keeping a confirmed id', async () => {
    fetchThreadDetailMock.mockResolvedValueOnce({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
      message: 'Thread detail loaded',
      thread: buildThreadDetail({
        personId: 'person-detail-view-provisional-2005',
        identityState: 'provisional',
        subjectContext: {
          orgUnitId: 'org-connectshyft-ui-east',
          provisionalPersonId: 'person-detail-view-provisional-2005',
          threadId: 'thread-detail-view-1001',
          identityState: 'provisional',
        },
      }),
    });

    const { wrapper, shellSubjectContext } = await renderThreadDetailView({
      shellSubjectContext: {
        orgUnitId: 'demo-org',
        personId: 'stale-confirmed-person',
      },
    });

    expect(wrapper.get('[data-testid="connectshyft-thread-identity-state"]').text()).toBe(
      'Provisional person',
    );
    expect(wrapper.find('[data-testid="connectshyft-thread-subject-impact-banner"]').exists()).toBe(false);
    expect(shellSubjectContext.value).toEqual({
      orgUnitId: 'org-connectshyft-ui-east',
      provisionalPersonId: 'person-detail-view-provisional-2005',
      threadId: 'thread-detail-view-1001',
      identityState: 'provisional',
    });
    expect(shellSubjectContext.value).not.toHaveProperty('personId');
  });

  it('renders confirmed identity state and syncs the shell subject context with the confirmed person id', async () => {
    const { wrapper, shellSubjectContext } = await renderThreadDetailView();

    expect(wrapper.get('[data-testid="connectshyft-thread-identity-state"]').text()).toBe(
      'Confirmed person',
    );
    expect(wrapper.find('[data-testid="connectshyft-thread-subject-impact-banner"]').exists()).toBe(false);
    expect(shellSubjectContext.value).toEqual({
      orgUnitId: 'org-connectshyft-ui-east',
      personId: 'person-detail-view-1001',
      threadId: 'thread-detail-view-1001',
      identityState: 'confirmed',
    });
    expect(shellSubjectContext.value).not.toHaveProperty('provisionalPersonId');
  });

  it('renders a plain-language banner when provisional subject impact affects the current thread', async () => {
    fetchThreadDetailMock.mockResolvedValueOnce({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
      message: 'Thread detail loaded',
      thread: buildThreadDetail({
        personId: 'person-detail-view-provisional-2006',
        identityState: 'provisional',
        subjectImpact: {
          impactType: 'provisional_identity',
          actionable: false,
          resolverQueueItemId: null,
          resolverQueueItemType: null,
        },
        subjectContext: {
          orgUnitId: 'org-connectshyft-ui-east',
          provisionalPersonId: 'person-detail-view-provisional-2006',
          threadId: 'thread-detail-view-1001',
          identityState: 'provisional',
        },
      }),
    });

    const { wrapper } = await renderThreadDetailView({
      initialPath: '/app/connectshyft/threads/thread-detail-view-1001?tenantRole=ORGUNIT_MEMBER',
    });

    expect(wrapper.get('[data-testid="connectshyft-thread-subject-impact-banner"]').text()).toContain(
      'Conversation context still resolving',
    );
    expect(wrapper.get('[data-testid="connectshyft-thread-subject-impact-message"]').text()).toContain(
      'Subject details for this conversation are still settling',
    );
    expect(wrapper.find('[data-testid="connectshyft-thread-subject-impact-people-link"]').exists()).toBe(false);
  });

  it('shows a secondary People affordance for tenant-admin resolver context', async () => {
    fetchThreadDetailMock.mockResolvedValueOnce({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
      message: 'Thread detail loaded',
      thread: buildThreadDetail({
        personId: 'person-detail-view-resolver-2007',
        identityState: 'provisional',
        subjectImpact: {
          impactType: 'resolver_required',
          actionable: true,
          resolverQueueItemId: 'review-1',
          resolverQueueItemType: 'identity_review',
        },
        subjectContext: {
          orgUnitId: 'org-connectshyft-ui-east',
          provisionalPersonId: 'person-detail-view-resolver-2007',
          threadId: 'thread-detail-view-1001',
          identityState: 'provisional',
        },
      }),
    });

    const { wrapper } = await renderThreadDetailView({
      initialPath: '/app/connectshyft/threads/thread-detail-view-1001?tenantRole=TENANT_ADMIN&orgUnitId=org-connectshyft-ui-east',
    });

    expect(wrapper.get('[data-testid="connectshyft-thread-subject-impact-message"]').text()).toContain(
      'Identity for this conversation is still waiting on review in People',
    );
    expect(wrapper.get('[data-testid="connectshyft-thread-subject-impact-people-link"]').text()).toContain(
      'Review in People',
    );
    expect(wrapper.get('[data-testid="connectshyft-thread-subject-impact-people-link"]').attributes('href')).toContain(
      '/people',
    );
  });

  it('refreshes impacted thread detail and clears stale banner state when backend truth resolves', async () => {
    vi.useFakeTimers();
    fetchThreadDetailMock
      .mockResolvedValueOnce({
        ok: true,
        code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
        message: 'Thread detail loaded',
        thread: buildThreadDetail({
          personId: 'person-detail-view-provisional-2008',
          identityState: 'provisional',
          subjectImpact: {
            impactType: 'resolver_required',
            actionable: true,
            resolverQueueItemId: 'review-refresh-1',
            resolverQueueItemType: 'identity_review',
          },
          subjectContext: {
            orgUnitId: 'org-connectshyft-ui-east',
            provisionalPersonId: 'person-detail-view-provisional-2008',
            threadId: 'thread-detail-view-1001',
            identityState: 'provisional',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
        message: 'Thread detail loaded',
        thread: buildThreadDetail({
          personId: 'person-detail-view-confirmed-2008',
          identityState: 'confirmed',
          subjectImpact: null,
          subjectContext: {
            orgUnitId: 'org-connectshyft-ui-east',
            personId: 'person-detail-view-confirmed-2008',
            threadId: 'thread-detail-view-1001',
            identityState: 'confirmed',
          },
        }),
      })
      .mockResolvedValue({
        ok: true,
        code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
        message: 'Thread detail loaded',
        thread: buildThreadDetail({
          personId: 'person-detail-view-confirmed-2008',
          identityState: 'confirmed',
          subjectImpact: null,
          subjectContext: {
            orgUnitId: 'org-connectshyft-ui-east',
            personId: 'person-detail-view-confirmed-2008',
            threadId: 'thread-detail-view-1001',
            identityState: 'confirmed',
          },
        }),
      });

    const { wrapper, shellSubjectContext } = await renderThreadDetailView();

    expect(wrapper.get('[data-testid="connectshyft-thread-subject-impact-banner"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="connectshyft-thread-identity-state"]').text()).toBe(
      'Provisional person',
    );

    await vi.advanceTimersByTimeAsync(15000);
    await flushPromises();
    await nextTick();

    expect(fetchThreadDetailMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(wrapper.find('[data-testid="connectshyft-thread-subject-impact-banner"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="connectshyft-thread-identity-state"]').text()).toBe(
      'Confirmed person',
    );
    expect(shellSubjectContext.value).toEqual({
      orgUnitId: 'org-connectshyft-ui-east',
      personId: 'person-detail-view-confirmed-2008',
      threadId: 'thread-detail-view-1001',
      identityState: 'confirmed',
    });
  });

  it('renders voicemail as calm timeline content with playback controls and transcript text', async () => {
    fetchThreadDetailMock.mockResolvedValueOnce({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
      message: 'Thread detail loaded',
      thread: buildThreadDetail({
        voicemailIndicator: true,
        voicemailLabel: 'Voicemail received',
        timeline: [
          {
            eventId: 'timeline-voicemail-1001',
            eventName: 'connectshyft.voice.provider_callback.recording_completed',
            summary: 'Jordan left a voicemail asking for a callback.',
            conversationType: 'voicemail',
            direction: 'inbound',
            occurredAtUtc: '2026-03-24T14:30:00.000Z',
            recordingUrl: 'https://connectshyft.test/voicemail-1001.mp3',
            durationSeconds: 47,
            transcriptionText: 'Please call me back this afternoon.',
          },
        ],
      }),
    });

    const { wrapper } = await renderThreadDetailView();

    const voicemailTimelineCard = wrapper.get('[data-testid="connectshyft-thread-timeline-event-voicemail"]');
    expect(voicemailTimelineCard.text()).toContain('Voicemail received');
    expect(voicemailTimelineCard.text()).toContain('Please call me back this afternoon.');
    expect(voicemailTimelineCard.text()).not.toContain('provider_callback');
    expect(wrapper.get('[data-testid="connectshyft-voicemail-audio"]').attributes('src')).toBe(
      'https://connectshyft.test/voicemail-1001.mp3',
    );
  });

  it('shows a plain-language launcher handoff notice when text launch opens the thread', async () => {
    const { wrapper } = await renderThreadDetailView({
      initialPath: '/app/connectshyft/threads/thread-detail-view-1001?launchChannel=text&launchState=new',
    });

    expect(wrapper.get('[data-testid="connectshyft-thread-launcher-text-notice"]').text()).toContain(
      'Started a new conversation and opened it ready for a text reply.',
    );
  });

  it('keeps the subject snapshot in the responsive detail rail layout', async () => {
    const { wrapper } = await renderThreadDetailView();

    expect(wrapper.get('.cs-panel-layout--two-column').exists()).toBe(true);
    expect(wrapper.get('[data-testid="connectshyft-thread-subject-snapshot"]').exists()).toBe(true);
  });
});
