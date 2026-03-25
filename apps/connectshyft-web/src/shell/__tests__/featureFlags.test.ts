import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHELL_MODULE_AVAILABILITY,
  isShellModuleAvailable,
  resolveShellModuleAvailability,
} from '../featureFlags';

describe('featureFlags', () => {
  it('defaults the shell to People when no orgUnit context is loaded yet', () => {
    expect(DEFAULT_SHELL_MODULE_AVAILABILITY).toEqual({
      people: true,
      connect: false,
      settings: false,
    });
  });

  it('resolves module visibility from the active orgUnit', () => {
    const availability = resolveShellModuleAvailability([
      {
        id: 'org-east',
        label: 'East Campus',
        availableModules: {
          people: true,
          connect: true,
          settings: true,
        },
      },
      {
        id: 'org-west',
        label: 'West Campus',
        availableModules: {
          people: true,
          connect: false,
          settings: false,
        },
      },
    ], 'org-west');

    expect(isShellModuleAvailable(availability, 'people')).toBe(true);
    expect(isShellModuleAvailable(availability, 'connect')).toBe(false);
    expect(isShellModuleAvailable(availability, 'settings')).toBe(false);
  });
});
