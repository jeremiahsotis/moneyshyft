import { test as base } from '@playwright/test';
import { apiRequest } from '../helpers/apiClient';
import {
  createStoryC5Context,
  createStoryC5Headers,
  type StoryC5Context,
} from '../factories/connectShyftStoryC5Factory';

type StoryC5Fixtures = {
  storyC5Context: StoryC5Context;
  storyC5SchedulerHeaders: Record<string, string>;
  storyC5ClaimHeaders: Record<string, string>;
  storyC5SchedulerRunPayload: {
    tenantId: string;
    orgUnitId: string;
    asOfUtc: string;
    limit: number;
  };
  storyC5ClaimPayload: {
    orgUnitId: string;
  };
  storyC5ValidBaselinePayload: {
    orgUnitId: string;
    escalationBaselineHours: number;
    recipients: {
      primaryOrgUnitAdminUserId: string;
      secondaryOrgUnitAdminUserId: string;
      tenantStaffUserId: string;
    };
  };
  storyC5InvalidBaselinePayload: {
    orgUnitId: string;
    escalationBaselineHours: number;
    recipients: {
      primaryOrgUnitAdminUserId: string;
      secondaryOrgUnitAdminUserId: string;
      tenantStaffUserId: string;
    };
  };
};

export const test = base.extend<StoryC5Fixtures>({
  storyC5Context: async ({ request }, use) => {
    const context = createStoryC5Context();
    const resetHeaders = createStoryC5Headers(context, {
      role: 'TENANT_ADMIN',
      userId: 'user-connectshyft-c5-reset-admin',
      orgUnitMemberships: [context.orgUnitId],
    });

    await apiRequest(request, {
      method: 'POST',
      path: `/api/v1/connectshyft/threads/${context.threadId}/messages`,
      headers: resetHeaders,
      data: {
        orgUnitId: context.orgUnitId,
      },
    });

    await apiRequest(request, {
      method: 'POST',
      path: `/api/v1/connectshyft/threads/${context.threadId}/claim`,
      headers: resetHeaders,
      data: {
        orgUnitId: context.orgUnitId,
      },
    });

    await apiRequest(request, {
      method: 'POST',
      path: `/api/v1/connectshyft/threads/${context.threadId}/takeover`,
      headers: resetHeaders,
      data: {
        orgUnitId: context.orgUnitId,
      },
    });

    await apiRequest(request, {
      method: 'POST',
      path: `/api/v1/connectshyft/threads/${context.threadId}/close`,
      headers: resetHeaders,
      data: {
        orgUnitId: context.orgUnitId,
        reason: 'fixture-reset',
        resolution: 'fixture-reset',
      },
    });

    const messageResponse = await apiRequest(request, {
      method: 'POST',
      path: `/api/v1/connectshyft/threads/${context.threadId}/messages`,
      headers: resetHeaders,
      data: {
        orgUnitId: context.orgUnitId,
      },
    });

    const messageBody = (await messageResponse.json()) as {
      code?: unknown;
      message?: unknown;
      data?: {
        thread?: {
          state?: unknown;
        };
      };
    };
    if (
      messageResponse.status() !== 200
      || messageBody?.data?.thread?.state !== 'UNCLAIMED'
    ) {
      throw new Error(
        `Unable to reset story c.5 synthetic thread fixture (status=${messageResponse.status()}, code=${String(messageBody?.code ?? 'unknown')}, message=${String(messageBody?.message ?? 'unknown')}).`,
      );
    }

    await use(context);
  },
  storyC5SchedulerHeaders: async ({ storyC5Context }, use) => {
    await use(
      createStoryC5Headers(storyC5Context, {
        role: 'TENANT_STAFF',
        userId: storyC5Context.schedulerUserId,
      }),
    );
  },
  storyC5ClaimHeaders: async ({ storyC5Context }, use) => {
    await use(
      createStoryC5Headers(storyC5Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitMemberships: [storyC5Context.orgUnitId],
      }),
    );
  },
  storyC5SchedulerRunPayload: async ({ storyC5Context }, use) => {
    const asOfUtc = new Date(Date.now() + (5 * 60 * 1000)).toISOString();
    await use({
      tenantId: storyC5Context.tenantId,
      orgUnitId: storyC5Context.orgUnitId,
      asOfUtc,
      limit: 50,
    });
  },
  storyC5ClaimPayload: async ({ storyC5Context }, use) => {
    await use({
      orgUnitId: storyC5Context.orgUnitId,
    });
  },
  storyC5ValidBaselinePayload: async ({ storyC5Context }, use) => {
    await use({
      orgUnitId: storyC5Context.orgUnitId,
      escalationBaselineHours: storyC5Context.escalationBaselineHours.valid,
      recipients: {
        ...storyC5Context.recipients,
      },
    });
  },
  storyC5InvalidBaselinePayload: async ({ storyC5Context }, use) => {
    await use({
      orgUnitId: storyC5Context.orgUnitId,
      escalationBaselineHours: storyC5Context.escalationBaselineHours.invalidFractional,
      recipients: {
        ...storyC5Context.recipients,
      },
    });
  },
});

export { expect } from '@playwright/test';
