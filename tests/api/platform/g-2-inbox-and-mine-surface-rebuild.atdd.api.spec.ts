import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryG2.fixture';

type ConnectShyftItem = {
  threadId?: string;
  orgUnitId?: string;
  state?: string;
  bucket?: string;
  priorityRank?: number;
  urgencyLabel?: string;
  lastActivityAtUtc?: string;
  voicemailIndicator?: boolean;
  summary?: string;
  display?: {
    title?: string;
    preview?: string;
    timestampLabel?: string;
    urgencyLabel?: string;
    stateLabel?: string;
    contextPills?: string[];
    inboundContext?: string;
    outboundContext?: string;
    neighborContext?: string;
    conferenceContext?: string;
    voicemailLabel?: string;
    threadId?: string;
    priorityRank?: number;
    rawStateChip?: string;
    routingMetadata?: unknown;
    webhookMetadata?: unknown;
    systemMetadata?: unknown;
  };
};

type ConnectShyftEnvelope = {
  ok?: boolean;
  code?: string;
  data?: {
    items?: ConnectShyftItem[];
    bucket?: string;
  };
};

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const collectPrimaryCopyFields = (item: ConnectShyftItem): string[] => {
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
  collect(item.display?.title);
  collect(item.display?.preview);
  collect(item.display?.timestampLabel);
  collect(item.display?.urgencyLabel);
  collect(item.display?.stateLabel);
  collect(item.display?.inboundContext);
  collect(item.display?.outboundContext);
  collect(item.display?.neighborContext);
  collect(item.display?.conferenceContext);
  collect(item.display?.voicemailLabel);

  if (Array.isArray(item.display?.contextPills)) {
    for (const pill of item.display.contextPills) {
      collect(pill);
    }
  }

  return fields;
};

const sortThreadIdsByDeterministicRules = (items: ConnectShyftItem[]): string[] => {
  return [...items]
    .sort((left, right) => {
      const leftPriority = Number(left.priorityRank ?? Number.POSITIVE_INFINITY);
      const rightPriority = Number(right.priorityRank ?? Number.POSITIVE_INFINITY);
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      const leftActivity = Date.parse(String(left.lastActivityAtUtc ?? '1970-01-01T00:00:00.000Z'));
      const rightActivity = Date.parse(String(right.lastActivityAtUtc ?? '1970-01-01T00:00:00.000Z'));
      if (leftActivity !== rightActivity) {
        return rightActivity - leftActivity;
      }

      const leftThreadId = String(left.threadId ?? '');
      const rightThreadId = String(right.threadId ?? '');
      return leftThreadId.localeCompare(rightThreadId);
    })
    .map((item) => String(item.threadId ?? '').trim())
    .filter((threadId) => threadId.length > 0);
};

test.describe('Story g.2 Inbox and Mine Surface Rebuild (ATDD API RED)', () => {
  test(
    '[G2-ATDD-API-001][P0] inbox and mine queue contracts expose card-level summary preview timestamp and context-pill fields for card-level tap targets @P0',
    async ({
      request,
      storyG2Context,
      storyG2MemberHeaders,
      storyG2InboxQuery,
      storyG2MineQuery,
    }) => {
      const inboxResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG2Context.paths.inbox}${storyG2InboxQuery}`,
        headers: storyG2MemberHeaders,
      });
      const mineResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG2Context.paths.inbox}${storyG2MineQuery}`,
        headers: storyG2MemberHeaders,
      });

      expect(inboxResponse.status()).toBe(200);
      expect(mineResponse.status()).toBe(200);

      const inboxBody = (await inboxResponse.json()) as ConnectShyftEnvelope;
      const mineBody = (await mineResponse.json()) as ConnectShyftEnvelope;
      const allItems = [
        ...(Array.isArray(inboxBody.data?.items) ? inboxBody.data.items : []),
        ...(Array.isArray(mineBody.data?.items) ? mineBody.data.items : []),
      ];

      expect(allItems.length).toBeGreaterThan(0);

      for (const item of allItems) {
        expect(typeof item.threadId).toBe('string');
        expect((item.threadId ?? '').trim().length).toBeGreaterThan(0);
        expect(typeof item.summary).toBe('string');
        expect((item.summary ?? '').trim().length).toBeGreaterThan(0);

        expect(typeof item.display?.title).toBe('string');
        expect((item.display?.title ?? '').trim().length).toBeGreaterThan(0);
        expect(typeof item.display?.preview).toBe('string');
        expect((item.display?.preview ?? '').trim().length).toBeGreaterThan(0);
        const timestampLabel = item.display?.timestampLabel;
        if (typeof timestampLabel === 'string' && timestampLabel.trim().length > 0) {
          expect(timestampLabel.trim().length).toBeGreaterThan(0);
        } else {
          expect(typeof item.lastActivityAtUtc).toBe('string');
          expect(Number.isFinite(Date.parse(String(item.lastActivityAtUtc)))).toBe(true);
        }

        const contextPills = Array.isArray(item.display?.contextPills)
          ? item.display?.contextPills ?? []
          : [];
        const contextSignals = [
          ...contextPills,
          item.display?.claimContext,
          item.display?.conferenceContext,
          item.display?.inboundContext,
          item.display?.outboundContext,
          item.display?.neighborContext,
        ]
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter((value) => value.length > 0);

        expect(contextSignals.length).toBeGreaterThan(0);

        for (const pill of contextPills) {
          expect(typeof pill).toBe('string');
          expect(pill.trim().length).toBeGreaterThan(0);
        }
      }
    },
  );

  test(
    '[G2-ATDD-API-002][P0] inbox ordering remains deterministic across repeated reads and maps urgency into human-readable triage language @P0',
    async ({ request, storyG2Context, storyG2MemberHeaders, storyG2InboxQuery }) => {
      const firstResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG2Context.paths.inbox}${storyG2InboxQuery}`,
        headers: storyG2MemberHeaders,
      });
      const secondResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG2Context.paths.inbox}${storyG2InboxQuery}`,
        headers: storyG2MemberHeaders,
      });

      expect(firstResponse.status()).toBe(200);
      expect(secondResponse.status()).toBe(200);

      const firstBody = (await firstResponse.json()) as ConnectShyftEnvelope;
      const secondBody = (await secondResponse.json()) as ConnectShyftEnvelope;

      const firstItems = Array.isArray(firstBody.data?.items) ? firstBody.data.items : [];
      const secondItems = Array.isArray(secondBody.data?.items) ? secondBody.data.items : [];

      expect(firstItems.length).toBeGreaterThan(0);
      expect(secondItems.length).toBe(firstItems.length);

      const firstThreadOrder = firstItems.map((item) => String(item.threadId ?? '').trim());
      const secondThreadOrder = secondItems.map((item) => String(item.threadId ?? '').trim());
      expect(secondThreadOrder).toEqual(firstThreadOrder);

      const sortedByContract = sortThreadIdsByDeterministicRules(firstItems);
      expect(firstThreadOrder).toEqual(sortedByContract);

      for (const item of firstItems) {
        const urgencyText = String(item.display?.urgencyLabel ?? item.urgencyLabel ?? '').toLowerCase();
        expect(urgencyText).not.toMatch(/\bpriority\b/i);
        expect(urgencyText).not.toMatch(/\bp\d+\b/i);

        if (Number(item.priorityRank ?? 99) <= 2) {
          expect(urgencyText).toContain('urgent');
        }
      }
    },
  );

  test(
    '[G2-ATDD-API-003][P1] claimed-thread voicemail remains in mine with explicit indicator and does not churn back to inbox for the owner @P1',
    async ({
      request,
      storyG2Context,
      storyG2MemberHeaders,
      storyG2InboxQuery,
      storyG2MineQuery,
    }) => {
      const mineResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG2Context.paths.inbox}${storyG2MineQuery}`,
        headers: storyG2MemberHeaders,
      });
      const inboxResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG2Context.paths.inbox}${storyG2InboxQuery}`,
        headers: storyG2MemberHeaders,
      });

      expect(mineResponse.status()).toBe(200);
      expect(inboxResponse.status()).toBe(200);

      const mineBody = (await mineResponse.json()) as ConnectShyftEnvelope;
      const inboxBody = (await inboxResponse.json()) as ConnectShyftEnvelope;

      const mineItems = Array.isArray(mineBody.data?.items) ? mineBody.data.items : [];
      const inboxItems = Array.isArray(inboxBody.data?.items) ? inboxBody.data.items : [];

      const mineVoicemail = mineItems.find(
        (item) => item.threadId === storyG2Context.threadIds.voicemailClaimed,
      );

      expect(mineVoicemail).toBeDefined();
      expect(mineVoicemail?.state).toBe('CLAIMED');
      expect(mineVoicemail?.bucket).toBe('mine');
      expect(mineVoicemail?.voicemailIndicator).toBe(true);

      const inboxVoicemail = inboxItems.find(
        (item) => item.threadId === storyG2Context.threadIds.voicemailClaimed,
      );
      expect(inboxVoicemail).toBeUndefined();
    },
  );

  test(
    '[G2-ATDD-API-004][P1] volunteer-primary queue contracts suppress raw state chips priority integers internal identifiers and webhook metadata from primary copy @P1',
    async ({
      request,
      storyG2Context,
      storyG2MemberHeaders,
      storyG2InboxQuery,
      storyG2MineQuery,
    }) => {
      const inboxResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG2Context.paths.inbox}${storyG2InboxQuery}`,
        headers: storyG2MemberHeaders,
      });
      const mineResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG2Context.paths.inbox}${storyG2MineQuery}`,
        headers: storyG2MemberHeaders,
      });

      expect(inboxResponse.status()).toBe(200);
      expect(mineResponse.status()).toBe(200);

      const inboxBody = (await inboxResponse.json()) as ConnectShyftEnvelope;
      const mineBody = (await mineResponse.json()) as ConnectShyftEnvelope;
      const items = [
        ...(Array.isArray(inboxBody.data?.items) ? inboxBody.data.items : []),
        ...(Array.isArray(mineBody.data?.items) ? mineBody.data.items : []),
      ];

      expect(items.length).toBeGreaterThan(0);

      for (const item of items) {
        const loweredPrimaryCopy = collectPrimaryCopyFields(item).join(' ').toLowerCase();
        expect(loweredPrimaryCopy.length).toBeGreaterThan(0);

        for (const forbiddenToken of storyG2Context.forbiddenPrimaryCopyTokens) {
          expect(loweredPrimaryCopy).not.toContain(forbiddenToken);
        }

        for (const knownThreadId of Object.values(storyG2Context.threadIds)) {
          expect(loweredPrimaryCopy).not.toContain(knownThreadId.toLowerCase());
        }

        expect(loweredPrimaryCopy).not.toMatch(UUID_PATTERN);
        expect(loweredPrimaryCopy).not.toMatch(/\bpriority\s*\d+\b/i);

        expect(item.display).not.toHaveProperty('threadId');
        expect(item.display).not.toHaveProperty('priorityRank');
        expect(item.display).not.toHaveProperty('rawStateChip');
        expect(item.display).not.toHaveProperty('routingMetadata');
        expect(item.display).not.toHaveProperty('webhookMetadata');
        expect(item.display).not.toHaveProperty('systemMetadata');
      }
    },
  );
});
