import type {
  ConnectShyftShellModuleAvailability,
  ConnectShyftShellOrgUnitOption,
  ShyftUnityShellModuleKey,
} from '@shyft/contracts';

export const DEFAULT_SHELL_MODULE_AVAILABILITY: ConnectShyftShellModuleAvailability = {
  people: true,
  connect: false,
  settings: false,
};

export const normalizeShellModuleAvailability = (
  value: Partial<ConnectShyftShellModuleAvailability> | null | undefined,
): ConnectShyftShellModuleAvailability => ({
  people: value?.people !== false,
  connect: value?.connect === true,
  settings: value?.settings === true,
});

export const resolveShellModuleAvailability = (
  orgUnits: readonly ConnectShyftShellOrgUnitOption[],
  currentOrgUnitId: string,
): ConnectShyftShellModuleAvailability => {
  if (!currentOrgUnitId) {
    return DEFAULT_SHELL_MODULE_AVAILABILITY;
  }

  const matchedOrgUnit = orgUnits.find((orgUnit) => orgUnit.id === currentOrgUnitId);
  return normalizeShellModuleAvailability(matchedOrgUnit?.availableModules);
};

export const isShellModuleAvailable = (
  availability: ConnectShyftShellModuleAvailability,
  module: ShyftUnityShellModuleKey,
): boolean => availability[module] === true;
