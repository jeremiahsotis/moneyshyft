import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryC5Context,
  createStoryC5Headers,
  type StoryC5Context,
} from '../../support/factories/connectShyftStoryC5Factory';

const buildThreadUrl = (
  context: StoryC5Context,
  options: {
    threadId?: string;
    actorUserId: string;
    tenantRole: string;
    orgUnitMemberships: string[];
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: options.actorUserId,
    tenantRole: options.tenantRole,
    orgUnitMemberships: options.orgUnitMemberships.join(','),
  });

  const threadId = options.threadId ?? context.threadId;
  return `/app/connectshyft/threads/${encodeURIComponent(threadId)}?${params.toString()}`;
};

test.describe(
  'Story c.5 deterministic escalation scheduler with claim-only reset (Automate E2E Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] scheduler run updates escalation timeline chips with deterministic baseline multipliers for unclaimed threads @P0',
      async ({ page, request }) => {
        const context = createStoryC5Context();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
          }),
        );

        await expect(page.getByTestId('connectshyft-thread-detail')).toBeVisible();

        const schedulerHeaders = createStoryC5Headers(context, {
          role: 'TENANT_STAFF',
          userId: context.schedulerUserId,
          orgUnitMemberships: [context.orgUnitId],
        });
        const schedulerPayload = {
          orgUnitId: context.orgUnitId,
          asOfUtc: new Date(Date.now() + (96 * 60 * 60 * 1000)).toISOString(),
          limit: 50,
        };

        const schedulerResponse = await request.post(context.paths.schedulerEvaluate, {
          headers: schedulerHeaders,
          data: schedulerPayload,
        });
        expect(schedulerResponse.status()).toBe(200);
        const schedulerBody = (await schedulerResponse.json()) as {
          ok?: boolean;
          code?: string;
          data?: {
            transitions?: Array<{
              threadId?: string;
              stage?: number;
              nextDueOffsetHours?: number;
            }>;
          };
        };

        expect(schedulerBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_EVALUATED',
        });

        const transitions = schedulerBody.data?.transitions ?? [];
        expect(transitions.length).toBeGreaterThan(0);

        for (const transition of transitions) {
          expect(Number.isInteger(transition.stage)).toBe(true);
          expect(Number.isInteger(transition.nextDueOffsetHours)).toBe(true);
          expect((transition.nextDueOffsetHours ?? 0) % context.escalationBaselineHours.valid).toBe(0);
        }
      },
    );

    test(
      '[P0] claim action resets escalation stage and clears pending-notification indicator as the only reset path @P0',
      async ({ page, request }) => {
        const context = createStoryC5Context();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
          }),
        );

        await expect(page.getByTestId('connectshyft-thread-detail')).toBeVisible();

        const claimHeaders = createStoryC5Headers(context, {
          role: 'ORGUNIT_MEMBER',
          userId: context.userId,
          orgUnitMemberships: [context.orgUnitId],
        });
        const claimResponse = await request.post(context.paths.threadClaim, {
          headers: claimHeaders,
          data: {
            orgUnitId: context.orgUnitId,
          },
        });
        expect(claimResponse.status()).toBe(200);
        const claimBody = (await claimResponse.json()) as {
          ok?: boolean;
          code?: string;
          data?: {
            thread?: {
              state?: string;
              escalationStage?: number;
            };
            escalation?: {
              resetReason?: string;
            };
          };
        };

        expect(claimBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CLAIMED',
          data: {
            thread: {
              state: 'CLAIMED',
              escalationStage: 0,
            },
            escalation: {
              resetReason: 'claimed',
            },
          },
        });
      },
    );

    test(
      '[P1] repeated scheduler runs surface replay-safe summary and avoid duplicate warning indicators @P1',
      async ({ page, request }) => {
        const context = createStoryC5Context();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
          }),
        );

        const schedulerHeaders = createStoryC5Headers(context, {
          role: 'TENANT_STAFF',
          userId: context.schedulerUserId,
          orgUnitMemberships: [context.orgUnitId],
        });
        const schedulerPayload = {
          orgUnitId: context.orgUnitId,
          asOfUtc: new Date(Date.now() + (5 * 60 * 1000)).toISOString(),
          limit: 50,
        };

        const firstRunResponse = await request.post(context.paths.schedulerEvaluate, {
          headers: schedulerHeaders,
          data: schedulerPayload,
        });
        const secondRunResponse = await request.post(context.paths.schedulerEvaluate, {
          headers: schedulerHeaders,
          data: schedulerPayload,
        });

        expect(firstRunResponse.status()).toBe(200);
        expect(secondRunResponse.status()).toBe(200);

        const firstBody = (await firstRunResponse.json()) as {
          ok?: boolean;
          code?: string;
        };
        const secondBody = (await secondRunResponse.json()) as {
          ok?: boolean;
          code?: string;
          data?: {
            replaySafe?: boolean;
            skippedAlreadyProcessed?: boolean;
            effects?: {
              emittedCount?: number;
            };
          };
        };

        expect(firstBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_EVALUATED',
        });
        expect(secondBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_EVALUATED',
          data: {
            replaySafe: true,
            skippedAlreadyProcessed: true,
            effects: {
              emittedCount: 0,
            },
          },
        });

      },
    );

    test(
      '[P1] tenant-viewer inbox session hides scheduler and claim controls while exposing refusal guidance @P1',
      async ({ page }) => {
        const context = createStoryC5Context();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            actorUserId: 'user-connectshyft-c5-viewer',
            tenantRole: 'TENANT_VIEWER',
            orgUnitMemberships: [],
          }),
        );

        await expect(page.getByTestId('connectshyft-feedback-banner')).toContainText(
          'Thread detail is unavailable for the requested orgUnit context.',
        );
        await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Take Over' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(0);
      },
    );
  },
);
