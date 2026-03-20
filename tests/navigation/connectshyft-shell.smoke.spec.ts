import { test, expect } from '@playwright/test';

const shellRoutes = [
  ['/app/connect', 'Connect shell view coming soon'],
  ['/app/people', 'Load contact points'],
  ['/app/work', 'Work shell view coming soon'],
] as const;

test.describe('ConnectShyft shell smoke', () => {
  test('loads placeholder shell routes @P1', async ({ page }) => {
    for (const [path, text] of shellRoutes) {
      await page.goto(path);
      await expect(page.getByText(text)).toBeVisible();
    }
  });
});
