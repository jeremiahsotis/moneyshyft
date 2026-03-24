import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import PeopleView from '../PeopleView.vue';
import { SUBJECT_CONTEXT_KEY } from '../../../shell/subjectContext';

const flushPromises = async () => {
  await Promise.resolve();
  await nextTick();
};

const renderPeopleView = () =>
  mount(PeopleView, {
    global: {
      provide: {
        [SUBJECT_CONTEXT_KEY as symbol]: ref({
          orgUnitId: 'test-org',
        }),
      },
    },
  });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('PeopleView', () => {
  it('renders the people shell and current org unit', () => {
    const wrapper = renderPeopleView();

    expect(wrapper.text()).toContain('People shell');
    expect(wrapper.text()).toContain('Org unit: test-org');
    expect(wrapper.text()).toContain('Load contact points');
    expect(wrapper.text()).toContain('Run sample identity decision');
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

    const wrapper = renderPeopleView();

    await wrapper.get('[data-test="load-contact-points"]').trigger('click');
    await flushPromises();

    expect(wrapper.findAll('[data-test="contact-point-shared-indicator"]')).toHaveLength(1);
    expect(wrapper.findAll('[data-test="contact-point-stale-indicator"]')).toHaveLength(1);
    expect(wrapper.findAll('[data-test="contact-point-reassignment-indicator"]')).toHaveLength(1);
  });

  it('runs the sample identity decision and renders the result', async () => {
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

    const wrapper = renderPeopleView();

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

  it('shows candidate suggestions while keeping create-new as the default for low confidence', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        confidenceBand: 'low',
        contactPointStatus: 'active_shared_possible',
        candidates: [{
          personId: 'person-low',
          score: 24,
          reasons: ['historical contact match'],
          contactPointStatus: 'active_shared_possible',
        }],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const wrapper = renderPeopleView();

    await wrapper.get('[data-test="run-sample-decision"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Default action: create_new');
    expect(wrapper.get('[data-test="decision-candidates"]').text()).toContain('person-low');
    expect(wrapper.findAll('[data-test="decision-candidate-shared-indicator"]')).toHaveLength(1);
    expect(wrapper.find('[data-test="attach-existing"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="create-new"]').exists()).toBe(true);
  });
});
