import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryG4.fixture';

type ConnectShyftNeighbor = {
  neighborId?: string;
  tenantId?: string;
  orgUnitId?: string;
  firstName?: string;
  lastName?: string;
  prefersTexting?: string;
  email?: string;
  notes?: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  phones?: Array<{
    label?: string;
    value?: string;
    isShared?: boolean;
  }>;
};

type ConnectShyftEnvelope = {
  ok?: boolean;
  code?: string;
  message?: string;
  data?: {
    neighbor?: ConnectShyftNeighbor;
    neighbors?: ConnectShyftNeighbor[];
    thread?: {
      threadId?: string;
      state?: string;
      neighborId?: string;
      orgUnitId?: string;
    };
  };
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

test.describe('Story g.4 Add Neighbor and Directory Rebuild (ATDD API RED)', () => {
  test.skip(
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
      expect(body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
        data: {
          neighbor: expect.objectContaining({
            tenantId: storyG4Context.tenantId,
            orgUnitId: storyG4Context.orgUnitId,
            firstName: expect.any(String),
            lastName: expect.any(String),
            prefersTexting: 'YES',
            email: expect.any(String),
            notes: expect.any(String),
            address: expect.objectContaining({
              line1: expect.any(String),
              city: expect.any(String),
              state: expect.any(String),
              postalCode: expect.any(String),
            }),
            phones: expect.arrayContaining([
              expect.objectContaining({ label: 'mobile', isShared: false }),
              expect.objectContaining({ label: 'home', isShared: true }),
            ]),
          }),
        },
      });
    },
  );

  test.skip(
    '[G4-ATDD-API-002][P0] add-neighbor refusal for missing contact constraints returns actionable messaging and guarantees no partial writes @P0',
    async ({
      request,
      storyG4Context,
      storyG4VolunteerHeaders,
      storyG4NeighborCreateWithoutPrimaryPhonePayload,
      storyG4NeighborCreatePayload,
    }) => {
      // Given an existing baseline neighbor list
      const baselineNeighbors = await listNeighbors(
        request,
        storyG4Context.paths.neighborsCollection,
        storyG4VolunteerHeaders,
      );
      const baselineCount = Array.isArray(baselineNeighbors.data?.neighbors)
        ? baselineNeighbors.data?.neighbors.length
        : 0;

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
      const afterRefusalNeighbors = await listNeighbors(
        request,
        storyG4Context.paths.neighborsCollection,
        storyG4VolunteerHeaders,
      );
      const afterRefusalCount = Array.isArray(afterRefusalNeighbors.data?.neighbors)
        ? afterRefusalNeighbors.data?.neighbors.length
        : 0;
      expect(afterRefusalCount).toBe(baselineCount);

      // Control check: a valid payload should still create successfully after refusal path
      const created = await apiRequest(request, {
        method: 'POST',
        path: storyG4Context.paths.neighborsCollection,
        headers: storyG4VolunteerHeaders,
        data: storyG4NeighborCreatePayload,
      });
      expect(created.status()).toBe(201);
    },
  );

  test.skip(
    '[G4-ATDD-API-003][P0] directory search by name and phone remains conference scoped for volunteer workflows @P0',
    async ({ request, storyG4Context, storyG4VolunteerHeaders }) => {
      // Given directory search by name and phone
      const byNameResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG4Context.paths.neighborsCollection}?query=${encodeURIComponent(storyG4Context.searchTerms.byName)}&mode=name`,
        headers: storyG4VolunteerHeaders,
      });
      const byPhoneResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyG4Context.paths.neighborsCollection}?query=${encodeURIComponent(storyG4Context.searchTerms.byPhone)}&mode=phone`,
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

      for (const neighbor of [...byNameNeighbors, ...byPhoneNeighbors]) {
        expect(neighbor.orgUnitId).toBe(storyG4Context.orgUnitId);
        expect(neighbor.orgUnitId).not.toBe(storyG4Context.crossScopeOrgUnitId);
      }

      const byNameMatch = byNameNeighbors.some((neighbor) => {
        const haystack = `${neighbor.firstName ?? ''} ${neighbor.lastName ?? ''}`.toLowerCase();
        return haystack.includes(storyG4Context.searchTerms.byName.toLowerCase());
      });
      expect(byNameMatch).toBe(true);

      const byPhoneMatch = byPhoneNeighbors.some((neighbor) => {
        const phones = Array.isArray(neighbor.phones) ? neighbor.phones : [];
        return phones.some((phone) => String(phone.value ?? '').replace(/\D/g, '').includes(storyG4Context.searchTerms.byPhone));
      });
      expect(byPhoneMatch).toBe(true);
    },
  );

  test.skip(
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

      expect(firstBody.code).toBe('CONNECTSHYFT_THREAD_ENSURED');
      expect(secondBody.code).toBe('CONNECTSHYFT_THREAD_ENSURED');
      expect(firstBody.data?.thread?.threadId).toBe(secondBody.data?.thread?.threadId);
      expect(firstBody.data?.thread?.threadId).toBe(storyG4Context.threadIds.existingActive);
      expect(firstBody.data?.thread?.state).toBe('UNCLAIMED');
    },
  );

  test.skip(
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
