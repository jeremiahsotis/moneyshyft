import type { APIResponse, Page } from '@playwright/test';

export const waitForOkJson = async (page: Page, urlPart: string): Promise<APIResponse> =>
  page.waitForResponse((response) => response.url().includes(urlPart) && response.ok());
