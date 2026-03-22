import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import ConnectShyftMoreView from '../ConnectShyftMoreView.vue';

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
        path: '/app/connectshyft/more',
        component: ConnectShyftMoreView,
      },
      {
        path: '/app/connectshyft/settings',
        component: {
          template: '<div>Settings</div>',
        },
      },
    ],
  });

  await router.push(initialPath);
  await router.isReady();
  return router;
};

const renderMoreView = async (initialPath = '/app/connectshyft/more') => {
  const router = await buildRouter(initialPath);
  const wrapper = mount(ConnectShyftMoreView, {
    global: {
      plugins: [router],
    },
  });

  await nextTick();
  return wrapper;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ConnectShyftMoreView', () => {
  it('keeps the More hub focused while pointing settings callers to the callback setup surface', async () => {
    const wrapper = await renderMoreView();

    expect(wrapper.get('[data-testid="connectshyft-more-surface"]').text()).toContain(
      'ConnectShyft More',
    );
    expect(wrapper.text()).toContain('ConnectShyft Settings');
    expect(wrapper.text()).toContain(
      'Set your callback / forwarding number and check voice forwarding readiness.',
    );
    expect(wrapper.text()).toContain('Notifications');
    expect(wrapper.text()).toContain('Display Preferences');
    expect(wrapper.find('[data-testid="connectshyft-more-admin-option-availability"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Save Callback Number');
  });

  it('preserves the current admin refusal guidance on the More surface', async () => {
    const wrapper = await renderMoreView(
      '/app/connectshyft/more?refusedPath=%2Fapp%2Fconnectshyft%2Fsettings%2Favailability',
    );

    expect(wrapper.get('[data-testid="connectshyft-settings-refusal-guidance"]').text()).toContain(
      'Access to /app/connectshyft/settings/availability is available to authorized admin users only.',
    );
    expect(wrapper.text()).toContain('Use the approved settings entry points for your role.');
    expect(wrapper.text()).not.toContain('Save Callback Number');
  });
});
