import api from '@/services/api';
import { SHELL_ROUTE_PATHS } from '@/shell/routes';
import { buildConnectShyftTestOverrideHeaders } from './flags';

type SettingsNavigationOption = {
  key?: string;
  label?: string;
  path?: string;
};

type SettingsNavigationPathway = {
  path?: string;
  allowed?: boolean;
};

type SettingsNavigationEnvelope = {
  ok?: boolean;
  message?: string;
  data?: {
    primaryOptions?: SettingsNavigationOption[];
    adminOptions?: SettingsNavigationOption[];
    pathways?: SettingsNavigationPathway[];
  };
};

export type ShellSettingsNavigationItem = {
  key: string;
  label: string;
  path: string;
};

export type ShellSettingsNavigationState = {
  items: ShellSettingsNavigationItem[];
  allowedPaths: string[];
};

const DEFAULT_SETTINGS_NAVIGATION_STATE: ShellSettingsNavigationState = {
  items: [
    {
      key: 'settings',
      label: 'Call routing',
      path: SHELL_ROUTE_PATHS.settings,
    },
  ],
  allowedPaths: [
    SHELL_ROUTE_PATHS.settings,
  ],
};

const SETTINGS_PATH_TRANSLATIONS: Record<string, string> = {
  '/app/connectshyft/settings': SHELL_ROUTE_PATHS.settings,
  '/app/connectshyft/settings/availability': SHELL_ROUTE_PATHS.settingsAvailability,
  '/app/connectshyft/settings/numbers': SHELL_ROUTE_PATHS.settingsNumbers,
  '/app/connectshyft/settings/escalation': SHELL_ROUTE_PATHS.settingsEscalation,
};

const translateLegacySettingsPath = (path: string | undefined): string | null => {
  if (!path) {
    return null;
  }

  return SETTINGS_PATH_TRANSLATIONS[path] || null;
};

const normalizeOption = (
  option: SettingsNavigationOption,
  allowedPaths: Set<string>,
): ShellSettingsNavigationItem | null => {
  if (typeof option.key !== 'string' || typeof option.label !== 'string') {
    return null;
  }

  const translatedPath = translateLegacySettingsPath(option.path);
  if (!translatedPath || !allowedPaths.has(translatedPath)) {
    return null;
  }

  return {
    key: option.key,
    label: option.label,
    path: translatedPath,
  };
};

export const fetchConnectShyftSettingsNavigation = async (): Promise<ShellSettingsNavigationItem[]> => {
  return (await fetchConnectShyftSettingsNavigationState()).items;
};

export const fetchConnectShyftSettingsNavigationState = async (): Promise<ShellSettingsNavigationState> => {
  try {
    const response = await api.get('/connectshyft/settings/navigation', {
      headers: buildConnectShyftTestOverrideHeaders(),
    });
    const envelope = response.data as SettingsNavigationEnvelope;
    const pathways = Array.isArray(envelope?.data?.pathways)
      ? envelope.data.pathways
      : [];
    const allowedPaths = new Set(
      pathways
        .filter((pathway) => pathway.allowed === true)
        .map((pathway) => translateLegacySettingsPath(pathway.path))
        .filter((path): path is string => path !== null),
    );
    const options = [
      ...(Array.isArray(envelope?.data?.primaryOptions) ? envelope.data.primaryOptions : []),
      ...(Array.isArray(envelope?.data?.adminOptions) ? envelope.data.adminOptions : []),
    ];
    const items = options
      .map((option) => normalizeOption(option, allowedPaths))
      .filter((option): option is ShellSettingsNavigationItem => option !== null);

    return {
      items: items.length > 0
        ? items
        : [...DEFAULT_SETTINGS_NAVIGATION_STATE.items],
      allowedPaths: allowedPaths.size > 0
        ? [...allowedPaths]
        : [...DEFAULT_SETTINGS_NAVIGATION_STATE.allowedPaths],
    };
  } catch (_error) {
    return {
      items: [...DEFAULT_SETTINGS_NAVIGATION_STATE.items],
      allowedPaths: [...DEFAULT_SETTINGS_NAVIGATION_STATE.allowedPaths],
    };
  }
};

export const canAccessConnectShyftSettingsPath = async (path: string): Promise<boolean> => {
  const navigationState = await fetchConnectShyftSettingsNavigationState();
  return navigationState.allowedPaths.includes(path);
};
