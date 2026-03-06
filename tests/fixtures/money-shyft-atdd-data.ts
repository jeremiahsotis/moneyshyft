export const moneyShyftStory21AtddData = {
  storyId: '2-1',
  tenantId: 'tenant-moneyshyft-alpha',
  orgUnitId: 'org-moneyshyft-alpha-dispatch',
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
    'moneyshyft-commitment-status-badge',
    'moneyshyft-commitment-transition-select',
    'moneyshyft-commitment-transition-submit',
    'moneyshyft-commitment-refusal-banner',
    'moneyshyft-commitment-refusal-code',
    'moneyshyft-commitment-refusal-details',
  ],
} as const;
