export const routeShyftStory21AtddData = {
  storyId: '2-1',
  tenantId: 'tenant-routeshyft-alpha',
  orgUnitId: 'org-routeshyft-alpha-dispatch',
  commitmentId: 'commitment-atdd-21',
  validTransition: {
    from: 'draft',
    to: 'scheduled',
  },
  invalidTransition: {
    from: 'draft',
    to: 'completed',
  },
  terminalStatus: 'completed',
  requiredTestIds: [
    'routeshyft-commitment-status-badge',
    'routeshyft-commitment-transition-select',
    'routeshyft-commitment-transition-submit',
    'routeshyft-commitment-refusal-banner',
    'routeshyft-commitment-refusal-code',
    'routeshyft-commitment-refusal-details',
  ],
} as const;
