import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ShellOrgUnitSelector from '../ShellOrgUnitSelector.vue';

describe('ShellOrgUnitSelector', () => {
  it('renders the available orgUnit labels', () => {
    const wrapper = mount(ShellOrgUnitSelector, {
      props: {
        currentOrgUnitId: 'org-east',
        options: [
          {
            id: 'org-east',
            label: 'East Campus',
            availableModules: {
              people: true,
              connect: true,
              settings: true,
            },
          },
          {
            id: 'org-west',
            label: 'West Campus',
            availableModules: {
              people: true,
              connect: false,
              settings: false,
            },
          },
        ],
      },
    });

    const options = wrapper.findAll('option');
    expect(options.map((option) => option.text())).toEqual([
      'East Campus',
      'West Campus',
    ]);
  });

  it('emits the selected orgUnit id when the selection changes', async () => {
    const wrapper = mount(ShellOrgUnitSelector, {
      props: {
        currentOrgUnitId: 'org-east',
        options: [
          {
            id: 'org-east',
            label: 'East Campus',
            availableModules: {
              people: true,
              connect: true,
              settings: true,
            },
          },
          {
            id: 'org-west',
            label: 'West Campus',
            availableModules: {
              people: true,
              connect: true,
              settings: true,
            },
          },
        ],
      },
    });

    await wrapper.get('[data-testid="shell-orgunit-selector"]').setValue('org-west');

    expect(wrapper.emitted('requestSwitch')).toEqual([
      ['org-west'],
    ]);
  });
});
