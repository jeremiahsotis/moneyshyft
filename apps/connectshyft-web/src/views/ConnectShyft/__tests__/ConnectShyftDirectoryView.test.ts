import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { nextTick } from 'vue';
import ConnectShyftDirectoryView from '../ConnectShyftDirectoryView.vue';
import * as neighborsModule from '@/features/connectshyft/neighbors';
import * as threadsModule from '@/features/connectshyft/threads';

vi.mock('@/features/connectshyft/neighbors', () => ({
  fetchConnectShyftNeighborScope: vi.fn(),
  fetchConnectShyftNeighborsCollection: vi.fn(),
}));

vi.mock('@/features/connectshyft/threads', () => ({
  ensureConnectShyftThread: vi.fn(),
}));

const fetchScopeMock = vi.mocked(neighborsModule.fetchConnectShyftNeighborScope);
const fetchNeighborsMock = vi.mocked(neighborsModule.fetchConnectShyftNeighborsCollection);
const ensureThreadMock = vi.mocked(threadsModule.ensureConnectShyftThread);

const buildRouter = async (initialPath = '/app/connectshyft/directory') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/app/connectshyft/directory',
        component: ConnectShyftDirectoryView,
      },
      {
        path: '/app/connectshyft/threads/:threadId',
        component: {
          template: '<div>Thread</div>',
        },
      },
    ],
  });

  await router.push(initialPath);
  await router.isReady();
  return router;
};

const renderDirectory = async (initialPath?: string) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: 390,
  });

  const router = await buildRouter(initialPath);
  const wrapper = mount(ConnectShyftDirectoryView, {
    global: {
      plugins: [router],
    },
  });

  await flushPromises();
  await nextTick();
  return { wrapper, router };
};

beforeEach(() => {
  fetchScopeMock.mockResolvedValue({
    tenantId: 'tenant-connectshyft-ui',
    orgUnitId: 'org-connectshyft-ui-east',
  });
  fetchNeighborsMock.mockResolvedValue({
    ok: true,
    code: 'CONNECTSHYFT_NEIGHBORS_LISTED',
    neighbors: [
      {
        neighborId: 'neighbor-directory-1001',
        tenantId: 'tenant-connectshyft-ui',
        orgUnitId: 'org-connectshyft-ui-east',
        firstName: 'Jordan',
        lastName: 'Lee',
        prefersTexting: 'YES',
        phones: [
          {
            phoneId: 'phone-directory-1001',
            label: 'Mobile',
            value: '(317) 555-0100',
            sortOrder: 0,
            isPrimary: true,
            isShared: false,
            verificationStatus: 'verified',
            status: null,
          },
        ],
      },
    ],
    scope: {
      tenantId: 'tenant-connectshyft-ui',
      orgUnitId: 'org-connectshyft-ui-east',
    },
  });
  ensureThreadMock.mockResolvedValue({
    ok: true,
    code: 'CONNECTSHYFT_THREAD_READY',
    thread: {
      threadId: 'thread-directory-1001',
    },
    createdNewThread: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

describe('ConnectShyftDirectoryView', () => {
  it('renders a search-first directory surface with clear conversation actions', async () => {
    const { wrapper } = await renderDirectory();

    expect(wrapper.get('[data-testid="connectshyft-directory-surface"]').text()).toContain(
      'Neighbor Directory',
    );
    expect(wrapper.get('[data-testid="connectshyft-directory-search-input"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="connectshyft-directory-result-conference-chip"]').text()).toContain(
      'Conference match',
    );
    expect(wrapper.get('[data-testid="connectshyft-directory-start-conversation-action"]').text()).toContain(
      'Start conversation',
    );

    await wrapper.get('[data-testid="connectshyft-directory-search-mode-phone"]').trigger('click');

    expect(
      (wrapper.get('[data-testid="connectshyft-directory-search-input"]').element as HTMLInputElement).placeholder,
    ).toContain('phone number');
  });

  it('shows a plain-language empty state when no directory matches are available', async () => {
    fetchNeighborsMock.mockResolvedValueOnce({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBORS_LISTED',
      neighbors: [],
      scope: {
        tenantId: 'tenant-connectshyft-ui',
        orgUnitId: 'org-connectshyft-ui-east',
      },
    });

    const { wrapper } = await renderDirectory();

    expect(wrapper.text()).toContain('No one matches that search');
    expect(wrapper.text()).toContain(
      'People in the current workspace will appear here as soon as ConnectShyft can load the directory.',
    );
  });
});
