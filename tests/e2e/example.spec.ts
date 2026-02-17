import { test, expect } from '../support/fixtures';

test.describe('Framework baseline', () => {
  test('creates a factory record and loads login page @P2', async ({
    page,
    userFactory,
  }) => {
    // Given a generated user payload for test data setup
    const user = userFactory.build();

    // When loading the login screen
    await page.goto('/login');

    // Then the login form is visible and factory output is well-formed
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
    expect(user.email).toContain('@');
  });
});
