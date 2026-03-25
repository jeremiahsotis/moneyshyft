export type ShellModuleKey = 'people' | 'connect' | 'settings';

export const SHELL_CANONICAL_HOST = 'app.shyftunity.com';

export const SHELL_ROUTE_PATHS = {
  people: '/people',
  connect: '/connect',
  connectMine: '/connect/mine',
  connectDirectory: '/connect/directory',
  settings: '/settings',
  settingsAvailability: '/settings/availability',
  settingsNumbers: '/settings/numbers',
  settingsEscalation: '/settings/escalation',
  login: '/login',
  forgotPassword: '/auth/password/forgot',
  resetPassword: '/auth/password/reset',
} as const;

export const SHELL_PRIMARY_NAV_ITEMS: Array<{
  label: string;
  path: string;
  module: ShellModuleKey;
}> = [
  {
    label: 'People',
    path: SHELL_ROUTE_PATHS.people,
    module: 'people',
  },
  {
    label: 'ConnectShyft',
    path: SHELL_ROUTE_PATHS.connect,
    module: 'connect',
  },
  {
    label: 'Settings',
    path: SHELL_ROUTE_PATHS.settings,
    module: 'settings',
  },
];

export const buildConnectThreadPath = (threadId: string): string =>
  `${SHELL_ROUTE_PATHS.connect}/threads/${encodeURIComponent(threadId)}`;

export const buildConnectNeighborCreatePath = (): string =>
  `${SHELL_ROUTE_PATHS.connect}/neighbors/new`;

export const buildConnectNeighborPath = (neighborId: string): string =>
  `${SHELL_ROUTE_PATHS.connect}/neighbors/${encodeURIComponent(neighborId)}`;
