import type { ConnectShyftNeighbor } from './neighbors';

const REMOVABLE_PHONE_CHARS_PATTERN = /[\s().-]/g;
const TEN_DIGIT_PATTERN = /^\d{10}$/;
const ELEVEN_DIGIT_US_PATTERN = /^1\d{10}$/;
const MAX_RECENT_CONTACTS = 6;

type ConnectShyftConversationLauncherStorage = Pick<Storage, 'getItem' | 'setItem'>;

export type ConnectShyftConversationLauncherTarget = {
  targetId: string;
  neighborId: string | null;
  phone: string;
  displayPhone: string;
  displayName: string;
  detailLabel: string;
  searchText: string;
};

export type ConnectShyftConversationLauncherRecentContact = {
  neighborId: string | null;
  phone: string;
  displayName: string;
  detailLabel: string;
  usedAtUtc: string;
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const resolveConnectShyftConversationLauncherStorage =
(): ConnectShyftConversationLauncherStorage | null => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  if (
    typeof window.localStorage.getItem !== 'function'
    || typeof window.localStorage.setItem !== 'function'
  ) {
    return null;
  }

  return window.localStorage;
};

const formatUsPhone = (nationalNumber: string): string => {
  return `(${nationalNumber.slice(0, 3)}) ${nationalNumber.slice(3, 6)}-${nationalNumber.slice(6)}`;
};

export const normalizeConnectShyftConversationLauncherPhone = (
  value: string,
): {
  normalizedPhone: string | null;
  displayPhone: string;
  digitSearchValue: string;
} => {
  const trimmed = normalizeString(value);
  const compact = trimmed.replace(REMOVABLE_PHONE_CHARS_PATTERN, '');
  const digitsOnly = compact.replace(/\D/g, '');

  if (!trimmed || !compact) {
    return {
      normalizedPhone: null,
      displayPhone: '',
      digitSearchValue: '',
    };
  }

  if (compact.startsWith('+1') && compact.length === 12 && /^\+\d+$/.test(compact)) {
    const nationalNumber = compact.slice(2);
    return {
      normalizedPhone: compact,
      displayPhone: formatUsPhone(nationalNumber),
      digitSearchValue: nationalNumber,
    };
  }

  if (TEN_DIGIT_PATTERN.test(digitsOnly)) {
    return {
      normalizedPhone: `+1${digitsOnly}`,
      displayPhone: formatUsPhone(digitsOnly),
      digitSearchValue: digitsOnly,
    };
  }

  if (ELEVEN_DIGIT_US_PATTERN.test(digitsOnly)) {
    const nationalNumber = digitsOnly.slice(1);
    return {
      normalizedPhone: `+1${nationalNumber}`,
      displayPhone: formatUsPhone(nationalNumber),
      digitSearchValue: nationalNumber,
    };
  }

  return {
    normalizedPhone: null,
    displayPhone: trimmed,
    digitSearchValue: digitsOnly,
  };
};

const buildNeighborName = (neighbor: ConnectShyftNeighbor): string => {
  const fullName = `${normalizeString(neighbor.firstName)} ${normalizeString(neighbor.lastName)}`.trim();
  return fullName || 'Neighbor';
};

export const buildConnectShyftConversationLauncherTargets = (
  neighbors: ConnectShyftNeighbor[],
): ConnectShyftConversationLauncherTarget[] => {
  const seenTargetIds = new Set<string>();

  return neighbors
    .flatMap((neighbor) => {
      const neighborName = buildNeighborName(neighbor);
      return neighbor.phones.map((phone) => {
        const normalized = normalizeConnectShyftConversationLauncherPhone(phone.value);
        const resolvedPhone = normalized.normalizedPhone || normalizeString(phone.value);
        const displayPhone = normalized.displayPhone || normalizeString(phone.value);
        const targetId = `${neighbor.neighborId}:${resolvedPhone}`;
        const label = normalizeString(phone.label) || 'Phone';

        return {
          targetId,
          neighborId: neighbor.neighborId,
          phone: resolvedPhone,
          displayPhone,
          displayName: neighborName,
          detailLabel: `${label} · ${displayPhone}`,
          searchText: [
            neighborName,
            label,
            displayPhone,
            resolvedPhone,
            normalized.digitSearchValue,
          ]
            .filter((entry) => entry.length > 0)
            .join(' ')
            .toLowerCase(),
          isPrimary: phone.isPrimary === true,
        };
      });
    })
    .filter((target) => {
      if (seenTargetIds.has(target.targetId)) {
        return false;
      }

      seenTargetIds.add(target.targetId);
      return target.phone.length > 0;
    })
    .sort((left, right) => {
      if (left.displayName !== right.displayName) {
        return left.displayName.localeCompare(right.displayName);
      }

      if (left.isPrimary !== right.isPrimary) {
        return left.isPrimary ? -1 : 1;
      }

      return left.detailLabel.localeCompare(right.detailLabel);
    })
    .map(({ isPrimary: _isPrimary, ...target }) => target);
};

export const buildConnectShyftUnknownConversationLauncherTarget = (
  rawPhone: string,
): ConnectShyftConversationLauncherTarget | null => {
  const normalized = normalizeConnectShyftConversationLauncherPhone(rawPhone);
  if (!normalized.normalizedPhone) {
    return null;
  }

  return {
    targetId: `unknown:${normalized.normalizedPhone}`,
    neighborId: null,
    phone: normalized.normalizedPhone,
    displayPhone: normalized.displayPhone,
    displayName: normalized.displayPhone,
    detailLabel: 'New phone number',
    searchText: [
      normalized.displayPhone,
      normalized.normalizedPhone,
      normalized.digitSearchValue,
      'new phone number',
    ]
      .filter((entry) => entry.length > 0)
      .join(' ')
      .toLowerCase(),
  };
};

export const filterConnectShyftConversationLauncherTargets = (input: {
  targets: ConnectShyftConversationLauncherTarget[];
  query: string;
  limit?: number;
}): ConnectShyftConversationLauncherTarget[] => {
  const normalizedQuery = normalizeString(input.query).toLowerCase();
  const digitSearchValue = normalizeConnectShyftConversationLauncherPhone(input.query).digitSearchValue;
  const limit = input.limit ?? 8;

  if (!normalizedQuery) {
    return input.targets.slice(0, limit);
  }

  return input.targets
    .filter((target) => {
      if (target.searchText.includes(normalizedQuery)) {
        return true;
      }

      return digitSearchValue.length > 0 && target.searchText.includes(digitSearchValue);
    })
    .slice(0, limit);
};

export const resolveConnectShyftConversationLauncherPreset = (input: {
  neighbor: ConnectShyftNeighbor;
  targets: ConnectShyftConversationLauncherTarget[];
}): {
  selectedTarget: ConnectShyftConversationLauncherTarget | null;
  query: string;
} => {
  const matchingTargets = input.targets.filter((target) => target.neighborId === input.neighbor.neighborId);
  if (matchingTargets.length === 1) {
    return {
      selectedTarget: matchingTargets[0] || null,
      query: '',
    };
  }

  return {
    selectedTarget: null,
    query: buildNeighborName(input.neighbor),
  };
};

export const buildConnectShyftConversationLauncherRecentsStorageKey = (input: {
  actorUserId: string | null;
  tenantId: string | null;
  orgUnitId: string | null;
}): string | null => {
  const actorUserId = normalizeString(input.actorUserId);
  const tenantId = normalizeString(input.tenantId);
  const orgUnitId = normalizeString(input.orgUnitId);
  if (!actorUserId || !tenantId || !orgUnitId) {
    return null;
  }

  return `connectshyft:conversation-launcher:${actorUserId}:${tenantId}:${orgUnitId}`;
};

export const loadConnectShyftConversationLauncherRecents = (
  storageKey: string | null,
): ConnectShyftConversationLauncherRecentContact[] => {
  const storage = resolveConnectShyftConversationLauncherStorage();
  if (!storageKey || !storage) {
    return [];
  }

  try {
    const rawValue = storage.getItem(storageKey);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }

        const candidate = entry as Partial<ConnectShyftConversationLauncherRecentContact>;
        const phone = normalizeString(candidate.phone);
        if (!phone) {
          return null;
        }

        return {
          neighborId: normalizeString(candidate.neighborId) || null,
          phone,
          displayName: normalizeString(candidate.displayName) || phone,
          detailLabel: normalizeString(candidate.detailLabel) || phone,
          usedAtUtc: normalizeString(candidate.usedAtUtc) || new Date(0).toISOString(),
        };
      })
      .filter((entry): entry is ConnectShyftConversationLauncherRecentContact => entry !== null)
      .sort((left, right) => right.usedAtUtc.localeCompare(left.usedAtUtc))
      .slice(0, MAX_RECENT_CONTACTS);
  } catch (_error) {
    return [];
  }
};

export const rememberConnectShyftConversationLauncherRecent = (
  storageKey: string | null,
  target: ConnectShyftConversationLauncherTarget,
): ConnectShyftConversationLauncherRecentContact[] => {
  const nextRecentContacts = [
    {
      neighborId: target.neighborId,
      phone: target.phone,
      displayName: target.displayName,
      detailLabel: target.detailLabel,
      usedAtUtc: new Date().toISOString(),
    },
    ...loadConnectShyftConversationLauncherRecents(storageKey).filter((entry) =>
      !(entry.phone === target.phone && entry.neighborId === target.neighborId)),
  ].slice(0, MAX_RECENT_CONTACTS);

  const storage = resolveConnectShyftConversationLauncherStorage();
  if (storageKey && storage) {
    storage.setItem(storageKey, JSON.stringify(nextRecentContacts));
  }

  return nextRecentContacts;
};

export const resolveConnectShyftConversationLauncherRecentTargets = (input: {
  recentContacts: ConnectShyftConversationLauncherRecentContact[];
  targets: ConnectShyftConversationLauncherTarget[];
}): ConnectShyftConversationLauncherTarget[] => {
  const availableTargets = new Map(
    input.targets.map((target) => [`${target.neighborId || 'unknown'}:${target.phone}`, target]),
  );
  const seenTargetIds = new Set<string>();

  return input.recentContacts
    .map((recentContact) => {
      const resolvedTarget = availableTargets.get(
        `${recentContact.neighborId || 'unknown'}:${recentContact.phone}`,
      );
      if (resolvedTarget) {
        return resolvedTarget;
      }

      return {
        targetId: `recent:${recentContact.neighborId || 'unknown'}:${recentContact.phone}`,
        neighborId: recentContact.neighborId,
        phone: recentContact.phone,
        displayPhone: normalizeConnectShyftConversationLauncherPhone(recentContact.phone).displayPhone
          || recentContact.phone,
        displayName: recentContact.displayName,
        detailLabel: recentContact.detailLabel,
        searchText: [
          recentContact.displayName,
          recentContact.detailLabel,
          recentContact.phone,
        ]
          .filter((entry) => entry.length > 0)
          .join(' ')
          .toLowerCase(),
      } satisfies ConnectShyftConversationLauncherTarget;
    })
    .filter((target) => {
      if (seenTargetIds.has(target.targetId)) {
        return false;
      }

      seenTargetIds.add(target.targetId);
      return true;
    });
};
