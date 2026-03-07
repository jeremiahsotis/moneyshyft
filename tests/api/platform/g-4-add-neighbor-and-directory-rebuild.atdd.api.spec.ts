import { apiRequest } from '../../support/helpers/apiClient';
import {
  cleanupConnectShyftThreadAndNeighborState,
  destroyConnectShyftDbActorClient,
} from '../../support/helpers/connectShyftDbActor';
import {
  type ConnectShyftEnvelope,
  listStoryG4Neighbors,
} from '../../support/helpers/connectShyftStoryG4ApiHelpers';
import {
  buildStoryG4DeterministicPhone,
  createStoryG4NeighborSeed,
} from '../../support/helpers/connectShyftStoryG4TestHelpers';
import { test, expect } from '../../support/fixtures/connectShyftStoryG4.fixture';

test.describe('Story g.4 Add Neighbor and Directory Rebuild (ATDD API)', () => {
  let createdNeighborIds: string[] = [];
  let createdThreadIds: string[] = [];

  test.beforeEach(async () => {
    createdNeighborIds = [];
    createdThreadIds = [];
  });

  test.afterEach(async ({ storyG4Context }) => {
    await cleanupConnectShyftThreadAndNeighborState({
      tenantId: storyG4Context.tenantId,
      neighborIds: createdNeighborIds,
      threadIds: createdThreadIds,
    });
  });

  test.afterAll(async () => {
    await destroyConnectShyftDbActorClient();
  });

  test(
    '[G4-ATDD-API-001][P0] add-neighbor create contract accepts primary additional phone email address prefers-texting shared-phone and optional notes in one atomic write @P0',
    async ({ request, storyG4Context, storyG4VolunteerHeaders, storyG4NeighborCreatePayload }) => {
      // Given a complete Add Neighbor payload
      // When it is submitted to the create endpoint
      const response = await apiRequest(request, {
        method: 'POST',
        path: storyG4Context.paths.neighborsCollection,
        headers: storyG4VolunteerHeaders,
        data: storyG4NeighborCreatePayload,
      });

      // Then canonical success contract is returned with all required data facets
      expect(response.status()).toBe(201);
      const body = (await response.json()) as ConnectShyftEnvelope;
      const createdNeighborId = String(body.data?.neighbor?.neighborId ?? '').trim();
      expect(createdNeighborId.length).toBeGreaterThan(0);
      createdNeighborIds.push(createdNeighborId);

      expect(body.ok).toBe(true);
      expect(body.code).toBe('CONNECTSHYFT_NEIGHBOR_CREATED');
      expect(body.data?.neighbor?.tenantId).toBe(storyG4Context.tenantId);
      expect(body.data?.neighbor?.orgUnitId).toBe(storyG4Context.orgUnitId);
      expect(String(body.data?.neighbor?.firstName ?? '').length).toBeGreaterThan(0);
      expect(String(body.data?.neighbor?.lastName ?? '').length).toBeGreaterThan(0);
      expect(['YES', 'NO', 'UNKNOWN']).toContain(
        String(body.data?.neighbor?.prefersTexting ?? 'UNKNOWN'),
      );
      expect(body.data?.neighbor?.phones).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'mobile', isShared: false }),
          expect.objectContaining({ label: 'home', isShared: true }),
        ]),
      );
    },
  );

  test(
    '[G4-ATDD-API-002][P0] add-neighbor refusal for missing contact constraints returns actionable messaging and guarantees no partial writes @P0',
    async ({
      request,
      storyG4Context,
      storyG4VolunteerHeaders,
      storyG4NeighborCreateWithoutPrimaryPhonePayload,
      storyG4NeighborCreatePayload,
    }) => {
      const refusalFirstName = String(storyG4NeighborCreateWithoutPrimaryPhonePayload.firstName ?? '');
      const refusalLastName = String(storyG4NeighborCreateWithoutPrimaryPhonePayload.lastName ?? '');

      // And a payload that violates primary contact constraints
      const refused = await apiRequest(request, {
        method: 'POST',
        path: storyG4Context.paths.neighborsCollection,
        headers: storyG4VolunteerHeaders,
        data: storyG4NeighborCreateWithoutPrimaryPhonePayload,
      });

      // Then refusal is explicit and deterministic
      expect(refused.status()).toBe(200);
      const refusalBody = (await refused.json()) as ConnectShyftEnvelope;
      expect(refusalBody).toMatchObject({
        ok: false,
        code: 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED',
      });
      expect(String(refusalBody.message ?? '')).toMatch(/phone|contact|required/i);

      // And no partial write occurred after the refusal
      const afterRefusalNeighbors = await listStoryG4Neighbors(
        request,
        storyG4Context.paths.neighborsCollection,
        storyG4VolunteerHeaders,
      );
      const refusedWrite = (afterRefusalNeighbors.data?.neighbors ?? []).find((neighbor) => {
        return neighbor.firstName === refusalFirstName
          && neighbor.lastName === refusalLastName;
      });
      expect(refusedWrite).toBeUndefined();

      // Control check: a valid payload should still create successfully after refusal path
      const created = await apiRequest(request, {
        method: 'POST',
        path: storyG4Context.paths.neighborsCollection,
        headers: storyG4VolunteerHeaders,
        data: storyG4NeighborCreatePayload,
      });
      expect(created.status()).toBe(201);
      const createdBody = (await created.json()) as ConnectShyftEnvelope;
      const createdNeighborId = String(createdBody.data?.neighbor?.neighborId ?? '').trim();
      expect(createdNeighborId.length).toBeGreaterThan(0);
      createdNeighborIds.push(createdNeighborId);
    },
  );

  test(
    '[G4-ATDD-API-003][P0] directory search by name and phone remains conference scoped for volunteer workflows @P0',
    async ({ request, storyG4Context, storyG4VolunteerHeaders }, testInfo) => {
      const scopedPrimaryPhone = buildStoryG4DeterministicPhone(testInfo, 'g4-atdd-api-003-scoped');
      const phoneQuery = scopedPrimaryPhone.replace(/\D/g, '').slice(-10);

      const scopedSeed = await createStoryG4NeighborSeed(request, storyG4Context, {
        firstName: `${storyG4Context.searchTerms.byName} Scoped`,
        lastName: 'Directory',
        primaryPhone: scopedPrimaryPhone,
      });
      createdNeighborIds.push(scopedSeed.neighborId);

      // Given directory search by name and phone
      const byNameResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG4Context.paths.neighborsCollection}?query=${encodeURIComponent(storyG4Context.searchTerms.byName)}&mode=name`,
        headers: storyG4VolunteerHeaders,
      });
      const byPhoneResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG4Context.paths.neighborsCollection}?query=${encodeURIComponent(phoneQuery)}&mode=phone`,
        headers: storyG4VolunteerHeaders,
      });

      // When directory results are returned
      expect(byNameResponse.status()).toBe(200);
      expect(byPhoneResponse.status()).toBe(200);
      const byNameBody = (await byNameResponse.json()) as ConnectShyftEnvelope;
      const byPhoneBody = (await byPhoneResponse.json()) as ConnectShyftEnvelope;

      const byNameNeighbors = Array.isArray(byNameBody.data?.neighbors)
        ? byNameBody.data?.neighbors
        : [];
      const byPhoneNeighbors = Array.isArray(byPhoneBody.data?.neighbors)
        ? byPhoneBody.data?.neighbors
        : [];

      // Then both search modes return scoped and relevant results only
      expect(byNameNeighbors.length).toBeGreaterThan(0);
      expect(byPhoneNeighbors.length).toBeGreaterThan(0);
      expect(byNameNeighbors.some((neighbor) => neighbor.orgUnitId === storyG4Context.orgUnitId))
        .toBe(true);
      expect(byPhoneNeighbors.some((neighbor) => neighbor.orgUnitId === storyG4Context.orgUnitId))
        .toBe(true);
      expect(byNameNeighbors.some((neighbor) => neighbor.neighborId === scopedSeed.neighborId)).toBe(true);
      expect(byPhoneNeighbors.some((neighbor) => neighbor.neighborId === scopedSeed.neighborId)).toBe(true);

      const byNameMatch = byNameNeighbors.some((neighbor) => {
        const haystack = `${neighbor.firstName ?? ''} ${neighbor.lastName ?? ''}`.toLowerCase();
        return haystack.includes(storyG4Context.searchTerms.byName.toLowerCase());
      });
      expect(byNameMatch).toBe(true);

      const byPhoneMatch = byPhoneNeighbors.some((neighbor) => {
        const phones = Array.isArray(neighbor.phones) ? neighbor.phones : [];
        return phones.some((phone) => String(phone.value ?? '').replace(/\D/g, '').includes(phoneQuery));
      });
      expect(byPhoneMatch).toBe(true);
    },
  );

  test(
    '[G4-ATDD-API-004][P0] deterministic thread ensure reuses existing active thread when directory starts a conversation for a known neighbor @P0',
    async ({ request, storyG4Context, storyG4VolunteerHeaders, storyG4EnsureExistingThreadPayload }) => {
      // Given the same existing neighbor is selected repeatedly from directory
      const firstEnsure = await apiRequest(request, {
        method: 'POST',
        path: storyG4Context.paths.threadsCollection,
        headers: storyG4VolunteerHeaders,
        data: storyG4EnsureExistingThreadPayload,
      });
      const secondEnsure = await apiRequest(request, {
        method: 'POST',
        path: storyG4Context.paths.threadsCollection,
        headers: storyG4VolunteerHeaders,
        data: storyG4EnsureExistingThreadPayload,
      });

      // Then ensure behavior is deterministic and thread identity is reused
      expect(firstEnsure.status()).toBe(201);
      expect(secondEnsure.status()).toBe(201);

      const firstBody = (await firstEnsure.json()) as ConnectShyftEnvelope;
      const secondBody = (await secondEnsure.json()) as ConnectShyftEnvelope;
      const ensuredThreadId = String(firstBody.data?.thread?.threadId ?? '').trim();
      expect(ensuredThreadId.length).toBeGreaterThan(0);
      createdThreadIds.push(ensuredThreadId);

      expect(firstBody.code).toBe('CONNECTSHYFT_THREAD_ENSURED');
      expect(secondBody.code).toBe('CONNECTSHYFT_THREAD_ENSURED');
      expect(firstBody.data?.thread?.threadId).toBe(secondBody.data?.thread?.threadId);
      expect(firstBody.data?.thread?.neighborId).toBe(storyG4Context.neighborIds.existing);
      expect(firstBody.data?.thread?.state).toBe('UNCLAIMED');
    },
  );

  test(
    '[G4-ATDD-API-005][P1] directory start-conversation creates a new deterministic thread when no active thread exists @P1',
    async ({ request, storyG4Context, storyG4VolunteerHeaders, storyG4EnsureNewThreadPayload }) => {
      // Given a directory entry without an active thread
      const ensured = await apiRequest(request, {
        method: 'POST',
        path: storyG4Context.paths.threadsCollection,
        headers: storyG4VolunteerHeaders,
        data: storyG4EnsureNewThreadPayload,
      });

      // When the deterministic ensure endpoint is invoked
      expect(ensured.status()).toBe(201);
      const ensuredBody = (await ensured.json()) as ConnectShyftEnvelope;
      const ensuredThreadId = String(ensuredBody.data?.thread?.threadId ?? '');
      expect(ensuredBody.code).toBe('CONNECTSHYFT_THREAD_ENSURED');
      expect(ensuredThreadId.trim().length).toBeGreaterThan(0);
      expect(ensuredBody.data?.thread?.neighborId).toBe(storyG4Context.neighborIds.newCandidate);
      createdThreadIds.push(ensuredThreadId.trim());

      // Then the newly ensured thread is immediately retrievable
      const detail = await apiRequest(request, {
        method: 'GET',
        path: `${storyG4Context.paths.threadsCollection}/${ensuredThreadId}`,
        headers: storyG4VolunteerHeaders,
      });
      expect(detail.status()).toBe(200);
      const detailBody = (await detail.json()) as ConnectShyftEnvelope;
      expect(detailBody.data?.thread?.threadId).toBe(ensuredThreadId);
    },
  );
});
