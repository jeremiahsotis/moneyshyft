import { expect, type Page } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  buildStoryG2SurfaceUrl,
  STORY_G2_UUID_PATTERN,
} from '../../helpers/connectShyftStoryG2';
import { createStoryG2Context, type StoryG2Context } from '../../support/factories/connectShyftStoryG2Factory';

export { expect, STORY_G2_UUID_PATTERN, buildStoryG2SurfaceUrl, createStoryG2Context, login };
export type { StoryG2Context };

export const openStoryG2Surface = async (input: {
  page: Page;
  context: StoryG2Context;
  bucket: 'inbox' | 'mine';
  queueSearch?: string;
}): Promise<void> => {
  await login(input.page);
  await input.page.goto(
    buildStoryG2SurfaceUrl(input.context, {
      bucket: input.bucket,
      actorUserId: input.context.userId,
      tenantRole: 'ORGUNIT_MEMBER',
      queueSearch: input.queueSearch,
    }),
  );
  await expect(input.page.getByTestId('connectshyft-inbox-surface')).toBeVisible();
};

export const getLoweredSurfaceCopy = async (page: Page): Promise<string> => {
  const surfaceCopy = (await page.getByTestId('connectshyft-inbox-surface').textContent()) ?? '';
  return surfaceCopy.toLowerCase();
};
