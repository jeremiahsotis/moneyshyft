export type FeatureFlagMap = Record<string, boolean>;

export const defaultFeatureFlags: FeatureFlagMap = {
  'people.enabled': true,
  'people.identityDecision.enabled': true,
};

export function isFeatureEnabled(flags: FeatureFlagMap, key: string) {
  return Boolean(flags[key]);
}
