import { test as base } from '@playwright/test';
import {
  createStory14BusinessRefusalProbe,
  createStory14SharedEnvelopeHeaders,
  createStory14SystemErrorProbe,
} from '../factories/sharedResponseEnvelopeStory14Factory';

type Story14Fixtures = {
  story14SharedEnvelopeHeaders: ReturnType<typeof createStory14SharedEnvelopeHeaders>;
  story14BusinessRefusalProbe: ReturnType<typeof createStory14BusinessRefusalProbe>;
  story14SystemErrorProbe: ReturnType<typeof createStory14SystemErrorProbe>;
};

export const test = base.extend<Story14Fixtures>({
  story14SharedEnvelopeHeaders: async ({}, use) => {
    await use(createStory14SharedEnvelopeHeaders());
  },
  story14BusinessRefusalProbe: async ({}, use) => {
    await use(createStory14BusinessRefusalProbe());
  },
  story14SystemErrorProbe: async ({}, use) => {
    await use(createStory14SystemErrorProbe());
  },
});

export { expect } from '@playwright/test';
