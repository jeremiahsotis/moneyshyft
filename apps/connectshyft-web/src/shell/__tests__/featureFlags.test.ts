import { describe, expect, it } from 'vitest';
import { defaultFeatureFlags, isFeatureEnabled } from '../featureFlags';

describe('featureFlags', () => {
  it('returns true for enabled default flags', () => {
    expect(isFeatureEnabled(defaultFeatureFlags, 'people.enabled')).toBe(true);
    expect(isFeatureEnabled(defaultFeatureFlags, 'people.identityDecision.enabled')).toBe(true);
    expect(isFeatureEnabled(defaultFeatureFlags, 'people.disabled')).toBe(false);
  });
});
