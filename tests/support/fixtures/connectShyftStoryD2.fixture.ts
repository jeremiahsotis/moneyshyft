import { test as base } from '@playwright/test';
import {
  createStoryD2Context,
  createStoryD2Headers,
  type StoryD2Context,
} from '../factories/connectShyftStoryD2Factory';
import { ensureSingleActiveConnectShyftSmsSenderMapping } from '../helpers/connectShyftNumberMappingTestHelpers';

type StoryD2Fixtures = {
  storyD2SmsSenderReady: void;
  storyD2Context: StoryD2Context;
  storyD2OperatorHeaders: Record<string, string>;
  storyD2AdminHeaders: Record<string, string>;
  storyD2ViewerHeaders: Record<string, string>;
  storyD2MessageWithoutOverridePayload: {
    orgUnitId: string;
    channel: 'sms';
    body: string;
  };
  storyD2MessageWithValidOverridePayload: {
    orgUnitId: string;
    channel: 'sms';
    body: string;
    override: {
      reasonCode: string;
      note: string;
    };
  };
  storyD2MessageWithInvalidOverridePayload: {
    orgUnitId: string;
    channel: 'sms';
    body: string;
    override: {
      reasonCode: string;
      note: string;
    };
  };
};

export const test = base.extend<StoryD2Fixtures>({
  storyD2Context: async ({}, use) => {
    await use(createStoryD2Context());
  },
  storyD2SmsSenderReady: async ({ request, storyD2Context }, use) => {
    await ensureSingleActiveConnectShyftSmsSenderMapping({
      request,
      headers: createStoryD2Headers(storyD2Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyD2Context.adminUserId,
        orgUnitMemberships: [storyD2Context.orgUnitId],
      }),
      orgUnitId: storyD2Context.orgUnitId,
      preferredNumber: '+12605550196',
      preferredLabel: 'Story D2 SMS sender',
    });
    await use();
  },
  storyD2OperatorHeaders: async ({ storyD2SmsSenderReady, storyD2Context }, use) => {
    await use(
      createStoryD2Headers(storyD2Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitMemberships: [storyD2Context.orgUnitId],
      }),
    );
  },
  storyD2AdminHeaders: async ({ storyD2SmsSenderReady, storyD2Context }, use) => {
    await use(
      createStoryD2Headers(storyD2Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyD2Context.adminUserId,
        orgUnitMemberships: [storyD2Context.orgUnitId],
      }),
    );
  },
  storyD2ViewerHeaders: async ({ storyD2SmsSenderReady, storyD2Context }, use) => {
    await use(
      createStoryD2Headers(storyD2Context, {
        role: 'TENANT_VIEWER',
        userId: storyD2Context.viewerUserId,
        orgUnitMemberships: [],
      }),
    );
  },
  storyD2MessageWithoutOverridePayload: async ({ storyD2Context }, use) => {
    await use({
      orgUnitId: storyD2Context.orgUnitId,
      channel: 'sms',
      body: 'Need to contact you now regarding urgent housing status update.',
    });
  },
  storyD2MessageWithValidOverridePayload: async ({ storyD2Context }, use) => {
    await use({
      orgUnitId: storyD2Context.orgUnitId,
      channel: 'sms',
      body: 'Urgent safety exception contact attempt.',
      override: {
        reasonCode: 'SAFETY_EXCEPTION',
        note: 'Neighbor requested no texts, but safety escalation requires outreach.',
      },
    });
  },
  storyD2MessageWithInvalidOverridePayload: async ({ storyD2Context }, use) => {
    await use({
      orgUnitId: storyD2Context.orgUnitId,
      channel: 'sms',
      body: 'Testing invalid override behavior.',
      override: {
        reasonCode: 'UNKNOWN_REASON',
        note: '',
      },
    });
  },
});

export { expect } from '@playwright/test';
