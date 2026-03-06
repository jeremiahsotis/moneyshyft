import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryG1.fixture';

type PrimitiveEntry = {
  testId?: string;
};

type DesignTokenContractPayload = {
  data?: {
    designTokens?: {
      groups?: string[];
      cssVariables?: Record<string, string>;
    };
  };
};

type ConversationPrimitivePayload = {
  data?: {
    conversationPrimitives?: unknown;
  };
};

type DisplaySafeItem = {
  displayTitle?: string;
  displaySummary?: string;
  primaryCopy?: string;
  primaryContent?: Record<string, unknown>;
};

type DisplaySafePayload = {
  data?: {
    items?: DisplaySafeItem[];
  };
};

type ResponsiveBreakpointsPayload = {
  data?: {
    responsiveBreakpoints?: Partial<
      Record<
        'mobile' | 'tablet' | 'desktop',
        {
          viewportWidth?: number;
          bodyTextPx?: number;
          minTapTargetPx?: number;
          tokenScale?: string;
        }
      >
    >;
  };
};

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const collectPrimitiveTestIds = (source: unknown): string[] => {
  if (!source) {
    return [];
  }

  if (Array.isArray(source)) {
    return source
      .map((entry) =>
        typeof entry === 'object' && entry
          ? String((entry as PrimitiveEntry).testId ?? '')
          : '',
      )
      .filter(Boolean);
  }

  if (typeof source === 'object') {
    return Object.values(source as Record<string, PrimitiveEntry>)
      .map((entry) => String(entry?.testId ?? ''))
      .filter(Boolean);
  }

  return [];
};

test.describe('Story g.1 Design Tokens and Shared Conversation Primitives (ATDD API RED)', () => {
  test.skip(
    '[P0] inbox and thread contracts publish token groups and required css variable mappings for color type spacing radius shadow and breakpoints @P0',
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

      const inboxBody = (await inboxResponse.json()) as DesignTokenContractPayload;
      const detailBody = (await detailResponse.json()) as DesignTokenContractPayload;
      const designTokens =
        detailBody.data?.designTokens ?? inboxBody.data?.designTokens;

      expect(designTokens).toBeTruthy();

      const tokenGroups = designTokens?.groups ?? [];
      for (const tokenGroup of storyG1Context.tokenContract.groups) {
        expect(tokenGroups).toContain(tokenGroup);
      }

      const cssVariables = designTokens?.cssVariables ?? {};
      for (const cssVariable of storyG1Context.tokenContract.requiredCssVars) {
        expect(typeof cssVariables[cssVariable]).toBe('string');
        expect(cssVariables[cssVariable]).toBeTruthy();
      }
    },
  );

  test.skip(
    '[P0] inbox mine and thread payloads expose reusable primitive contracts for queue cards pills header bubbles voicemail composer and action bar @P0',
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

      const inboxBody = (await inboxResponse.json()) as ConversationPrimitivePayload;
      const mineBody = (await mineResponse.json()) as ConversationPrimitivePayload;
      const detailBody = (await detailResponse.json()) as ConversationPrimitivePayload;

      const availablePrimitiveTestIds = new Set<string>([
        ...collectPrimitiveTestIds(inboxBody.data?.conversationPrimitives),
        ...collectPrimitiveTestIds(mineBody.data?.conversationPrimitives),
        ...collectPrimitiveTestIds(detailBody.data?.conversationPrimitives),
      ]);

      for (const requiredPrimitive of storyG1Context.primitiveTestIds) {
        expect(availablePrimitiveTestIds.has(requiredPrimitive)).toBe(true);
      }
    },
  );

  test.skip(
    '[P1] inbox display-safe projection exposes operator-first copy and excludes raw identifiers and routing internals from primary content contracts @P1',
    async ({ request, storyG1Context, storyG1MemberHeaders, storyG1InboxQuery }) => {
      const response = await apiRequest(request, {
        method: 'GET',
        path: `${storyG1Context.paths.inbox}${storyG1InboxQuery}`,
        headers: storyG1MemberHeaders,
      });

      expect(response.status()).toBe(200);
      const body = (await response.json()) as DisplaySafePayload;
      const items = Array.isArray(body.data?.items) ? body.data.items : [];

      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        const primaryCopyFields = [
          item.displayTitle,
          item.displaySummary,
          item.primaryCopy,
        ].filter(
          (value): value is string =>
            typeof value === 'string' && value.trim().length > 0,
        );

        expect(primaryCopyFields.length).toBeGreaterThan(0);

        const loweredPrimaryCopy = primaryCopyFields.join(' ').toLowerCase();
        for (const forbiddenToken of storyG1Context.forbiddenPrimaryCopyTokens) {
          expect(loweredPrimaryCopy).not.toContain(forbiddenToken);
        }
        expect(loweredPrimaryCopy).not.toMatch(UUID_PATTERN);
        expect(loweredPrimaryCopy).not.toMatch(/\bpriority\s*\d+\b/i);

        if (item.primaryContent && typeof item.primaryContent === 'object') {
          expect(item.primaryContent).not.toHaveProperty('threadId');
          expect(item.primaryContent).not.toHaveProperty('priorityRank');
          expect(item.primaryContent).not.toHaveProperty('routingMetadata');
        }
      }
    },
  );

  test.skip(
    '[P1] responsive breakpoint contract publishes tokenized viewport scaling with minimum body text and touch-target guarantees @P1',
    async ({ request, storyG1Context, storyG1MemberHeaders, storyG1InboxQuery }) => {
      const response = await apiRequest(request, {
        method: 'GET',
        path: `${storyG1Context.paths.inbox}${storyG1InboxQuery}`,
        headers: storyG1MemberHeaders,
      });

      expect(response.status()).toBe(200);
      const body = (await response.json()) as ResponsiveBreakpointsPayload;
      const responsiveBreakpoints = body.data?.responsiveBreakpoints;

      for (const mode of ['mobile', 'tablet', 'desktop'] as const) {
        const contract = responsiveBreakpoints?.[mode];

        expect(contract).toBeTruthy();
        expect(Number(contract?.viewportWidth)).toBeGreaterThanOrEqual(
          storyG1Context.breakpoints[mode].width,
        );
        expect(Number(contract?.bodyTextPx)).toBeGreaterThanOrEqual(
          storyG1Context.readability.minBodyTextPx,
        );
        expect(Number(contract?.minTapTargetPx)).toBeGreaterThanOrEqual(
          storyG1Context.readability.minTapTargetPx,
        );
        expect(String(contract?.tokenScale ?? '')).toMatch(
          /^(mobile|tablet|desktop|adaptive)$/i,
        );
      }
    },
  );
});
