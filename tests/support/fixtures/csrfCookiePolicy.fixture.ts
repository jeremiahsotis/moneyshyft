import { test as base } from '@playwright/test';
import {
  createCookiePolicyProbe,
  createCsrfGuardRequest,
  createParentDomainHosts,
  type CookiePolicyProbe,
  type CsrfGuardRequest,
  type ParentDomainHosts,
} from '../factories/csrfCookiePolicyFactory';

type CsrfCookiePolicyFixtures = {
  csrfGuardRequest: CsrfGuardRequest;
  csrfGuardRequestWithoutToken: CsrfGuardRequest;
  cookiePolicyProbe: CookiePolicyProbe;
  parentDomainHosts: ParentDomainHosts;
};

export const test = base.extend<CsrfCookiePolicyFixtures>({
  csrfGuardRequest: async ({}, use) => {
    await use(createCsrfGuardRequest());
  },
  csrfGuardRequestWithoutToken: async ({}, use) => {
    await use(createCsrfGuardRequest({ includeCsrfHeader: false }));
  },
  cookiePolicyProbe: async ({}, use) => {
    await use(createCookiePolicyProbe({ environment: 'production' }));
  },
  parentDomainHosts: async ({}, use) => {
    await use(createParentDomainHosts());
  },
});

export { expect } from '@playwright/test';
