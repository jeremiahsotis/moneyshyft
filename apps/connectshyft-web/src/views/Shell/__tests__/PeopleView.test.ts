import type {
  ConnectShyftResolverQueueDetailData,
  ConnectShyftResolverQueueItemRecord,
} from '@shyft/contracts';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import * as resolverQueueApi from '@/features/connectshyft/resolverQueue';
import PeopleView from '../PeopleView.vue';
import { SUBJECT_CONTEXT_KEY } from '../../../shell/subjectContext';

vi.mock('@/features/connectshyft/resolverQueue', () => ({
  fetchConnectShyftResolverQueue: vi.fn(),
  fetchConnectShyftResolverQueueDetail: vi.fn(),
  claimConnectShyftResolverQueueItem: vi.fn(),
  releaseConnectShyftResolverQueueItem: vi.fn(),
}));

const fetchResolverQueueMock = vi.mocked(resolverQueueApi.fetchConnectShyftResolverQueue);
const fetchResolverQueueDetailMock = vi.mocked(resolverQueueApi.fetchConnectShyftResolverQueueDetail);
const claimResolverQueueItemMock = vi.mocked(resolverQueueApi.claimConnectShyftResolverQueueItem);
const releaseResolverQueueItemMock = vi.mocked(resolverQueueApi.releaseConnectShyftResolverQueueItem);

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
};

const buildQueueItem = (
  overrides: Partial<ConnectShyftResolverQueueItemRecord> = {},
): ConnectShyftResolverQueueItemRecord => ({
  id: 'resolver-item-1',
  itemType: 'identity_review',
  status: 'queued',
  active: true,
  terminal: false,
  claimState: 'unclaimed',
  claimantUserId: null,
  claimedByCurrentUser: false,
  claimable: true,
  releasable: false,
  actionable: false,
  resolverReviewId: 'resolver-item-1',
  orgUnitId: 'test-org',
  conversationId: 'conversation-1',
  contactPointId: 'contact-point-1',
  threadId: 'thread-1',
  personIds: ['person-a', 'person-b'],
  triggerSourceType: 'connectshyft_identity_seam',
  triggerSourceId: 'trigger-1',
  requestedAt: '2026-03-24T10:00:00.000Z',
  startedAt: null,
  resolvedAt: null,
  ...overrides,
});

const buildQueueDetail = (
  item: ConnectShyftResolverQueueItemRecord,
  overrides: Partial<ConnectShyftResolverQueueDetailData> = {},
): ConnectShyftResolverQueueDetailData => ({
  item,
  review: {
    id: item.id,
    tenantId: 'tenant-1',
    orgUnitId: item.orgUnitId || 'test-org',
    reviewType: item.itemType === 'rebind_review'
      ? 'subject_reassignment_review'
      : 'shared_contact_ambiguity',
    reviewStatus: item.status,
    priority: 'normal',
    triggerSourceType: item.triggerSourceType || 'connectshyft_identity_seam',
    triggerSourceId: item.triggerSourceId || 'trigger-1',
    conversationId: item.conversationId || undefined,
    provisionalPersonId: item.personIds[0],
    candidatePersonIds: item.personIds,
    contactPointId: item.contactPointId || undefined,
    confidenceBand: 'medium',
    confidenceReasons: ['manual review required'],
    riskFlags: item.itemType === 'rebind_review' ? [] : ['shared_contact_possible'],
    requestedByUserId: 'requested-by-user',
    assignedResolverUserId: item.claimantUserId || undefined,
    requestedAt: item.requestedAt || '2026-03-24T10:00:00.000Z',
    startedAt: item.startedAt || undefined,
    resolvedAt: item.resolvedAt || undefined,
    resolutionType: undefined,
    resolutionReason: undefined,
    resolutionNotes: undefined,
    actionable: item.active,
    terminal: item.terminal,
    decisionStatus: null,
  },
  rebindReview: item.itemType === 'rebind_review'
    ? {
      rebindHistoryId: `rebind-${item.id}`,
      affectedObjectType: 'contact_point_link',
      affectedObjectIds: ['link-1', 'link-2'],
      sourcePersonId: 'person-old',
      targetPersonId: 'person-new',
      contactPointIds: ['contact-point-1'],
      originatingResolverReviewId: 'origin-review-1',
      originatingResolutionType: 'reassign_contact_point',
    }
    : null,
  ...overrides,
});

const buildResolverQueueKey = (item: ConnectShyftResolverQueueItemRecord): string =>
  `${item.itemType}:${item.id}`;

const setupResolverQueue = (items: ConnectShyftResolverQueueItemRecord[]) => {
  const detailMap = new Map(items.map((item) => [buildResolverQueueKey(item), buildQueueDetail(item)]));

  fetchResolverQueueMock.mockResolvedValue({
    ok: true,
    code: 'CONNECTSHYFT_RESOLVER_QUEUE_LISTED',
    message: 'ConnectShyft resolver queue listed',
    items,
  });

  fetchResolverQueueDetailMock.mockImplementation(async (itemType, itemId) => {
    const detail = detailMap.get(`${itemType}:${itemId}`);
    if (!detail) {
      return {
        ok: false,
        code: 'CONNECTSHYFT_RESOLVER_QUEUE_ITEM_NOT_FOUND',
        message: 'Resolver queue item is unavailable for the active tenant context.',
        unauthorized: false,
        unavailable: true,
      };
    }

    return {
      ok: true,
      code: 'CONNECTSHYFT_RESOLVER_QUEUE_ITEM_RETRIEVED',
      message: 'ConnectShyft resolver queue item retrieved',
      detail,
    };
  });

  return detailMap;
};

const renderPeopleView = async () => {
  const wrapper = mount(PeopleView, {
    global: {
      provide: {
        [SUBJECT_CONTEXT_KEY as symbol]: ref({
          orgUnitId: 'test-org',
        }),
      },
    },
  });

  await flushPromises();
  return wrapper;
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchResolverQueueMock.mockResolvedValue({
    ok: true,
    code: 'CONNECTSHYFT_RESOLVER_QUEUE_LISTED',
    message: 'ConnectShyft resolver queue listed',
    items: [],
  });
  fetchResolverQueueDetailMock.mockResolvedValue({
    ok: false,
    code: 'CONNECTSHYFT_RESOLVER_QUEUE_ITEM_NOT_FOUND',
    message: 'Resolver queue item is unavailable for the active tenant context.',
    unauthorized: false,
    unavailable: true,
  });
  claimResolverQueueItemMock.mockResolvedValue({
    ok: false,
    code: 'CONNECTSHYFT_RESOLVER_QUEUE_ITEM_NOT_FOUND',
    message: 'Resolver queue item is unavailable for the active tenant context.',
    unauthorized: false,
    unavailable: true,
  });
  releaseResolverQueueItemMock.mockResolvedValue({
    ok: false,
    code: 'CONNECTSHYFT_RESOLVER_QUEUE_ITEM_NOT_FOUND',
    message: 'Resolver queue item is unavailable for the active tenant context.',
    unauthorized: false,
    unavailable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PeopleView', () => {
  it('renders PeopleView with the resolver workspace for tenant-admin queue work', async () => {
    const identityItem = buildQueueItem({
      id: 'identity-item',
      itemType: 'identity_review',
      claimState: 'unclaimed',
    });
    const rebindItem = buildQueueItem({
      id: 'rebind-item',
      itemType: 'rebind_review',
      claimState: 'claimed_by_current_user',
      claimantUserId: 'resolver-1',
      claimedByCurrentUser: true,
      claimable: false,
      releasable: true,
      actionable: true,
      status: 'in_review',
    });
    setupResolverQueue([identityItem, rebindItem]);

    const wrapper = await renderPeopleView();

    expect(fetchResolverQueueMock).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('People shell');
    expect(wrapper.text()).toContain('Org unit: test-org');
    expect(wrapper.get('[data-test="resolver-workspace"]').text()).toContain(
      'Primary queue for identity and rebind reviews',
    );
    expect(wrapper.get('[data-test="resolver-workspace-summary"]').text()).toContain(
      '2 active resolver items in one workspace',
    );
    expect(wrapper.find('[data-test="resolver-filter-all_active"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="resolver-filter-claimed_by_me"]').exists()).toBe(true);
  });

  it('keeps resolver controls hidden for non-tenant-admin users', async () => {
    fetchResolverQueueMock.mockResolvedValue({
      ok: false,
      code: 'CONNECTSHYFT_RESOLVER_QUEUE_FORBIDDEN',
      message: 'Resolver queue access requires a tenant-admin role.',
      unauthorized: true,
    });

    const wrapper = await renderPeopleView();

    expect(wrapper.get('[data-test="resolver-workspace-locked"]').text()).toContain(
      'available only to tenant-admin resolvers',
    );
    expect(wrapper.find('[data-test="resolver-filter-all_active"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="resolver-detail-claim"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="resolver-detail-release"]').exists()).toBe(false);
  });

  it('renders identity_review and rebind_review items with distinct claim states', async () => {
    const identityItem = buildQueueItem({
      id: 'identity-item',
      itemType: 'identity_review',
      claimState: 'claimed_by_current_user',
      claimantUserId: 'resolver-1',
      claimedByCurrentUser: true,
      claimable: false,
      releasable: true,
      actionable: true,
      status: 'in_review',
    });
    const rebindItem = buildQueueItem({
      id: 'rebind-item',
      itemType: 'rebind_review',
      claimState: 'claimed_by_other',
      claimantUserId: 'resolver-2',
      claimable: false,
      releasable: false,
      actionable: false,
      status: 'in_review',
    });
    setupResolverQueue([identityItem, rebindItem]);

    const wrapper = await renderPeopleView();

    expect(wrapper.get('[data-test="resolver-queue-item-type-identity-item"]').text()).toContain(
      'Identity review',
    );
    expect(wrapper.get('[data-test="resolver-queue-item-type-rebind-item"]').text()).toContain(
      'Rebind review',
    );
    expect(wrapper.get('[data-test="resolver-queue-item-claim-identity-item"]').text()).toContain(
      'Claimed by me',
    );
    expect(wrapper.get('[data-test="resolver-queue-item-claim-rebind-item"]').text()).toContain(
      'Claimed by another resolver',
    );
  });

  it('claims and releases resolver work through backend-backed operations', async () => {
    const queueItem = buildQueueItem({
      id: 'identity-item',
      itemType: 'identity_review',
      claimState: 'unclaimed',
      claimable: true,
      releasable: false,
      actionable: false,
    });
    setupResolverQueue([queueItem]);

    const claimedItem = buildQueueItem({
      ...queueItem,
      claimState: 'claimed_by_current_user',
      claimantUserId: 'resolver-1',
      claimedByCurrentUser: true,
      claimable: false,
      releasable: true,
      actionable: true,
      status: 'in_review',
      startedAt: '2026-03-24T10:05:00.000Z',
    });

    claimResolverQueueItemMock.mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_RESOLVER_QUEUE_ITEM_CLAIMED',
      message: 'ConnectShyft resolver queue item claimed',
      detail: buildQueueDetail(claimedItem),
    });

    releaseResolverQueueItemMock.mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_RESOLVER_QUEUE_ITEM_RELEASED',
      message: 'ConnectShyft resolver queue item released',
      detail: buildQueueDetail(queueItem),
    });

    const wrapper = await renderPeopleView();

    await wrapper.get('[data-test="resolver-detail-claim"]').trigger('click');
    await flushPromises();

    expect(claimResolverQueueItemMock).toHaveBeenCalledWith('identity_review', 'identity-item');
    expect(wrapper.get('[data-test="resolver-queue-feedback"]').text()).toContain('claimed');
    expect(wrapper.get('[data-test="resolver-queue-item-claim-identity-item"]').text()).toContain(
      'Claimed by me',
    );
    expect(wrapper.find('[data-test="resolver-detail-claim"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="resolver-detail-release"]').text()).toContain('Release item');

    await wrapper.get('[data-test="resolver-detail-release"]').trigger('click');
    await flushPromises();

    expect(releaseResolverQueueItemMock).toHaveBeenCalledWith('identity_review', 'identity-item');
    expect(wrapper.get('[data-test="resolver-queue-item-claim-identity-item"]').text()).toContain(
      'Unclaimed',
    );
    expect(wrapper.get('[data-test="resolver-detail-claim"]').text()).toContain('Claim item');
  });

  it('shows claimed-by-other work as explicit and non-actionable', async () => {
    const queueItem = buildQueueItem({
      id: 'rebind-item',
      itemType: 'rebind_review',
      claimState: 'claimed_by_other',
      claimantUserId: 'resolver-2',
      claimable: false,
      releasable: false,
      actionable: false,
      status: 'in_review',
    });
    setupResolverQueue([queueItem]);

    const wrapper = await renderPeopleView();

    expect(wrapper.get('[data-test="resolver-detail-claim-disabled"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-test="resolver-detail-claimed-by-other"]').text()).toContain(
      'currently working this item',
    );
    expect(wrapper.get('[data-test="resolver-detail-reason"]').text()).toContain(
      'contact-point reassignment created sensitive follow-up work',
    );
  });

  it('filters the resolver workspace using typed queue and claim fields', async () => {
    const unclaimedIdentity = buildQueueItem({
      id: 'identity-unclaimed',
      itemType: 'identity_review',
      claimState: 'unclaimed',
      claimable: true,
    });
    const claimedRebind = buildQueueItem({
      id: 'rebind-claimed',
      itemType: 'rebind_review',
      claimState: 'claimed_by_current_user',
      claimantUserId: 'resolver-1',
      claimedByCurrentUser: true,
      claimable: false,
      releasable: true,
      actionable: true,
      status: 'in_review',
    });
    const claimedByOtherIdentity = buildQueueItem({
      id: 'identity-other',
      itemType: 'identity_review',
      claimState: 'claimed_by_other',
      claimantUserId: 'resolver-2',
      claimable: false,
      releasable: false,
      actionable: false,
      status: 'in_review',
    });
    setupResolverQueue([unclaimedIdentity, claimedRebind, claimedByOtherIdentity]);

    const wrapper = await renderPeopleView();

    await wrapper.get('[data-test="resolver-filter-rebind_review"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="resolver-queue-item-rebind-claimed"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="resolver-queue-item-identity-unclaimed"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="resolver-queue-item-identity-other"]').exists()).toBe(false);

    await wrapper.get('[data-test="resolver-filter-claimed_by_me"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="resolver-queue-item-rebind-claimed"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="resolver-queue-item-identity-unclaimed"]').exists()).toBe(false);

    await wrapper.get('[data-test="resolver-filter-unclaimed"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="resolver-queue-item-identity-unclaimed"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="resolver-queue-item-rebind-claimed"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="resolver-queue-item-identity-other"]').exists()).toBe(false);
  });

  it('renders shared, stale, and reassignment indicators for contact points', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([
        {
          id: 'contact-shared',
          tenantId: 'tenant-1',
          type: 'phone',
          normalizedValue: '+12605551212',
          status: 'active_shared_possible',
          firstSeenAt: '2026-03-24T10:00:00.000Z',
          lastSeenAt: '2026-03-24T10:00:00.000Z',
          suspectedShared: true,
          confirmedShared: false,
          reassignmentSuspected: false,
          createdAt: '2026-03-24T10:00:00.000Z',
          updatedAt: '2026-03-24T10:00:00.000Z',
        },
        {
          id: 'contact-stale',
          tenantId: 'tenant-1',
          type: 'phone',
          normalizedValue: '+12605551213',
          status: 'stale',
          firstSeenAt: '2026-03-24T10:00:00.000Z',
          lastSeenAt: '2026-03-24T10:00:00.000Z',
          suspectedShared: false,
          confirmedShared: false,
          reassignmentSuspected: false,
          createdAt: '2026-03-24T10:00:00.000Z',
          updatedAt: '2026-03-24T10:00:00.000Z',
        },
        {
          id: 'contact-reassigned',
          tenantId: 'tenant-1',
          type: 'phone',
          normalizedValue: '+12605551214',
          status: 'reassignment_suspected',
          firstSeenAt: '2026-03-24T10:00:00.000Z',
          lastSeenAt: '2026-03-24T10:00:00.000Z',
          suspectedShared: false,
          confirmedShared: false,
          reassignmentSuspected: true,
          createdAt: '2026-03-24T10:00:00.000Z',
          updatedAt: '2026-03-24T10:00:00.000Z',
        },
      ]),
    });

    vi.stubGlobal('fetch', fetchMock);

    const wrapper = await renderPeopleView();

    await wrapper.get('[data-test="load-contact-points"]').trigger('click');
    await flushPromises();

    expect(wrapper.findAll('[data-test="contact-point-shared-indicator"]')).toHaveLength(1);
    expect(wrapper.findAll('[data-test="contact-point-stale-indicator"]')).toHaveLength(1);
    expect(wrapper.findAll('[data-test="contact-point-reassignment-indicator"]')).toHaveLength(1);
  });

  it('runs the sample identity decision and keeps resolver-required guidance compatible', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        confidenceBand: 'very_high',
        contactPointStatus: 'reassignment_suspected',
        outcome: 'resolver_required',
        resolverReviewId: 'review-1',
        candidates: [],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const wrapper = await renderPeopleView();

    await wrapper.get('[data-test="run-sample-decision"]').trigger('click');
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      '/people/identity/decision',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );
    expect(wrapper.text()).toContain('Confidence band: very_high');
    expect(wrapper.text()).toContain('Resolution state: resolver_required');
    expect(wrapper.text()).toContain('Default action: resolver_review');
    expect(wrapper.get('[data-test="resolver-review-id"]').text()).toContain('review-1');
    expect(wrapper.find('[data-test="create-new"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="resolver-required-message"]').text()).toContain(
      'Resolver review is required before creating a new person.',
    );
  });
});
