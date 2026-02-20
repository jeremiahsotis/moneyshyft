import { test as base } from '@playwright/test';
import {
  createPolicyWorkflowGuardStory15Context,
  type PolicyWorkflowGuardStory15Context,
} from '../factories/policyWorkflowGuardStory15Factory';

type PolicyWorkflowGuardStory15Fixtures = {
  story15Context: PolicyWorkflowGuardStory15Context;
};

export const test = base.extend<PolicyWorkflowGuardStory15Fixtures>({
  story15Context: async ({}, use) => {
    await use(createPolicyWorkflowGuardStory15Context());
  },
});

export { expect } from '@playwright/test';
