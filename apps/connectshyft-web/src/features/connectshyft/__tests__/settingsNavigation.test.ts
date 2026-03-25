import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/services/api';
import {
  canAccessConnectShyftSettingsPath,
  fetchConnectShyftSettingsNavigationState,
} from '../settingsNavigation';

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const apiGetMock = vi.mocked(api.get);

describe('settingsNavigation', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps only allowed shell settings destinations from backend navigation', async () => {
    apiGetMock.mockResolvedValue({
      data: {
        ok: true,
        data: {
          primaryOptions: [
            {
              key: 'settings',
              label: 'Call routing',
              path: '/app/connectshyft/settings',
            },
            {
              key: 'directory',
              label: 'Directory',
              path: '/app/connectshyft/directory',
            },
          ],
          adminOptions: [
            {
              key: 'availability',
              label: 'Availability',
              path: '/app/connectshyft/settings/availability',
            },
            {
              key: 'number-mappings',
              label: 'Number Mappings',
              path: '/app/connectshyft/settings/numbers',
            },
          ],
          pathways: [
            {
              path: '/app/connectshyft/settings',
              allowed: true,
            },
            {
              path: '/app/connectshyft/settings/availability',
              allowed: false,
            },
            {
              path: '/app/connectshyft/settings/numbers',
              allowed: true,
            },
          ],
        },
      },
    });

    const result = await fetchConnectShyftSettingsNavigationState();

    expect(result.items).toEqual([
      {
        key: 'settings',
        label: 'Call routing',
        path: '/settings',
      },
      {
        key: 'number-mappings',
        label: 'Number Mappings',
        path: '/settings/numbers',
      },
    ]);
    expect(result.allowedPaths).toEqual([
      '/settings',
      '/settings/numbers',
    ]);
  });

  it('fails closed for admin-only settings paths when navigation fetch falls back', async () => {
    apiGetMock.mockRejectedValue(new Error('network down'));

    await expect(canAccessConnectShyftSettingsPath('/settings/availability')).resolves.toBe(false);
    await expect(canAccessConnectShyftSettingsPath('/settings')).resolves.toBe(true);
  });
});
