import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { nextTick, ref } from 'vue';
import type { SubjectContext } from '@shyft/contracts';
import api from '@/services/api';
import { SUBJECT_CONTEXT_KEY } from '@/shell/subjectContext';
import { resetActiveShellOrgUnitIdForTests } from '@/shell/orgUnitState';
import { resetShellOrgUnitContextForTests } from '@/shell/orgUnitContext';
import AppShellView from '../AppShellView.vue';

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const TestApp = {
  template: '<RouterView />',
};

const apiGetMock = vi.mocked(api.get);

const buildShellContextResponse = (input?: {
  currentOrgUnitId?: string;
  orgUnits?: Array<{
    id: string;
    label: string;
    availableModules: {
      people: boolean;
      connect: boolean;
      settings: boolean;
    };
  }>;
}) => ({
  data: {
    ok: true,
    code: 'CONNECTSHYFT_CONTEXT_RESOLVED',
    data: {
      context: {
        tenantId: 'tenant-shell-test',
        orgUnitId: input?.currentOrgUnitId || 'org-east',
        bypassedOrgUnitMembership: false,
        orgUnits: input?.orgUnits || [
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
        telephony: {
          operatorPhoneSource: 'callback_number',
          voiceReady: true,
          smsReady: true,
          degradedMode: false,
        },
      },
    },
  },
});

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
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
              shellOrgUnitFallback: 'people',
            },
          },
          {
            path: 'connect',
            component: {
              template: '<RouterView />',
            },
            meta: {
              shellModule: 'connect',
              shellTitle: 'ConnectShyft',
              shellOrgUnitFallback: 'communication',
            },
            children: [
              {
                path: '',
                component: {
                  template: '<div data-testid="connect-surface">Connect content</div>',
                },
                meta: {
                  shellTitle: 'ConnectShyft',
                },
              },
              {
                path: 'directory',
                component: {
                  template: '<div data-testid="connect-directory-surface">Directory content</div>',
                },
                meta: {
                  shellTitle: 'ConnectShyft',
                },
              },
              {
                path: 'threads/:threadId',
                component: {
                  template: '<div data-testid="connect-thread-surface">Thread content</div>',
                },
                meta: {
                  shellTitle: 'ConnectShyft',
                  shellOrgUnitSwitchMode: 'destructive',
                },
              },
            ],
          },
          {
            path: 'settings',
            component: {
              template: '<div data-testid="settings-surface">Settings content</div>',
            },
            meta: {
              shellModule: 'settings',
              shellTitle: 'Settings',
              shellOrgUnitFallback: 'shell',
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

const renderShell = async (input?: {
  initialPath?: string;
  subjectContext?: SubjectContext;
  contextResponse?: ReturnType<typeof buildShellContextResponse>;
  contextError?: unknown;
}) => {
  if (input?.contextError) {
    apiGetMock.mockRejectedValueOnce(input.contextError);
  } else {
    apiGetMock.mockResolvedValueOnce(input?.contextResponse || buildShellContextResponse());
  }
  const router = await buildRouter(input?.initialPath || '/people?orgUnitId=org-east');
  const shellSubjectContext = ref<SubjectContext>(input?.subjectContext || {
    orgUnitId: 'org-east',
  });

  const wrapper = mount(TestApp, {
    global: {
      plugins: [router],
      provide: {
        [SUBJECT_CONTEXT_KEY as symbol]: shellSubjectContext,
      },
    },
  });

  await flushPromises();
  await nextTick();

  return { wrapper, router, shellSubjectContext };
};

beforeEach(() => {
  apiGetMock.mockReset();
  resetShellOrgUnitContextForTests();
  resetActiveShellOrgUnitIdForTests();
});

afterEach(() => {
  document.body.innerHTML = '';
  resetShellOrgUnitContextForTests();
  resetActiveShellOrgUnitIdForTests();
});

describe('AppShellView', () => {
  it('renders exactly the MVP shell nav items', async () => {
    const { wrapper } = await renderShell();
    const navItems = wrapper.findAll('[data-testid^="shell-primary-nav-"]');

    expect(navItems).toHaveLength(3);
    expect(navItems.map((item) => item.text())).toEqual([
      'People',
      'ConnectShyft',
      'Settings',
    ]);
    expect(wrapper.get('[data-testid="shell-orgunit-selector"]').exists()).toBe(true);
  });

  it('hides backend-disabled modules from the shell nav', async () => {
    const { wrapper } = await renderShell({
      contextResponse: buildShellContextResponse({
        orgUnits: [
          {
            id: 'org-east',
            label: 'East Campus',
            availableModules: {
              people: true,
              connect: false,
              settings: false,
            },
          },
        ],
      }),
    });

    const navItems = wrapper.findAll('[data-testid^="shell-primary-nav-"]');
    expect(navItems).toHaveLength(1);
    expect(navItems[0]?.text()).toBe('People');
    expect(wrapper.find('[data-testid="shell-primary-nav-connect"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="shell-primary-nav-settings"]').exists()).toBe(false);
  });

  it('executes a safe orgUnit switch immediately and preserves the current route', async () => {
    const { wrapper, router, shellSubjectContext } = await renderShell({
      initialPath: '/people?orgUnitId=org-east',
      subjectContext: {
        orgUnitId: 'org-east',
      },
    });

    expect(wrapper.findAll('option')).toHaveLength(2);
    await wrapper.findComponent(AppShellView).vm.handleOrgUnitSelection('org-west');
    await flushPromises();
    await nextTick();

    expect(wrapper.find('[data-testid="shell-orgunit-confirmation"]').exists()).toBe(false);
    expect(router.currentRoute.value.fullPath).toBe('/people?orgUnitId=org-west');
    expect(shellSubjectContext.value).toEqual({
      orgUnitId: 'org-west',
    });
  });

  it('clears active subject context on routes that do not support shared subject continuity', async () => {
    const { wrapper, shellSubjectContext } = await renderShell({
      initialPath: '/settings?orgUnitId=org-east',
      subjectContext: {
        orgUnitId: 'org-east',
        conversationId: 'conversation-1',
        threadId: 'thread-1',
      },
    });

    expect(shellSubjectContext.value).toEqual({
      orgUnitId: 'org-east',
    });
    expect(wrapper.get('[data-testid="shell-subject-slot"]').attributes('data-subject-active')).toBe('false');
  });

  it('shows confirmation before a destructive orgUnit switch', async () => {
    const { wrapper, router, shellSubjectContext } = await renderShell({
      initialPath: '/connect/threads/thread-1?orgUnitId=org-east',
      subjectContext: {
        orgUnitId: 'org-east',
        conversationId: 'conversation-1',
      },
    });

    await wrapper.findComponent(AppShellView).vm.handleOrgUnitSelection('org-west');
    await flushPromises();
    await nextTick();

    expect(wrapper.get('[data-testid="shell-orgunit-confirmation"]').text()).toContain(
      'This will clear the current person or conversation and take you to the nearest available page in the selected workspace.',
    );
    expect(router.currentRoute.value.fullPath).toBe('/connect/threads/thread-1?orgUnitId=org-east');
    expect(shellSubjectContext.value).toEqual({
      orgUnitId: 'org-east',
      conversationId: 'conversation-1',
    });
  });

  it('keeps the current route and subject context when the destructive switch is canceled', async () => {
    const { wrapper, router, shellSubjectContext } = await renderShell({
      initialPath: '/connect/threads/thread-1?orgUnitId=org-east',
      subjectContext: {
        orgUnitId: 'org-east',
        conversationId: 'conversation-1',
      },
    });

    await wrapper.findComponent(AppShellView).vm.handleOrgUnitSelection('org-west');
    await flushPromises();
    await nextTick();
    await wrapper.get('[data-testid="shell-orgunit-cancel"]').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-testid="shell-orgunit-confirmation"]').exists()).toBe(false);
    expect(router.currentRoute.value.fullPath).toBe('/connect/threads/thread-1?orgUnitId=org-east');
    expect(shellSubjectContext.value).toEqual({
      orgUnitId: 'org-east',
      conversationId: 'conversation-1',
    });
  });

  it('clears subject context and redirects after confirming a destructive switch', async () => {
    const { wrapper, router, shellSubjectContext } = await renderShell({
      initialPath: '/connect/threads/thread-1?orgUnitId=org-east',
      subjectContext: {
        orgUnitId: 'org-east',
        conversationId: 'conversation-1',
      },
    });

    await wrapper.findComponent(AppShellView).vm.handleOrgUnitSelection('org-west');
    await flushPromises();
    await nextTick();
    expect(wrapper.find('[data-testid="shell-orgunit-confirmation"]').exists()).toBe(true);
    await wrapper.findComponent(AppShellView).vm.confirmPendingOrgUnitSwitch();
    await flushPromises();
    await nextTick();

    expect(router.currentRoute.value.fullPath).toBe('/connect?orgUnitId=org-west');
    expect(shellSubjectContext.value).toEqual({
      orgUnitId: 'org-west',
    });
  });

  it('corrects invalid routes by redirecting to People when the target orgUnit disables the current module', async () => {
    const { wrapper, router, shellSubjectContext } = await renderShell({
      initialPath: '/connect/directory?orgUnitId=org-east',
      subjectContext: {
        orgUnitId: 'org-east',
      },
      contextResponse: buildShellContextResponse({
        orgUnits: [
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
      }),
    });

    await wrapper.findComponent(AppShellView).vm.handleOrgUnitSelection('org-west');
    await flushPromises();
    await nextTick();
    expect(wrapper.find('[data-testid="shell-orgunit-confirmation"]').exists()).toBe(true);
    await wrapper.findComponent(AppShellView).vm.confirmPendingOrgUnitSwitch();
    await flushPromises();
    await nextTick();

    expect(router.currentRoute.value.fullPath).toBe('/people?orgUnitId=org-west');
    expect(shellSubjectContext.value).toEqual({
      orgUnitId: 'org-west',
    });
  });

  it('shows a shell-level error state when orgUnit access fails to load', async () => {
    const { wrapper } = await renderShell({
      contextError: {
        response: {
          data: {
            message: 'Unable to load org unit access.',
          },
        },
      },
    });

    expect(wrapper.find('[data-testid="people-surface"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="shell-surface-error"]').text()).toContain(
      'We couldn’t load this workspace.',
    );
  });

  it('surfaces backend refusal copy when the context route returns a refusal envelope', async () => {
    const { wrapper } = await renderShell({
      contextResponse: {
        data: {
          ok: false,
          code: 'CONNECTSHYFT_ORGUNIT_CONTEXT_REQUIRED',
          message: 'orgUnit context is required for ConnectShyft orgUnit-scoped routes',
        },
      },
    });

    expect(wrapper.get('[data-testid="shell-surface-error"]').text()).toContain(
      'orgUnit context is required for ConnectShyft orgUnit-scoped routes',
    );
  });
});
