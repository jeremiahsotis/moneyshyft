import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ActionButton from '../ActionButton.vue';
import EmptyStatePanel from '../EmptyStatePanel.vue';
import ResponsivePanelLayout from '../ResponsivePanelLayout.vue';
import SearchField from '../SearchField.vue';
import SectionHeader from '../SectionHeader.vue';
import SegmentedTabs from '../SegmentedTabs.vue';
import StatusBadge from '../StatusBadge.vue';
import SurfaceCard from '../SurfaceCard.vue';

describe('shared UI primitives', () => {
  it('renders mobile-first card, badge, and button primitives without internal copy leakage', () => {
    const card = mount(SurfaceCard, {
      props: {
        testId: 'surface-card',
        interactive: true,
        panel: true,
      },
      slots: {
        default: 'Card body',
      },
    });
    const badge = mount(StatusBadge, {
      props: {
        label: 'Needs attention',
        tone: 'attention',
      },
    });
    const button = mount(ActionButton, {
      props: {
        label: 'Open conversation',
        tone: 'primary',
      },
    });

    expect(card.get('[data-testid="surface-card"]').classes()).toContain('cs-card');
    expect(card.get('[data-testid="surface-card"]').classes()).toContain('cs-shell-panel');
    expect(badge.text()).toBe('Needs attention');
    expect(badge.classes()).toContain('cs-chip--attention');
    expect(button.text()).toBe('Open conversation');
    expect(button.classes()).toContain('cs-button--primary');
    expect(card.text().toLowerCase()).not.toContain('debug');
    expect(button.text().toLowerCase()).not.toContain('thread_id');
  });

  it('renders search, segmented tabs, and empty states with reusable calm primitives', async () => {
    const search = mount(SearchField, {
      props: {
        modelValue: '',
        label: 'Search neighbors',
        placeholder: 'Search by name or number',
      },
    });
    const tabs = mount(SegmentedTabs, {
      props: {
        modelValue: 'mine',
        options: [
          { label: 'Inbox', value: 'inbox' },
          { label: 'Mine', value: 'mine' },
        ],
      },
    });
    const empty = mount(EmptyStatePanel, {
      props: {
        eyebrow: 'Inbox',
        title: 'Nothing waiting right now',
        description: 'New conversations will appear here as they arrive.',
      },
    });

    const [firstTab] = tabs.findAll('button');
    await firstTab?.trigger('click');

    expect(search.get('input').classes()).toContain('cs-search__input');
    expect(tabs.emitted('update:modelValue')?.[0]).toEqual(['inbox']);
    expect(empty.classes()).toContain('cs-empty-state');
    expect(empty.text().toLowerCase()).not.toContain('placeholder');
  });

  it('supports responsive layout and section headers for shell-safe composition', () => {
    const layout = mount(ResponsivePanelLayout, {
      props: {
        variant: 'two-column',
      },
      slots: {
        main: '<div data-testid="main-slot">Main</div>',
        rail: '<div data-testid="rail-slot">Rail</div>',
      },
    });
    const header = mount(SectionHeader, {
      props: {
        eyebrow: 'ConnectShyft',
        title: 'Conversations',
        description: 'Stay close to the people who need a response.',
      },
    });

    expect(layout.classes()).toContain('cs-panel-layout');
    expect(layout.classes()).toContain('cs-panel-layout--two-column');
    expect(layout.get('[data-testid="main-slot"]').text()).toBe('Main');
    expect(layout.get('[data-testid="rail-slot"]').text()).toBe('Rail');
    expect(header.text()).toContain('Conversations');
    expect(header.text()).not.toContain('person_id');
  });
});
