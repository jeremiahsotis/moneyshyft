import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildConnectShyftConversationLauncherRecentsStorageKey,
  buildConnectShyftUnknownConversationLauncherTarget,
  loadConnectShyftConversationLauncherRecents,
  rememberConnectShyftConversationLauncherRecent,
} from '../conversationLauncher';

const buildTarget = () => ({
  targetId: 'neighbor-1001:+13175550100',
  neighborId: 'neighbor-1001',
  phone: '+13175550100',
  displayPhone: '(317) 555-0100',
  displayName: 'Jordan Lee',
  detailLabel: 'Mobile · (317) 555-0100',
  searchText: 'jordan lee mobile (317) 555-0100',
});

const buildMockLocalStorage = () => {
  const storage = new Map<string, string>();

  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
  };
};

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: buildMockLocalStorage(),
    configurable: true,
  });
});

afterEach(() => {
  window.localStorage.clear();
});

describe('connectshyft conversation launcher helpers', () => {
  it('stores recent contacts only within the current user and workspace scope', () => {
    const userAKey = buildConnectShyftConversationLauncherRecentsStorageKey({
      actorUserId: 'user-a',
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
    });
    const userBKey = buildConnectShyftConversationLauncherRecentsStorageKey({
      actorUserId: 'user-b',
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
    });

    rememberConnectShyftConversationLauncherRecent(userAKey, buildTarget());

    expect(loadConnectShyftConversationLauncherRecents(userAKey)).toHaveLength(1);
    expect(loadConnectShyftConversationLauncherRecents(userBKey)).toEqual([]);
  });

  it('builds a plain-language unknown number target from a valid phone number', () => {
    expect(buildConnectShyftUnknownConversationLauncherTarget('3175550102')).toEqual({
      targetId: 'unknown:+13175550102',
      neighborId: null,
      phone: '+13175550102',
      displayPhone: '(317) 555-0102',
      displayName: '(317) 555-0102',
      detailLabel: 'New phone number',
      searchText: '(317) 555-0102 +13175550102 3175550102 new phone number',
    });
  });
});
