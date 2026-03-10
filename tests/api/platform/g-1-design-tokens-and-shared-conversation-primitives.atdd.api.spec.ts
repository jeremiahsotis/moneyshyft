import {
  CONNECTSHYFT_READABILITY_CONTRACT,
  CONNECTSHYFT_REQUIRED_CSS_VARIABLES,
  CONNECTSHYFT_RESPONSIVE_BREAKPOINTS,
  CONNECTSHYFT_TOKEN_GROUPS,
} from '../../../apps/connectshyft-web/src/components/connectshyft/connectShyftTokens';
import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryG1.fixture';

type ConnectShyftItem = {
  threadId?: string;
  orgUnitId?: string;
  state?: string;
  bucket?: string;
  escalationStage?: number;
  priorityRank?: number;
  urgencyLabel?: string;
  summary?: string;
  voicemailIndicator?: boolean;
  display?: {
    title?: string;
    urgencyLabel?: string;
    stateLabel?: string;
    inboundContext?: string;
    outboundContext?: string;
    neighborContext?: string;
    conferenceContext?: string;
    voicemailLabel?: string;
    threadId?: string;
    priorityRank?: number;
    routingMetadata?: unknown;
  };
};

type ConnectShyftEnvelope = {
  ok?: boolean;
  code?: string;
  message?: string;
  correlationId?: string;
  tenantId?: string;
  data?: {
    context?: {
      tenantId?: string;
      orgUnitId?: string;
      bypassedOrgUnitMembership?: boolean;
    };
    bucket?: string;
    items?: ConnectShyftItem[];
    thread?: ConnectShyftItem & {
      actions?: string[];
    };
    actions?: {
      claim?: boolean;
      takeover?: boolean;
    };
    latencyBudgetsMs?: {
      p95?: number;
      p99?: number;
    };
  };
};

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];
const ALLOWED_THREAD_ACTIONS = new Set([
  'Call',
  'Text',
  'Claim',
  'Take Over',
  'Close',
  'Send Message',
]);
const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const collectPrimaryCopyFields = (item: ConnectShyftItem): string[] => {
  const fields = [
    item.summary,
    item.urgencyLabel,
    item.display?.title,
    item.display?.urgencyLabel,
    item.display?.stateLabel,
    item.display?.inboundContext,
    item.display?.outboundContext,
    item.display?.neighborContext,
    item.display?.conferenceContext,
    item.display?.voicemailLabel,
  ];

  return fields
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};

test.describe('Story g.1 Design Tokens and Shared Conversation Primitives (ATDD API)', () => {
  test(
    '[G1-ATDD-API-001][P0] inbox and thread contracts publish canonical envelope/context while shared token groups and css variable contracts remain aligned @P0',
    async ({ request, storyG1Context, storyG1MemberHeaders, storyG1InboxQuery }) => {
      const inboxResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG1Context.paths.inbox}${storyG1InboxQuery}`,
        headers: storyG1MemberHeaders,
      });
      const detailResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG1Context.paths.threadDetail}/${storyG1Context.threadIds.claimed}`,
        headers: storyG1MemberHeaders,
      });

      expect(inboxResponse.status()).toBe(200);
      expect(detailResponse.status()).toBe(200);

      const inboxBody = (await inboxResponse.json()) as ConnectShyftEnvelope;
      const detailBody = (await detailResponse.json()) as ConnectShyftEnvelope;

      for (const envelopeKey of REQUIRED_ENVELOPE_KEYS) {
        expect(Object.prototype.hasOwnProperty.call(inboxBody, envelopeKey)).toBe(true);
        expect(Object.prototype.hasOwnProperty.call(detailBody, envelopeKey)).toBe(true);
      }

      expect(inboxBody.ok).toBe(true);
      expect(detailBody.ok).toBe(true);
      expect(inboxBody.data?.context?.tenantId).toBe(storyG1Context.tenantId);
      expect(inboxBody.data?.context?.orgUnitId).toBe(storyG1Context.orgUnitId);
      expect(detailBody.data?.context?.tenantId).toBe(storyG1Context.tenantId);
      expect(detailBody.data?.context?.orgUnitId).toBe(storyG1Context.orgUnitId);

      expect([...CONNECTSHYFT_TOKEN_GROUPS]).toEqual([...storyG1Context.tokenContract.groups]);
      for (const cssVariable of storyG1Context.tokenContract.requiredCssVars) {
        expect(CONNECTSHYFT_REQUIRED_CSS_VARIABLES).toContain(cssVariable);
      }
      expect(CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.mobile).toBe(
        storyG1Context.breakpoints.mobile.width,
      );
      expect(CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.tablet).toBe(
        storyG1Context.breakpoints.tablet.width,
      );
      expect(CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.desktop).toBe(
        storyG1Context.breakpoints.desktop.width,
      );
    },
  );

  test(
    '[G1-ATDD-API-002][P0] inbox mine and thread payloads expose reusable primitive source fields for queue cards pills thread headers message bubbles voicemail cards composer and action bar @P0',
    async ({
      request,
      storyG1Context,
      storyG1MemberHeaders,
      storyG1InboxQuery,
      storyG1MineQuery,
    }) => {
      const inboxResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG1Context.paths.inbox}${storyG1InboxQuery}`,
        headers: storyG1MemberHeaders,
      });
      const mineResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG1Context.paths.inbox}${storyG1MineQuery}`,
        headers: storyG1MemberHeaders,
      });
      const detailResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG1Context.paths.threadDetail}/${storyG1Context.threadIds.voicemailClaimed}`,
        headers: storyG1MemberHeaders,
      });

      expect(inboxResponse.status()).toBe(200);
      expect(mineResponse.status()).toBe(200);
      expect(detailResponse.status()).toBe(200);

      const inboxBody = (await inboxResponse.json()) as ConnectShyftEnvelope;
      const mineBody = (await mineResponse.json()) as ConnectShyftEnvelope;
      const detailBody = (await detailResponse.json()) as ConnectShyftEnvelope;

      const allItems = [
        ...(Array.isArray(inboxBody.data?.items) ? inboxBody.data.items : []),
        ...(Array.isArray(mineBody.data?.items) ? mineBody.data.items : []),
      ];

      expect(allItems.length).toBeGreaterThan(0);
      for (const item of allItems) {
        expect(typeof item.threadId).toBe('string');
        expect((item.threadId ?? '').trim().length).toBeGreaterThan(0);
        expect(typeof item.orgUnitId).toBe('string');
        expect(['UNCLAIMED', 'CLAIMED', 'CLOSED']).toContain(item.state ?? '');
        expect(['inbox', 'mine']).toContain(item.bucket ?? '');
        expect(Number(item.escalationStage)).toBeGreaterThanOrEqual(0);
        expect(Number(item.priorityRank)).toBeGreaterThanOrEqual(0);
        expect(typeof item.summary).toBe('string');
        expect((item.summary ?? '').trim().length).toBeGreaterThan(0);
        expect(typeof item.display?.title).toBe('string');
        expect((item.display?.title ?? '').trim().length).toBeGreaterThan(0);
        expect(typeof item.display?.urgencyLabel).toBe('string');
        expect(typeof item.display?.stateLabel).toBe('string');
      }

      expect(detailBody.ok).toBe(true);
      expect(detailBody.data?.thread?.threadId).toBe(storyG1Context.threadIds.voicemailClaimed);
      expect(Array.isArray(detailBody.data?.thread?.actions)).toBe(true);
      const detailActions = detailBody.data?.thread?.actions ?? [];
      expect(detailActions.length).toBeGreaterThan(0);
      for (const action of detailActions) {
        expect(ALLOWED_THREAD_ACTIONS.has(action)).toBe(true);
      }
    },
  );

  test(
    '[G1-ATDD-API-003][P1] inbox display-safe projection exposes operator-first copy and excludes raw identifiers and routing internals from primary content contracts @P1',
    async ({ request, storyG1Context, storyG1MemberHeaders, storyG1InboxQuery }) => {
      const response = await apiRequest(request, {
        method: 'GET',
        path: `${storyG1Context.paths.inbox}${storyG1InboxQuery}`,
        headers: storyG1MemberHeaders,
      });

      expect(response.status()).toBe(200);
      const body = (await response.json()) as ConnectShyftEnvelope;
      const items = Array.isArray(body.data?.items) ? body.data.items : [];

      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        const primaryCopyFields = collectPrimaryCopyFields(item);
        expect(primaryCopyFields.length).toBeGreaterThan(0);

        const loweredPrimaryCopy = primaryCopyFields.join(' ').toLowerCase();
        for (const forbiddenToken of storyG1Context.forbiddenPrimaryCopyTokens) {
          expect(loweredPrimaryCopy).not.toContain(forbiddenToken);
        }
        for (const knownThreadId of Object.values(storyG1Context.threadIds)) {
          expect(loweredPrimaryCopy).not.toContain(knownThreadId.toLowerCase());
        }
        expect(loweredPrimaryCopy).not.toMatch(UUID_PATTERN);
        expect(loweredPrimaryCopy).not.toMatch(/\bpriority\s*\d+\b/i);

        expect(item.display).not.toHaveProperty('threadId');
        expect(item.display).not.toHaveProperty('priorityRank');
        expect(item.display).not.toHaveProperty('routingMetadata');
      }
    },
  );

  test(
    '[G1-ATDD-API-004][P1] inbox and thread contracts preserve readability floors and latency budgets used by responsive surfaces @P1',
    async ({ request, storyG1Context, storyG1MemberHeaders, storyG1InboxQuery }) => {
      const inboxResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG1Context.paths.inbox}${storyG1InboxQuery}`,
        headers: storyG1MemberHeaders,
      });
      const detailResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG1Context.paths.threadDetail}/${storyG1Context.threadIds.claimed}`,
        headers: storyG1MemberHeaders,
      });

      expect(inboxResponse.status()).toBe(200);
      expect(detailResponse.status()).toBe(200);

      const inboxBody = (await inboxResponse.json()) as ConnectShyftEnvelope;
      const detailBody = (await detailResponse.json()) as ConnectShyftEnvelope;

      const inboxBudgets = inboxBody.data?.latencyBudgetsMs;
      const detailBudgets = detailBody.data?.latencyBudgetsMs;
      expect(Number(inboxBudgets?.p95)).toBeGreaterThan(0);
      expect(Number(inboxBudgets?.p99)).toBeGreaterThanOrEqual(Number(inboxBudgets?.p95));
      expect(Number(detailBudgets?.p95)).toBeGreaterThan(0);
      expect(Number(detailBudgets?.p99)).toBeGreaterThanOrEqual(Number(detailBudgets?.p95));

      expect(CONNECTSHYFT_READABILITY_CONTRACT.minBodyTextPx).toBeGreaterThanOrEqual(
        storyG1Context.readability.minBodyTextPx,
      );
      expect(CONNECTSHYFT_READABILITY_CONTRACT.minTapTargetPx).toBeGreaterThanOrEqual(
        storyG1Context.readability.minTapTargetPx,
      );
      expect(CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.mobile).toBe(
        storyG1Context.breakpoints.mobile.width,
      );
      expect(CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.tablet).toBe(
        storyG1Context.breakpoints.tablet.width,
      );
      expect(CONNECTSHYFT_RESPONSIVE_BREAKPOINTS.desktop).toBe(
        storyG1Context.breakpoints.desktop.width,
      );
    },
  );
});
