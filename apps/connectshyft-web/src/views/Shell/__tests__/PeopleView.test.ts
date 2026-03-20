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

  it('runs the sample identity decision and renders the result', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        confidenceBand: 'very_high',
        decisionType: 'require_override',
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
    expect(wrapper.text()).toContain('Decision type: require_override');
  });
});
