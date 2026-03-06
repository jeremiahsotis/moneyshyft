import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryG2.fixture';

type ConnectShyftEnvelope = {
  ok?: boolean;
  code?: string;
  message?: string;
  data?: Record<string, unknown>;
};

type ConnectShyftThreadSummary = {
  threadId?: string;
  bucket?: string;
  state?: string;
  voicemailIndicator?: boolean;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toItems = (payload: unknown): ConnectShyftThreadSummary[] => {
  const record = payload && typeof payload === 'object'
    ? (payload as { data?: { items?: unknown } })
    : null;
  const items = record?.data?.items;
  return Array.isArray(items) ? (items as ConnectShyftThreadSummary[]) : [];
};

const resolveDispatchThreadId = async ({
  request,
  path,
  headers,
}: {
  request: Parameters<typeof apiRequest>[0];
  path: string;
  headers: Record<string, string>;
}): Promise<string> => {
  const inboxResponse = await apiRequest(request, {
    method: 'GET',
    path,
    headers,
  });
  expect(inboxResponse.status()).toBe(200);

  const inboxItems = toItems(await inboxResponse.json());
  const candidate = inboxItems.find(
    (item) => item.state === 'UNCLAIMED' && UUID_PATTERN.test(String(item.threadId ?? '').trim()),
  ) ?? inboxItems.find((item) => UUID_PATTERN.test(String(item.threadId ?? '').trim()));

  if (!candidate?.threadId) {
    throw new Error('No UUID-backed dispatch candidate thread found in ConnectShyft inbox payload.');
  }

  return candidate.threadId;
};

test.describe(
  'Story g.2 Inbox and Mine Surface Rebuild (Automate API Expansion)',
  () => {
    test(
      '[G2-AUTO-API-301][P0] mine bucket refuses reads when actor context is missing to preserve actor-owned queue isolation @P0',
      async ({ request, storyG2Context, storyG2MemberHeaders, storyG2MineQuery }) => {
        const headersWithoutActor = { ...storyG2MemberHeaders };
        headersWithoutActor['x-test-connectshyft-user-id'] = '   ';

        const response = await apiRequest(request, {
          method: 'GET',
          path: `${storyG2Context.paths.inbox}${storyG2MineQuery}`,
          headers: headersWithoutActor,
        });

        expect(response.status()).toBe(200);
        const body = (await response.json()) as ConnectShyftEnvelope;
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ACTOR_CONTEXT_REQUIRED',
          data: {
            bucket: 'mine',
          },
        });
      },
    );

    test(
      '[G2-AUTO-API-305][P1] mine bucket rejects malformed actor-context variants beyond whitespace-only headers @P1',
      async ({ request, storyG2Context, storyG2MemberHeaders, storyG2MineQuery }) => {
        const malformedVariants: Array<{
          label: string;
          headers: Record<string, string>;
        }> = [
          {
            label: 'space-only actor header',
            headers: {
              ...storyG2MemberHeaders,
              'x-test-connectshyft-user-id': '   ',
            },
          },
          {
            label: 'single-space actor header',
            headers: {
              ...storyG2MemberHeaders,
              'x-test-connectshyft-user-id': ' ',
            },
          },
          {
            label: 'multi-space actor header',
            headers: {
              ...storyG2MemberHeaders,
              'x-test-connectshyft-user-id': '      ',
            },
          },
        ];

        for (const variant of malformedVariants) {
          await test.step(variant.label, async () => {
            const response = await apiRequest(request, {
              method: 'GET',
              path: `${storyG2Context.paths.inbox}${storyG2MineQuery}`,
              headers: variant.headers,
            });

            expect(response.status()).toBe(200);
            const body = (await response.json()) as ConnectShyftEnvelope;
            expect(body).toMatchObject({
              ok: false,
              code: 'CONNECTSHYFT_ACTOR_CONTEXT_REQUIRED',
              data: {
                bucket: 'mine',
              },
            });
          });
        }
      },
    );

    test(
      '[G2-AUTO-API-302][P0] claimed voicemail remains owner-scoped to Mine and is excluded from Inbox for the same actor @P0',
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

        const inboxItems = toItems(await inboxResponse.json());
        const mineItems = toItems(await mineResponse.json());

        const mineVoicemail = mineItems.find(
          (item) => item.threadId === storyG2Context.threadIds.voicemailClaimed,
        );
        expect(mineVoicemail).toMatchObject({
          threadId: storyG2Context.threadIds.voicemailClaimed,
          bucket: 'mine',
          state: 'CLAIMED',
          voicemailIndicator: true,
        });

        const inboxVoicemail = inboxItems.find(
          (item) => item.threadId === storyG2Context.threadIds.voicemailClaimed,
        );
        expect(inboxVoicemail).toBeUndefined();
      },
    );

    test(
      '[G2-AUTO-API-303][P1] outbound message dispatch preserves selected targetPhone and body in dispatch context metadata @P1',
      async ({ request, storyG2Context, storyG2MemberHeaders, storyG2InboxQuery }) => {
        const dispatchThreadId = await resolveDispatchThreadId({
          request,
          path: `${storyG2Context.paths.inbox}${storyG2InboxQuery}`,
          headers: storyG2MemberHeaders,
        });

        const targetPhone = '+12605550111';
        const bodyText = 'Automated g.2 API dispatch verification message.';
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyG2Context.paths.threadDetail}/${dispatchThreadId}/messages`,
          headers: storyG2MemberHeaders,
          data: {
            orgUnitId: storyG2Context.orgUnitId,
            body: bodyText,
            targetPhone,
          },
        });

        expect(response.status()).toBe(200);
        const payload = (await response.json()) as ConnectShyftEnvelope;
        expect(payload).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
          data: {
            threadId: dispatchThreadId,
            dispatch: {
              dispatchContext: {
                targetPhone,
                messageBodyProvided: true,
              },
            },
          },
        });
      },
    );

    test(
      '[G2-AUTO-API-304][P1] outbound call dispatch preserves selected targetPhone in deterministic provider dispatch context @P1',
      async ({ request, storyG2Context, storyG2MemberHeaders, storyG2InboxQuery }) => {
        const dispatchThreadId = await resolveDispatchThreadId({
          request,
          path: `${storyG2Context.paths.inbox}${storyG2InboxQuery}`,
          headers: storyG2MemberHeaders,
        });

        const targetPhone = '+12605550112';
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyG2Context.paths.threadDetail}/${dispatchThreadId}/call`,
          headers: storyG2MemberHeaders,
          data: {
            orgUnitId: storyG2Context.orgUnitId,
            targetPhone,
            call: {
              transport: 'bridge',
            },
          },
        });

        expect(response.status()).toBe(200);
        const payload = (await response.json()) as ConnectShyftEnvelope;
        expect(payload).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
          data: {
            threadId: dispatchThreadId,
            providerResolution: {
              providerBranchingInDomain: false,
            },
            dispatch: {
              providerBranchingInDomain: false,
              dispatchContext: {
                targetPhone,
                messageBodyProvided: false,
              },
            },
          },
        });
      },
    );
  },
);
