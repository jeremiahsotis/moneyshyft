import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { nextTick } from 'vue';
import AppShellView from '../AppShellView.vue';

const TestApp = {
  template: '<RouterView />',
};

const buildRouter = async (initialPath: string) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: AppShellView,
        children: [
          {
            path: '',
            redirect: '/people',
          },
          {
            path: 'people',
            component: {
              template: '<div data-testid="people-surface">People content</div>',
            },
            meta: {
              shellModule: 'people',
              shellTitle: 'People',
            },
          },
          {
            path: 'connect',
            component: {
              template: '<div data-testid="connect-surface">Connect content</div>',
            },
            meta: {
              shellModule: 'connect',
              shellTitle: 'ConnectShyft',
            },
          },
          {
            path: 'settings',
            component: {
              template: '<div data-testid="settings-surface">Settings content</div>',
            },
            meta: {
              shellModule: 'settings',
              shellTitle: 'Settings',
            },
          },
          {
            path: ':pathMatch(.*)*',
            component: {
              template: '<div data-testid="shell-route-fallback">Fallback content</div>',
            },
            meta: {
              shellTitle: 'Workspace unavailable',
            },
          },
        ],
      },
    ],
  });

  await router.push(initialPath);
  await router.isReady();
  return router;
};

const renderShell = async (initialPath: string) => {
  const router = await buildRouter(initialPath);
  const wrapper = mount(TestApp, {
    global: {
      plugins: [router],
    },
  });

  await nextTick();
  return { wrapper, router };
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('AppShellView', () => {
  it('renders exactly the MVP shell nav items', async () => {
    const { wrapper } = await renderShell('/people');
    const navItems = wrapper.findAll('[data-testid^="shell-primary-nav-"]');

    expect(navItems).toHaveLength(3);
    expect(navItems.map((item) => item.text())).toEqual([
      'People',
      'ConnectShyft',
      'Settings',
    ]);
  });

  it('keeps one shell frame while navigating between primary modules', async () => {
    const { wrapper, router } = await renderShell('/people');

    expect(wrapper.get('[data-testid="app-shell-root"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="people-surface"]').text()).toContain('People content');

    await router.push('/connect');
    await nextTick();

    expect(wrapper.get('[data-testid="app-shell-root"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="connect-surface"]').text()).toContain('Connect content');

    await router.push('/settings');
    await nextTick();

    expect(wrapper.get('[data-testid="app-shell-root"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="settings-surface"]').text()).toContain('Settings content');
  });

  it('renders a shell-safe fallback for invalid routes', async () => {
    const { wrapper } = await renderShell('/not-a-real-route');

    expect(wrapper.get('[data-testid="app-shell-root"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="shell-route-fallback"]').text()).toContain('Fallback content');
  });
});
