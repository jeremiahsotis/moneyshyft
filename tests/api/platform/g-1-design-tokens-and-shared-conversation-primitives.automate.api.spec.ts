import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryG1.fixture';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];
const ALLOWED_ACTION_LABELS = new Set([
  'Call',
  'Text',
  'Claim',
  'Take Over',
  'Close',
  'Send Message',
]);
const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

const collectOperatorPrimaryCopy = (item: Record<string, unknown>): string => {
  const fields: string[] = [];

  const collect = (value: unknown): void => {
    if (typeof value !== 'string') {
      return;
    }
    const normalized = value.trim();
    if (normalized.length > 0) {
      fields.push(normalized);
    }
  };

  collect(item.summary);
  collect(item.urgencyLabel);
  collect(item.voicemailLabel);

  const display = item.display;
  if (display && typeof display === 'object') {
    const displayRecord = display as Record<string, unknown>;
    collect(displayRecord.title);
    collect(displayRecord.urgencyLabel);
    collect(displayRecord.stateLabel);
    collect(displayRecord.inboundContext);
    collect(displayRecord.outboundContext);
    collect(displayRecord.neighborContext);
    collect(displayRecord.conferenceContext);
    collect(displayRecord.voicemailLabel);
  }

  return fields.join(' ').toLowerCase();
};

test.describe(
  'Story g.1 Design Tokens and Shared Conversation Primitives (Automate API Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] inbox and thread detail responses preserve canonical envelope keys and deterministic orgUnit context for shared primitive consumers @P0',
      async ({ request, storyG1Context, storyG1MemberHeaders, storyG1InboxQuery }) => {
        const inboxResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyG1Context.paths.inbox}${storyG1InboxQuery}`,
          headers: storyG1MemberHeaders,
        });

        expect(inboxResponse.status()).toBe(200);

        const inboxBody = await inboxResponse.json();
        expect(hasRequiredEnvelopeKeys(inboxBody)).toBe(true);

        expect(inboxBody).toMatchObject({
          ok: true,
          code: expect.stringMatching(/^CONNECTSHYFT_/),
          data: {
            context: {
              tenantId: storyG1Context.tenantId,
              orgUnitId: storyG1Context.orgUnitId,
            },
            items: expect.any(Array),
          },
        });

        const items = Array.isArray(inboxBody?.data?.items)
          ? inboxBody.data.items
          : [];
        expect(items.length).toBeGreaterThan(0);
        const firstThreadId = String(items[0]?.threadId ?? '').trim();
        expect(firstThreadId.length).toBeGreaterThan(0);

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyG1Context.paths.threadDetail}/${firstThreadId}`,
          headers: storyG1MemberHeaders,
        });
        expect(detailResponse.status()).toBe(200);

        const detailBody = await detailResponse.json();
        expect(hasRequiredEnvelopeKeys(detailBody)).toBe(true);
        expect(detailBody).toMatchObject({
          ok: true,
          code: expect.stringMatching(/^CONNECTSHYFT_THREAD_DETAIL_/),
          data: {
            thread: {
              threadId: firstThreadId,
              orgUnitId: storyG1Context.orgUnitId,
              state: expect.any(String),
              actions: expect.any(Array),
            },
          },
        });
      },
    );

    test(
      '[P0] inbox and mine buckets keep canonical state and metadata fields required by queue-card and pill primitives @P0',
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

        expect(inboxResponse.status()).toBe(200);
        expect(mineResponse.status()).toBe(200);

        const inboxBody = await inboxResponse.json();
        const mineBody = await mineResponse.json();

        const allItems = [
          ...(Array.isArray(inboxBody?.data?.items) ? inboxBody.data.items : []),
          ...(Array.isArray(mineBody?.data?.items) ? mineBody.data.items : []),
        ] as Array<Record<string, unknown>>;

        expect(allItems.length).toBeGreaterThan(0);
        for (const item of allItems) {
          expect(typeof item.threadId).toBe('string');
          expect(typeof item.orgUnitId).toBe('string');
          expect(['UNCLAIMED', 'CLAIMED', 'CLOSED']).toContain(String(item.state));
          expect(['inbox', 'mine']).toContain(String(item.bucket));
          expect(Number(item.escalationStage)).toBeGreaterThanOrEqual(0);
          expect(Number(item.priorityRank)).toBeGreaterThanOrEqual(0);
          expect(String(item.lastActivityAtUtc)).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
          );
        }
      },
    );

    test(
      '[P1] operator-primary copy fields remain display-safe and suppress forbidden identifiers in inbox payload contracts @P1',
      async ({ request, storyG1Context, storyG1MemberHeaders, storyG1InboxQuery }) => {
        const response = await apiRequest(request, {
          method: 'GET',
          path: `${storyG1Context.paths.inbox}${storyG1InboxQuery}`,
          headers: storyG1MemberHeaders,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        const items = (Array.isArray(body?.data?.items) ? body.data.items : []) as Array<
          Record<string, unknown>
        >;

        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
          const operatorCopy = collectOperatorPrimaryCopy(item);
          if (operatorCopy.length === 0) {
            continue;
          }

          for (const forbiddenToken of storyG1Context.forbiddenPrimaryCopyTokens) {
            expect(operatorCopy).not.toContain(forbiddenToken);
          }
          for (const knownThreadId of Object.values(storyG1Context.threadIds)) {
            expect(operatorCopy).not.toContain(knownThreadId.toLowerCase());
          }

          expect(operatorCopy).not.toMatch(UUID_PATTERN);
          expect(operatorCopy).not.toMatch(/\bpriority\s*\d+\b/i);
        }
      },
    );

    test(
      '[P1] thread detail keeps canonical reusable action labels and preserves voicemail indicator when voicemail payloads are present @P1',
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

        expect(inboxResponse.status()).toBe(200);
        expect(mineResponse.status()).toBe(200);

        const inboxBody = await inboxResponse.json();
        const mineBody = await mineResponse.json();
        const allItems = [
          ...(Array.isArray(inboxBody?.data?.items) ? inboxBody.data.items : []),
          ...(Array.isArray(mineBody?.data?.items) ? mineBody.data.items : []),
        ] as Array<Record<string, unknown>>;
        expect(allItems.length).toBeGreaterThan(0);

        const voicemailItem = allItems.find((item) => item.voicemailIndicator === true);
        const targetThread = voicemailItem ?? allItems[0];
        const targetThreadId = String(targetThread?.threadId ?? '').trim();
        expect(targetThreadId.length).toBeGreaterThan(0);

        const response = await apiRequest(request, {
          method: 'GET',
          path: `${storyG1Context.paths.threadDetail}/${targetThreadId}`,
          headers: storyG1MemberHeaders,
        });
        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: true,
          code: expect.stringMatching(/^CONNECTSHYFT_THREAD_DETAIL_/),
          data: {
            thread: {
              threadId: targetThreadId,
              state: expect.any(String),
              voicemailIndicator: expect.any(Boolean),
              actions: expect.any(Array),
            },
          },
        });

        const actions = Array.isArray(body?.data?.thread?.actions)
          ? body.data.thread.actions
          : [];
        expect(actions.length).toBeGreaterThan(0);
        for (const action of actions) {
          expect(ALLOWED_ACTION_LABELS.has(String(action))).toBe(true);
        }

        if (voicemailItem) {
          expect(body?.data?.thread?.voicemailIndicator).toBe(true);
        }
      },
    );
  },
);
