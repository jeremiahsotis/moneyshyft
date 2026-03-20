import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import {
  enforceConnectShyftCapability,
  requestHasAnyCapability,
  resolveConnectShyftRouteContextDecision,
  sendConnectShyftRouteRefusal,
} from '../http/accessContext';
import type { ResolvedConnectShyftContext } from '../contextAccess';

type ConnectShyftSettingsNavigationOption = {
  key: string;
  label: string;
  path: string;
};

const CONNECTSHYFT_SETTINGS_PRIMARY_OPTIONS: readonly ConnectShyftSettingsNavigationOption[] = [
  {
    key: 'directory',
    label: 'Directory',
    path: '/app/connectshyft/directory',
  },
  {
    key: 'settings',
    label: 'Settings',
    path: '/app/connectshyft/settings',
  },
  {
    key: 'notification-preferences',
    label: 'Notification Preferences',
    path: '/app/connectshyft/settings',
  },
  {
    key: 'display-preferences',
    label: 'Display Preferences',
    path: '/app/connectshyft/settings',
  },
  {
    key: 'sign-out',
    label: 'Sign Out',
    path: '/login',
  },
];

const CONNECTSHYFT_SETTINGS_ADMIN_OPTIONS: readonly ConnectShyftSettingsNavigationOption[] = [
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
  {
    key: 'escalation-configuration',
    label: 'Escalation Settings',
    path: '/app/connectshyft/settings/escalation',
  },
];

const buildConnectShyftSettingsNavigationPathways = (adminAccess: boolean) => {
  return [
    ...CONNECTSHYFT_SETTINGS_PRIMARY_OPTIONS.map((option) => ({
      path: option.path,
      allowed: true,
    })),
    ...CONNECTSHYFT_SETTINGS_ADMIN_OPTIONS.map((option) => ({
      path: option.path,
      allowed: adminAccess,
    })),
  ];
};

const canAccessConnectShyftAdminSettingsByCapability = (
  req: Request,
  context?: Pick<ResolvedConnectShyftContext, 'effectiveRoles'> | null,
): boolean => requestHasAnyCapability(req, [
  CAPABILITIES.NUMBER_MAPPING_MANAGE,
  CAPABILITIES.ORG_UNIT_ESCALATION_CONFIG,
  CAPABILITIES.MODULE_ENTITLEMENT_MANAGE,
  CAPABILITIES.TENANT_ROLE_ASSIGN,
  CAPABILITIES.ORG_UNIT_ADMIN_ASSIGN,
], context);

const canAccessConnectShyftSettingsNavigation = (
  req: Request,
  context?: Pick<ResolvedConnectShyftContext, 'effectiveRoles'> | null,
): boolean => requestHasAnyCapability(req, [
  CAPABILITIES.ORG_UNIT_THREAD_VIEW,
  CAPABILITIES.THREAD_VIEW_ALL,
  CAPABILITIES.ORG_UNIT_NEIGHBOR_EDIT_RELATED,
  CAPABILITIES.NEIGHBOR_EDIT_ALL,
  CAPABILITIES.TENANT_READ_ALL,
], context);

const sendSettingsNavigationForbidden = (res: Response) => sendConnectShyftRouteRefusal(res, {
  code: 'CONNECTSHYFT_SETTINGS_NAVIGATION_FORBIDDEN',
  message: 'Settings navigation requires an authorized role with active orgUnit access.',
  refusalType: 'business',
  httpStatus: 200,
  data: {
    primaryOptions: CONNECTSHYFT_SETTINGS_PRIMARY_OPTIONS,
    adminOptions: [],
    pathways: buildConnectShyftSettingsNavigationPathways(false),
  },
});

export const getConnectSettingsNavigation = async (req: Request, res: Response) => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return;
  }

  const contextDecision = await resolveConnectShyftRouteContextDecision(req);
  if (!contextDecision.ok) {
    sendSettingsNavigationForbidden(res);
    return;
  }

  if (!canAccessConnectShyftSettingsNavigation(req, contextDecision.context)) {
    sendSettingsNavigationForbidden(res);
    return;
  }

  const adminAccess = canAccessConnectShyftAdminSettingsByCapability(req, contextDecision.context);

  return success(res, {
    code: 'CONNECTSHYFT_SETTINGS_NAVIGATION_RESOLVED',
    message: 'ConnectShyft settings navigation resolved',
    data: {
      primaryOptions: CONNECTSHYFT_SETTINGS_PRIMARY_OPTIONS,
      adminOptions: adminAccess ? CONNECTSHYFT_SETTINGS_ADMIN_OPTIONS : [],
      pathways: buildConnectShyftSettingsNavigationPathways(adminAccess),
    },
  });
};
