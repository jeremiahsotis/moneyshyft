import { test as base } from '@playwright/test';
import {
  createBusinessRefusalProbe,
  createSharedEnvelopeHeaders,
  createSharedEnvelopeSuccessProbe,
} from '../factories/sharedApiEnvelopeFactory';

type SharedApiEnvelopeFixtures = {
  sharedEnvelopeHeaders: ReturnType<typeof createSharedEnvelopeHeaders>;
  sharedSuccessProbe: ReturnType<typeof createSharedEnvelopeSuccessProbe>;
  businessRefusalProbe: ReturnType<typeof createBusinessRefusalProbe>;
};

export const test = base.extend<SharedApiEnvelopeFixtures>({
  sharedEnvelopeHeaders: async ({}, use) => {
    await use(createSharedEnvelopeHeaders());
  },
  sharedSuccessProbe: async ({}, use) => {
    await use(createSharedEnvelopeSuccessProbe());
  },
  businessRefusalProbe: async ({}, use) => {
    await use(createBusinessRefusalProbe());
  },
});

export { expect } from '@playwright/test';
