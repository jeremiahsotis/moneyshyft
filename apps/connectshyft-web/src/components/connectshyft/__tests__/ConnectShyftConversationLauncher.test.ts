import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ConnectShyftConversationLauncher from '../ConnectShyftConversationLauncher.vue';

const buildTarget = (overrides: Partial<{
  targetId: string;
  neighborId: string | null;
  phone: string;
  displayPhone: string;
  displayName: string;
  detailLabel: string;
  searchText: string;
}> = {}) => ({
  targetId: 'neighbor-1001:+13175550100',
  neighborId: 'neighbor-1001',
  phone: '+13175550100',
  displayPhone: '(317) 555-0100',
  displayName: 'Jordan Lee',
  detailLabel: 'Mobile · (317) 555-0100',
  searchText: 'jordan lee mobile (317) 555-0100',
  ...overrides,
});

describe('ConnectShyftConversationLauncher', () => {
  it('shows target search first and only shows call/text choices after a target is selected', async () => {
    const target = buildTarget();
    const wrapper = mount(ConnectShyftConversationLauncher, {
      props: {
        query: '',
        targets: [target],
        recentTargets: [],
        selectedTarget: null,
        pending: false,
        errorMessage: '',
        focusRingClass: 'focus-ring',
        tapTargetStyle: { minHeight: '44px' },
      },
    });

    expect(wrapper.text()).toContain('Who do you want to reach?');
    expect(wrapper.find('[data-testid="connectshyft-conversation-launcher-call"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="connectshyft-conversation-launcher-text"]').exists()).toBe(false);

    await wrapper.get(`[data-testid="connectshyft-conversation-launcher-target-${target.targetId}"]`).trigger('click');

    expect(wrapper.emitted('select-target')?.[0]?.[0]).toEqual(target);

    await wrapper.setProps({
      selectedTarget: target,
    });

    expect(wrapper.get('[data-testid="connectshyft-conversation-launcher-call"]').text()).toContain('Call');
    expect(wrapper.get('[data-testid="connectshyft-conversation-launcher-text"]').text()).toContain('Text');
  });

  it('renders unknown numbers in plain language without engineering jargon', () => {
    const wrapper = mount(ConnectShyftConversationLauncher, {
      props: {
        query: '3175550102',
        targets: [
          buildTarget({
            targetId: 'unknown:+13175550102',
            neighborId: null,
            phone: '+13175550102',
            displayPhone: '(317) 555-0102',
            displayName: '(317) 555-0102',
            detailLabel: 'New phone number',
            searchText: '3175550102',
          }),
        ],
        recentTargets: [],
        selectedTarget: null,
        pending: false,
        errorMessage: '',
        focusRingClass: 'focus-ring',
        tapTargetStyle: { minHeight: '44px' },
      },
    });

    expect(wrapper.text()).toContain('New phone number');
    expect(wrapper.text()).not.toContain('ContactPoint');
    expect(wrapper.text()).not.toContain('provisional');
  });
});
