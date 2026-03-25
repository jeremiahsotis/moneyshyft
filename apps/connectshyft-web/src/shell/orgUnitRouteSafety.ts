import type {
  ConnectShyftShellOrgUnitOption,
  SubjectContext,
  ShyftUnityShellModuleKey,
} from '@shyft/contracts';
import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { SHELL_ROUTE_PATHS } from './routes';
import { subjectContextHasActiveSubject } from './subjectContext';

type ShellOrgUnitFallbackScope = 'people' | 'communication' | 'shell';

export type ShellOrgUnitSwitchEvaluation =
  | {
    kind: 'safe';
    targetOrgUnit: ConnectShyftShellOrgUnitOption;
    requiredModule: ShyftUnityShellModuleKey;
  }
  | {
    kind: 'destructive';
    targetOrgUnit: ConnectShyftShellOrgUnitOption;
    requiredModule: ShyftUnityShellModuleKey;
    redirectPath: string;
  };

export const resolveShellRouteRequiredModule = (
  route: RouteLocationNormalizedLoaded,
): ShyftUnityShellModuleKey => {
  const resolvedModule = [...route.matched]
    .reverse()
    .find((record) => typeof record.meta.shellModule === 'string')
    ?.meta.shellModule;

  if (resolvedModule === 'connect' || resolvedModule === 'settings') {
    return resolvedModule;
  }

  return 'people';
};

const resolveFallbackScope = (
  route: RouteLocationNormalizedLoaded,
  requiredModule: ShyftUnityShellModuleKey,
): ShellOrgUnitFallbackScope => {
  const matchedScope = [...route.matched]
    .reverse()
    .find((record) => typeof record.meta.shellOrgUnitFallback === 'string')
    ?.meta.shellOrgUnitFallback;

  if (
    matchedScope === 'people'
    || matchedScope === 'communication'
    || matchedScope === 'shell'
  ) {
    return matchedScope;
  }

  if (requiredModule === 'connect') {
    return 'communication';
  }

  if (requiredModule === 'settings') {
    return 'shell';
  }

  return 'people';
};

const resolveSwitchMode = (route: RouteLocationNormalizedLoaded): 'safe' | 'destructive' => {
  const explicitMode = [...route.matched]
    .reverse()
    .find((record) => typeof record.meta.shellOrgUnitSwitchMode === 'string')
    ?.meta.shellOrgUnitSwitchMode;

  return explicitMode === 'destructive' ? 'destructive' : 'safe';
};

export const shellRouteModuleRemainsAvailable = (
  targetOrgUnit: ConnectShyftShellOrgUnitOption,
  requiredModule: ShyftUnityShellModuleKey,
): boolean => targetOrgUnit.availableModules[requiredModule] === true;

export const shellSubjectContextRemainsValid = (
  subjectContext: SubjectContext,
  targetOrgUnit: ConnectShyftShellOrgUnitOption,
): boolean => (
  !subjectContextHasActiveSubject(subjectContext)
  || subjectContext.orgUnitId === targetOrgUnit.id
);

export const isShellRouteCompatibleWithOrgUnit = (input: {
  route: RouteLocationNormalizedLoaded;
  subjectContext: SubjectContext;
  targetOrgUnit: ConnectShyftShellOrgUnitOption;
}): boolean => {
  const requiredModule = resolveShellRouteRequiredModule(input.route);
  return (
    shellRouteModuleRemainsAvailable(input.targetOrgUnit, requiredModule)
    && shellSubjectContextRemainsValid(input.subjectContext, input.targetOrgUnit)
  );
};

const resolveNearestValidLanding = (
  scope: ShellOrgUnitFallbackScope,
  targetOrgUnit: ConnectShyftShellOrgUnitOption,
): string => {
  if (scope === 'communication' && targetOrgUnit.availableModules.connect) {
    return SHELL_ROUTE_PATHS.connect;
  }

  return SHELL_ROUTE_PATHS.people;
};

export const evaluateShellOrgUnitSwitch = (input: {
  route: RouteLocationNormalizedLoaded;
  subjectContext: SubjectContext;
  targetOrgUnit: ConnectShyftShellOrgUnitOption;
}): ShellOrgUnitSwitchEvaluation => {
  const requiredModule = resolveShellRouteRequiredModule(input.route);
  const switchMode = resolveSwitchMode(input.route);
  const fallbackScope = resolveFallbackScope(input.route, requiredModule);
  const canPreserveRoute =
    switchMode === 'safe'
    && shellRouteModuleRemainsAvailable(input.targetOrgUnit, requiredModule)
    && shellSubjectContextRemainsValid(input.subjectContext, input.targetOrgUnit);

  if (canPreserveRoute) {
    return {
      kind: 'safe',
      targetOrgUnit: input.targetOrgUnit,
      requiredModule,
    };
  }

  return {
    kind: 'destructive',
    targetOrgUnit: input.targetOrgUnit,
    requiredModule,
    redirectPath: resolveNearestValidLanding(fallbackScope, input.targetOrgUnit),
  };
};
