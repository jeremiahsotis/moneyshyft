import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { describe, expect, it } from 'vitest';
import { evaluateShellOrgUnitSwitch, isShellRouteCompatibleWithOrgUnit } from '../orgUnitRouteSafety';

const buildRoute = (input: {
  path: string;
  matched: Array<{
    shellModule?: 'people' | 'connect' | 'settings';
    shellOrgUnitFallback?: 'people' | 'communication' | 'shell';
    shellOrgUnitSwitchMode?: 'safe' | 'destructive';
  }>;
}): RouteLocationNormalizedLoaded => ({
  path: input.path,
  fullPath: input.path,
  name: null,
  params: {},
  query: {},
  hash: '',
  matched: input.matched.map((meta) => ({ meta })),
  redirectedFrom: undefined,
  meta: {},
  href: input.path,
} as unknown as RouteLocationNormalizedLoaded);

const eastOrgUnit = {
  id: 'org-east',
  label: 'East Campus',
  availableModules: {
    people: true,
    connect: true,
    settings: true,
  },
};

const westOrgUnit = {
  id: 'org-west',
  label: 'West Campus',
  availableModules: {
    people: true,
    connect: true,
    settings: true,
  },
};

describe('orgUnit route safety', () => {
  it('treats a module-safe route without an active subject as a safe switch', () => {
    const route = buildRoute({
      path: '/people',
      matched: [
        {
          shellModule: 'people',
          shellOrgUnitFallback: 'people',
        },
      ],
    });

    expect(evaluateShellOrgUnitSwitch({
      route,
      subjectContext: {
        orgUnitId: 'org-east',
      },
      targetOrgUnit: westOrgUnit,
    })).toEqual({
      kind: 'safe',
      requiredModule: 'people',
      targetOrgUnit: westOrgUnit,
    });
  });

  it('requires confirmation when the current route carries conversation context', () => {
    const route = buildRoute({
      path: '/connect/threads/thread-1',
      matched: [
        {
          shellModule: 'connect',
          shellOrgUnitFallback: 'communication',
        },
        {
          shellOrgUnitSwitchMode: 'destructive',
        },
      ],
    });

    expect(evaluateShellOrgUnitSwitch({
      route,
      subjectContext: {
        orgUnitId: 'org-east',
        conversationId: 'conversation-1',
      },
      targetOrgUnit: westOrgUnit,
    })).toEqual({
      kind: 'destructive',
      requiredModule: 'connect',
      redirectPath: '/connect',
      targetOrgUnit: westOrgUnit,
    });
  });

  it('redirects to People when the current module is unavailable in the target orgUnit', () => {
    const route = buildRoute({
      path: '/connect/directory',
      matched: [
        {
          shellModule: 'connect',
          shellOrgUnitFallback: 'communication',
        },
      ],
    });

    expect(evaluateShellOrgUnitSwitch({
      route,
      subjectContext: {
        orgUnitId: 'org-east',
      },
      targetOrgUnit: {
        ...westOrgUnit,
        availableModules: {
          people: true,
          connect: false,
          settings: false,
        },
      },
    })).toEqual({
      kind: 'destructive',
      requiredModule: 'connect',
      redirectPath: '/people',
      targetOrgUnit: {
        ...westOrgUnit,
        availableModules: {
          people: true,
          connect: false,
          settings: false,
        },
      },
    });
  });

  it('keeps a thread route valid when the current orgUnit and subject still match', () => {
    const route = buildRoute({
      path: '/connect/threads/thread-1',
      matched: [
        {
          shellModule: 'connect',
          shellOrgUnitFallback: 'communication',
        },
        {
          shellOrgUnitSwitchMode: 'destructive',
        },
      ],
    });

    expect(isShellRouteCompatibleWithOrgUnit({
      route,
      subjectContext: {
        orgUnitId: 'org-east',
        conversationId: 'conversation-1',
      },
      targetOrgUnit: eastOrgUnit,
    })).toBe(true);
  });
});
