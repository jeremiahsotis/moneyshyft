import { faker } from '@faker-js/faker';

export const createStory13SessionData = (
  overrides: Partial<{
    tenantId: string;
    userId: string;
    refreshTokenId: string;
  }> = {},
) => ({
  tenantId: overrides.tenantId ?? 'tenant-auth-alpha',
  userId: overrides.userId ?? 'user-auth-alpha',
  refreshTokenId: overrides.refreshTokenId ??     ('refresh-' + faker.string.alphanumeric(12)),
});

export const createStory13CsrfData = (
  overrides: Partial<{ csrfToken: string }> = {},
) => ({
  csrfToken: overrides.csrfToken ?? ('csrf-' + faker.string.alphanumeric(16)),
});
