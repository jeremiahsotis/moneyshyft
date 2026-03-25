import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import router from '../index';
import api from '@/services/api';

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const apiGetMock = vi.mocked(api.get);

beforeEach(() => {
  apiGetMock.mockImplementation(async (path: string) => {
    if (path === '/auth/me') {
      return {
        data: {
          user: {
            id: 'user-shell-backbone-1',
          },
        },
      };
    }

    if (path === '/connectshyft/settings/navigation') {
      return {
        data: {
          ok: true,
          data: {
            primaryOptions: [
              {
                key: 'settings',
                label: 'Call routing',
                path: '/app/connectshyft/settings',
              },
            ],
            adminOptions: [
              {
                key: 'availability',
                label: 'Availability',
                path: '/app/connectshyft/settings/availability',
              },
            ],
            pathways: [
              {
                path: '/app/connectshyft/settings',
                allowed: true,
              },
              {
                path: '/app/connectshyft/settings/availability',
                allowed: true,
              },
            ],
          },
        },
      };
    }

    throw new Error(`Unexpected api.get call for ${path}`);
  });
});

afterEach(async () => {
  vi.clearAllMocks();
  await router.push('/login');
});

describe('shell backbone router', () => {
  it('routes People, ConnectShyft, and Settings through the shared shell parent', async () => {
    for (const path of ['/people', '/connect', '/settings']) {
      await router.push(path);

      expect(router.currentRoute.value.fullPath).toBe(path);
      expect(router.currentRoute.value.matched[0]?.path).toBe('/');
    }
  });

  it('supports the shell-safe fallback route inside the shell parent', async () => {
    await router.push('/route-that-does-not-exist');

    expect(router.currentRoute.value.name).toBe('shell-route-fallback');
    expect(router.currentRoute.value.matched[0]?.path).toBe('/');
  });

  it('keeps legacy paths inside the shell route tree', async () => {
    await router.push('/app/connectshyft/inbox');

    expect(router.currentRoute.value.name).toBe('connectshyft-inbox');
    expect(router.currentRoute.value.matched[0]?.path).toBe('/');
  });

  it('redirects admin-only settings routes when backend navigation denies access', async () => {
    apiGetMock.mockImplementation(async (path: string) => {
      if (path === '/auth/me') {
        return {
          data: {
            user: {
              id: 'user-shell-backbone-1',
            },
          },
        };
      }

      if (path === '/connectshyft/settings/navigation') {
        return {
          data: {
            ok: true,
            data: {
              primaryOptions: [
                {
                  key: 'settings',
                  label: 'Call routing',
                  path: '/app/connectshyft/settings',
                },
              ],
              adminOptions: [],
              pathways: [
                {
                  path: '/app/connectshyft/settings',
                  allowed: true,
                },
                {
                  path: '/app/connectshyft/settings/availability',
                  allowed: false,
                },
              ],
            },
          },
        };
      }

      throw new Error(`Unexpected api.get call for ${path}`);
    });

    await router.push('/settings/availability');

    expect(router.currentRoute.value.path).toBe('/settings');
    expect(router.currentRoute.value.query.refusedPath).toBe('/settings/availability');
  });
});
