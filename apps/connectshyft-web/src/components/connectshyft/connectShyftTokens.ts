export const CONNECTSHYFT_TOKEN_GROUPS = [
  'color',
  'typography',
  'spacing',
  'radius',
  'shadow',
  'breakpoint',
] as const;

export const CONNECTSHYFT_REQUIRED_CSS_VARIABLES = [
  '--cs-color-canvas',
  '--cs-color-surface',
  '--cs-color-surface-strong',
  '--cs-color-text-primary',
  '--cs-color-text-secondary',
  '--cs-color-border',
  '--cs-color-accent',
  '--cs-type-body-md',
  '--cs-type-heading-xl',
  '--cs-type-heading-md',
  '--cs-space-4',
  '--cs-space-5',
  '--cs-space-8',
  '--cs-radius-card',
  '--cs-radius-panel',
  '--cs-shadow-soft',
  '--cs-shadow-card',
  '--cs-breakpoint-mobile',
  '--cs-breakpoint-tablet',
  '--cs-breakpoint-desktop',
] as const;

export const CONNECTSHYFT_RESPONSIVE_BREAKPOINTS = {
  mobile: 390,
  tablet: 834,
  desktop: 1280,
} as const;

export const CONNECTSHYFT_READABILITY_CONTRACT = {
  minBodyTextPx: 16,
  minTapTargetPx: 44,
} as const;

/**
 * Usage guidance:
 * - Use these tokens (or the exported uiContracts wrappers) instead of ad hoc values in views.
 * - Keep volunteer-facing components aligned to this contract so inbox/mine/thread remain consistent.
 */
export const CONNECTSHYFT_DESIGN_TOKENS = {
  groups: CONNECTSHYFT_TOKEN_GROUPS,
  requiredCssVariables: CONNECTSHYFT_REQUIRED_CSS_VARIABLES,
  color: {
    canvas: 'var(--cs-color-canvas)',
    surface: 'var(--cs-color-surface)',
    surfaceSubtle: 'var(--cs-color-surface-subtle)',
    surfaceStrong: 'var(--cs-color-surface-strong)',
    border: 'var(--cs-color-border)',
    textPrimary: 'var(--cs-color-text-primary)',
    textSecondary: 'var(--cs-color-text-secondary)',
    accent: 'var(--cs-color-accent)',
    accentUrgency: 'var(--cs-color-accent-urgency)',
    accentContext: 'var(--cs-color-accent-context)',
  },
  typography: {
    headingXl: 'var(--cs-type-heading-xl)',
    headingLg: 'var(--cs-type-heading-lg)',
    headingMd: 'var(--cs-type-heading-md)',
    bodyMd: 'var(--cs-type-body-md)',
    bodySm: 'var(--cs-type-body-sm)',
    labelSm: 'var(--cs-type-label-sm)',
  },
  spacing: {
    1: 'var(--cs-space-1)',
    2: 'var(--cs-space-2)',
    3: 'var(--cs-space-3)',
    4: 'var(--cs-space-4)',
    5: 'var(--cs-space-5)',
    6: 'var(--cs-space-6)',
    8: 'var(--cs-space-8)',
  },
  radius: {
    chip: 'var(--cs-radius-chip)',
    card: 'var(--cs-radius-card)',
    panel: 'var(--cs-radius-panel)',
  },
  shadow: {
    soft: 'var(--cs-shadow-soft)',
    card: 'var(--cs-shadow-card)',
  },
  breakpoints: CONNECTSHYFT_RESPONSIVE_BREAKPOINTS,
} as const;
