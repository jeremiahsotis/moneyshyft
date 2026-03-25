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
  subjectContext: {
    orgUnitId: item.orgUnitId || 'test-org',
    provisionalPersonId: item.personIds[0],
    candidatePersonIds: item.personIds,
    conversationId: item.conversationId || undefined,
    contactPointId: item.contactPointId || undefined,
    threadId: item.threadId || undefined,
    identityState: item.personIds[0] ? 'provisional' : undefined,
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
  const shellSubjectContext = ref({
    orgUnitId: 'test-org',
  });
  const wrapper = mount(PeopleView, {
    global: {
      provide: {
        [SUBJECT_CONTEXT_KEY as symbol]: shellSubjectContext,
      },
    },
  });

  await flushPromises();
  return { wrapper, shellSubjectContext };
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
  it('renders PeopleView with the review queue for tenant-admin work', async () => {
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

    const { wrapper } = await renderPeopleView();

    expect(fetchResolverQueueMock).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('People');
    expect(wrapper.text()).toContain('Current workspace: Current workspace');
    expect(wrapper.text()).not.toContain('test-org');
    expect(wrapper.get('[data-test="resolver-workspace"]').text()).toContain(
      'Identity and record update reviews',
    );
    expect(wrapper.get('[data-test="resolver-workspace-summary"]').text()).toContain(
      '2 active reviews in this workspace',
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

    const { wrapper } = await renderPeopleView();

    expect(wrapper.get('[data-test="resolver-workspace-locked"]').text()).toContain(
      'not available for your current access',
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

    const { wrapper } = await renderPeopleView();

    expect(wrapper.get('[data-test="resolver-queue-item-type-identity-item"]').text()).toContain(
      'Identity review',
    );
    expect(wrapper.get('[data-test="resolver-queue-item-type-rebind-item"]').text()).toContain(
      'Record update review',
    );
    expect(wrapper.get('[data-test="resolver-queue-item-claim-identity-item"]').text()).toContain(
      'Assigned to me',
    );
    expect(wrapper.get('[data-test="resolver-queue-item-claim-rebind-item"]').text()).toContain(
      'Assigned elsewhere',
    );
  });

  it('does not overwrite shell subject context from the auto-selected resolver detail', async () => {
    const identityItem = buildQueueItem({
      id: 'identity-item',
      itemType: 'identity_review',
    });
    setupResolverQueue([identityItem]);

    const { shellSubjectContext } = await renderPeopleView();

    expect(shellSubjectContext.value).toEqual({
      orgUnitId: 'test-org',
    });
  });

  it('syncs shell subject context only after a resolver item is explicitly selected', async () => {
    const identityItem = buildQueueItem({
      id: 'identity-item',
      itemType: 'identity_review',
    });
    setupResolverQueue([identityItem]);

    const { wrapper, shellSubjectContext } = await renderPeopleView();

    await wrapper.get('[data-test="resolver-queue-item-identity-item"]').trigger('click');
    await flushPromises();

    expect(shellSubjectContext.value).toEqual({
      orgUnitId: 'test-org',
      provisionalPersonId: 'person-a',
      candidatePersonIds: ['person-a', 'person-b'],
      conversationId: 'conversation-1',
      contactPointId: 'contact-point-1',
      threadId: 'thread-1',
      identityState: 'provisional',
    });
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

    const { wrapper } = await renderPeopleView();

    await wrapper.get('[data-test="resolver-detail-claim"]').trigger('click');
    await flushPromises();

    expect(claimResolverQueueItemMock).toHaveBeenCalledWith('identity_review', 'identity-item');
    expect(wrapper.get('[data-test="resolver-queue-feedback"]').text()).toContain('Review assigned to you.');
    expect(wrapper.get('[data-test="resolver-queue-item-claim-identity-item"]').text()).toContain(
      'Assigned to me',
    );
    expect(wrapper.find('[data-test="resolver-detail-claim"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="resolver-detail-release"]').text()).toContain('Release assignment');

    await wrapper.get('[data-test="resolver-detail-release"]').trigger('click');
    await flushPromises();

    expect(releaseResolverQueueItemMock).toHaveBeenCalledWith('identity_review', 'identity-item');
    expect(wrapper.get('[data-test="resolver-queue-item-claim-identity-item"]').text()).toContain(
      'Available',
    );
    expect(wrapper.get('[data-test="resolver-detail-claim"]').text()).toContain('Assign to me');
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

    const { wrapper } = await renderPeopleView();

    expect(wrapper.get('[data-test="resolver-detail-claim-disabled"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-test="resolver-detail-claimed-by-other"]').text()).toContain(
      'currently working this review',
    );
    expect(wrapper.get('[data-test="resolver-detail-reason"]').text()).toContain(
      'sensitive contact update needs review',
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

    const { wrapper } = await renderPeopleView();

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

  it('removes sample tooling and raw identifiers from the cleaned People shell', async () => {
    const { wrapper } = await renderPeopleView();

    expect(wrapper.find('[data-test="load-contact-points"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="run-sample-decision"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('resolver-item-1');
    expect(wrapper.text()).not.toContain('person-a');
  });
});
