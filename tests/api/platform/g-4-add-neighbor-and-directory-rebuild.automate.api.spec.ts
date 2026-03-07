import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryG4.fixture';
import { createStoryG4NeighborCreatePayload } from '../../support/factories/connectShyftStoryG4Factory';

type ConnectShyftNeighborPhone = {
  label?: string;
  value?: string;
  isShared?: boolean;
  isPrimary?: boolean;
};

type ConnectShyftNeighbor = {
  neighborId?: string;
  orgUnitId?: string;
  phones?: ConnectShyftNeighborPhone[];
};

type ConnectShyftEnvelope = {
  ok?: boolean;
  code?: string;
  message?: string;
  data?: {
    thread?: {
      threadId?: string;
      state?: string;
      neighborId?: string;
    };
    lifecycle?: {
      createdNewThread?: boolean;
      reusedThreadId?: string;
      ensuredActiveThread?: boolean;
    };
    neighbor?: ConnectShyftNeighbor;
    neighbors?: ConnectShyftNeighbor[];
    fieldErrors?: Array<{
      field?: string;
      reason?: string;
      message?: string;
    }>;
  };
};

const buildUniquePhone = (suffixSeed: string): string => {
  const digits = suffixSeed.replace(/\D/g, '').slice(-4).padStart(4, '0');
  return `+1260555${digits}`;
};

const listNeighbors = async (
  request: Parameters<typeof apiRequest>[0],
  path: string,
  headers: Record<string, string>,
): Promise<ConnectShyftEnvelope> => {
  const response = await apiRequest(request, {
    method: 'GET',
    path,
    headers,
  });

  expect(response.status()).toBe(200);
  return (await response.json()) as ConnectShyftEnvelope;
};

test.describe('Story g.4 Add Neighbor and Directory Rebuild (Automate API Expansion)', () => {
  test(
    '[G4-AUTO-API-301][P0] deterministic ensure for known active neighbor returns lifecycle reuse metadata with createdNewThread=false @P0',
    async ({ request, storyG4Context, storyG4VolunteerHeaders, storyG4EnsureExistingThreadPayload }) => {
      const firstEnsureResponse = await apiRequest(request, {
        method: 'POST',
        path: storyG4Context.paths.threadsCollection,
        headers: storyG4VolunteerHeaders,
        data: storyG4EnsureExistingThreadPayload,
      });

      const secondEnsureResponse = await apiRequest(request, {
        method: 'POST',
        path: storyG4Context.paths.threadsCollection,
        headers: storyG4VolunteerHeaders,
        data: storyG4EnsureExistingThreadPayload,
      });

      expect(firstEnsureResponse.status()).toBe(201);
      expect(secondEnsureResponse.status()).toBe(201);

      const firstBody = (await firstEnsureResponse.json()) as ConnectShyftEnvelope;
      const secondBody = (await secondEnsureResponse.json()) as ConnectShyftEnvelope;

      const firstThreadId = String(firstBody.data?.thread?.threadId ?? '').trim();
      expect(firstThreadId.length).toBeGreaterThan(0);

      expect(firstBody).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_THREAD_ENSURED',
        data: {
          thread: {
            neighborId: storyG4Context.neighborIds.existing,
            state: 'UNCLAIMED',
          },
          lifecycle: {
            ensuredActiveThread: true,
          },
        },
      });

      expect(secondBody).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_THREAD_ENSURED',
        data: {
          thread: {
            threadId: firstThreadId,
            neighborId: storyG4Context.neighborIds.existing,
            state: 'UNCLAIMED',
          },
          lifecycle: {
            ensuredActiveThread: true,
            createdNewThread: false,
            reusedThreadId: firstThreadId,
          },
        },
      });
    },
  );

  test(
    '[G4-AUTO-API-302][P0] ensure lifecycle for a newly created neighbor is deterministic across first and second invocation @P0',
    async ({ request, storyG4Context, storyG4VolunteerHeaders, storyG4NeighborCreatePayload }) => {
      const seedSuffix = Date.now().toString();
      const seededNeighborResponse = await apiRequest(request, {
        method: 'POST',
        path: storyG4Context.paths.neighborsCollection,
        headers: storyG4VolunteerHeaders,
        data: {
          ...storyG4NeighborCreatePayload,
          firstName: 'G4',
          lastName: `AutoEnsure${seedSuffix.slice(-4)}`,
          phones: [
            {
              label: 'mobile',
              value: buildUniquePhone(seedSuffix),
              isShared: false,
            },
          ],
        },
      });

      expect(seededNeighborResponse.status()).toBe(201);
      const seededNeighborBody = (await seededNeighborResponse.json()) as ConnectShyftEnvelope;
      const neighborId = String(seededNeighborBody.data?.neighbor?.neighborId ?? '').trim();
      expect(neighborId.length).toBeGreaterThan(0);

      const ensurePayload = {
        orgUnitId: storyG4Context.orgUnitId,
        neighborId,
        source: 'DIRECTORY',
        lastInboundCsNumberId: 'cs-number-g4-auto-inbound',
        preferredOutboundCsNumberId: 'cs-number-g4-auto-outbound',
      };

      const firstEnsure = await apiRequest(request, {
        method: 'POST',
        path: storyG4Context.paths.threadsCollection,
        headers: storyG4VolunteerHeaders,
        data: ensurePayload,
      });

      const secondEnsure = await apiRequest(request, {
        method: 'POST',
        path: storyG4Context.paths.threadsCollection,
        headers: storyG4VolunteerHeaders,
        data: ensurePayload,
      });

      expect(firstEnsure.status()).toBe(201);
      expect(secondEnsure.status()).toBe(201);

      const firstBody = (await firstEnsure.json()) as ConnectShyftEnvelope;
      const secondBody = (await secondEnsure.json()) as ConnectShyftEnvelope;

      const firstThreadId = String(firstBody.data?.thread?.threadId ?? '').trim();
      expect(firstThreadId.length).toBeGreaterThan(0);

      expect(firstBody.data?.lifecycle?.ensuredActiveThread).toBe(true);
      expect(firstBody.data?.lifecycle?.createdNewThread).toBe(true);
      expect(firstBody.data?.lifecycle?.reusedThreadId).toBeUndefined();

      expect(secondBody.data?.thread?.threadId).toBe(firstThreadId);
      expect(secondBody.data?.lifecycle?.ensuredActiveThread).toBe(true);
      expect(secondBody.data?.lifecycle?.createdNewThread).toBe(false);
      expect(secondBody.data?.lifecycle?.reusedThreadId).toBe(firstThreadId);
    },
  );

  test(
    '[G4-AUTO-API-303][P1] add-neighbor creation preserves shared-phone metadata and canonical phone formatting in returned neighbor profile @P1',
    async ({ request, storyG4Context, storyG4VolunteerHeaders }) => {
      const seedSuffix = (Date.now() + 37).toString();
      const primaryPhone = buildUniquePhone(seedSuffix);
      const secondaryPhone = buildUniquePhone((Date.now() + 81).toString());

      const payload = createStoryG4NeighborCreatePayload(storyG4Context, {
        firstName: 'G4',
        lastName: `AutoShared${seedSuffix.slice(-4)}`,
        phones: [
          {
            label: 'mobile',
            value: primaryPhone,
            isShared: true,
          },
          {
            label: 'home',
            value: secondaryPhone,
            isShared: false,
          },
        ],
      });

      const response = await apiRequest(request, {
        method: 'POST',
        path: storyG4Context.paths.neighborsCollection,
        headers: storyG4VolunteerHeaders,
        data: payload,
      });

      expect(response.status()).toBe(201);
      const body = (await response.json()) as ConnectShyftEnvelope;

      expect(body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
      });

      expect(body.data?.neighbor?.phones).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: 'mobile',
            value: primaryPhone,
            isShared: true,
            isPrimary: true,
          }),
          expect.objectContaining({
            label: 'home',
            value: secondaryPhone,
            isShared: false,
            isPrimary: false,
          }),
        ]),
      );
    },
  );

  test(
    '[G4-AUTO-API-304][P1] refusal path for missing phone returns actionable field error and guarantees no partial create side effects @P1',
    async ({
      request,
      storyG4Context,
      storyG4VolunteerHeaders,
    }) => {
      const seedSuffix = (Date.now() + 101).toString();
      const refusalFirstName = 'G4';
      const refusalLastName = `AutoRefusal${seedSuffix.slice(-4)}`;
      const refusalPayload = createStoryG4NeighborCreatePayload(storyG4Context, {
        firstName: refusalFirstName,
        lastName: refusalLastName,
        phones: [],
      });

      const refusedResponse = await apiRequest(request, {
        method: 'POST',
        path: storyG4Context.paths.neighborsCollection,
        headers: storyG4VolunteerHeaders,
        data: refusalPayload,
      });

      expect(refusedResponse.status()).toBe(200);
      const refusalBody = (await refusedResponse.json()) as ConnectShyftEnvelope;
      expect(refusalBody).toMatchObject({
        ok: false,
        code: 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED',
      });
      expect(refusalBody.data?.fieldErrors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'phones',
            reason: 'REQUIRED',
            message: expect.stringMatching(/phone|contact|required/i),
          }),
        ]),
      );

      const afterRefusal = await listNeighbors(
        request,
        storyG4Context.paths.neighborsCollection,
        storyG4VolunteerHeaders,
      );
      const matchingNeighbor = (afterRefusal.data?.neighbors ?? []).find((neighbor) => {
        return neighbor.firstName === refusalFirstName
          && neighbor.lastName === refusalLastName;
      });
      expect(matchingNeighbor).toBeUndefined();
    },
  );
});
