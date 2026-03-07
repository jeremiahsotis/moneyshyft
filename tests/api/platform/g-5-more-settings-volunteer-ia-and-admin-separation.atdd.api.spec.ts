import { test, expect } from '../../support/fixtures/connectShyftStoryG5.fixture';
import { apiRequest } from '../../support/helpers/apiClient';

type ConnectShyftEnvelope = {
  ok?: boolean;
  code?: string;
  message?: string;
  refusalType?: string;
  data?: {
    primaryOptions?: Array<{ key?: string; label?: string }>;
    adminOptions?: Array<{ key?: string; label?: string }>;
    pathways?: Array<{ path?: string; allowed?: boolean }>;
  };
};

test.describe('Story g.5 More/Settings Volunteer IA and Admin Separation (ATDD API)', () => {
  test(
    '[G5-ATDD-API-001][P0] volunteer settings navigation profile resolves volunteer-first IA options and excludes admin controls @P0',
    async ({ request, storyG5Context, storyG5VolunteerHeaders }) => {
      const response = await apiRequest(request, {
        method: 'GET',
        path: storyG5Context.paths.settingsNavigation,
        headers: storyG5VolunteerHeaders,
      });

      expect(response.status()).toBe(200);
      const body = (await response.json()) as ConnectShyftEnvelope;
      expect(body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_SETTINGS_NAVIGATION_RESOLVED',
      });

      expect(body.data?.primaryOptions ?? []).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'directory' }),
          expect.objectContaining({ key: 'settings' }),
          expect.objectContaining({ key: 'notification-preferences' }),
          expect.objectContaining({ key: 'display-preferences' }),
          expect.objectContaining({ key: 'sign-out' }),
        ]),
      );
      expect(body.data?.adminOptions ?? []).toHaveLength(0);
    },
  );

  test(
    '[G5-ATDD-API-002][P0] volunteer access to availability endpoint is refused with refusal envelope guidance @P0',
    async ({ request, storyG5Context, storyG5VolunteerHeaders }) => {
      const response = await apiRequest(request, {
        method: 'GET',
        path: `${storyG5Context.paths.availability}?orgUnitId=${encodeURIComponent(storyG5Context.orgUnitId)}`,
        headers: storyG5VolunteerHeaders,
      });

      expect(response.status()).toBe(200);
      const body = (await response.json()) as ConnectShyftEnvelope;
      expect(body).toMatchObject({
        ok: false,
        code: 'CONNECTSHYFT_AVAILABILITY_FORBIDDEN',
        refusalType: 'business',
      });
      expect(String(body.message ?? '')).toMatch(/authorized|role|admin|permission/i);
    },
  );

  test(
    '[G5-ATDD-API-003][P0] volunteer access to number mapping and escalation config endpoints is refused without privileged payload leakage @P0',
    async ({ request, storyG5Context, storyG5VolunteerHeaders }) => {
      const numbersResponse = await apiRequest(request, {
        method: 'GET',
        path: storyG5Context.paths.numbersCollection,
        headers: storyG5VolunteerHeaders,
      });
      const escalationResponse = await apiRequest(request, {
        method: 'GET',
        path: storyG5Context.paths.escalationConfig,
        headers: storyG5VolunteerHeaders,
      });

      expect(numbersResponse.status()).toBe(200);
      expect(escalationResponse.status()).toBe(200);

      const numbersBody = (await numbersResponse.json()) as ConnectShyftEnvelope;
      const escalationBody = (await escalationResponse.json()) as ConnectShyftEnvelope;

      expect(numbersBody).toMatchObject({
        ok: false,
        code: 'CONNECTSHYFT_NUMBER_MAPPING_FORBIDDEN',
        refusalType: 'business',
      });
      expect(escalationBody).toMatchObject({
        ok: false,
        code: 'CONNECTSHYFT_ESCALATION_CONFIG_FORBIDDEN',
        refusalType: 'business',
      });

      expect(numbersBody).not.toHaveProperty('data.mappings');
      expect(escalationBody).not.toHaveProperty('data.recipients');
    },
  );

  test(
    '[G5-ATDD-API-004][P1] authorized admin role can resolve explicit admin settings pathways while volunteer pathways remain unchanged @P1',
    async ({ request, storyG5Context, storyG5AdminHeaders, storyG5VolunteerHeaders }) => {
      const adminNavigation = await apiRequest(request, {
        method: 'GET',
        path: storyG5Context.paths.settingsNavigation,
        headers: storyG5AdminHeaders,
      });
      const volunteerNavigation = await apiRequest(request, {
        method: 'GET',
        path: storyG5Context.paths.settingsNavigation,
        headers: storyG5VolunteerHeaders,
      });

      expect(adminNavigation.status()).toBe(200);
      expect(volunteerNavigation.status()).toBe(200);

      const adminBody = (await adminNavigation.json()) as ConnectShyftEnvelope;
      const volunteerBody = (await volunteerNavigation.json()) as ConnectShyftEnvelope;

      expect(adminBody).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_SETTINGS_NAVIGATION_RESOLVED',
      });
      expect(volunteerBody).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_SETTINGS_NAVIGATION_RESOLVED',
      });

      expect((adminBody.data?.adminOptions ?? []).length).toBeGreaterThan(0);
      expect(volunteerBody.data?.adminOptions ?? []).toHaveLength(0);
    },
  );

  test(
    '[G5-ATDD-API-005][P0] role and scope context refresh immediately re-evaluates admin pathway access and returns refusal after downgrade @P0',
    async ({ request, storyG5Context, storyG5AdminHeaders, storyG5ViewerHeaders }) => {
      const adminAccess = await apiRequest(request, {
        method: 'GET',
        path: storyG5Context.paths.settingsNavigation,
        headers: storyG5AdminHeaders,
      });
      const downgradedAccess = await apiRequest(request, {
        method: 'GET',
        path: storyG5Context.paths.settingsNavigation,
        headers: storyG5ViewerHeaders,
      });

      expect(adminAccess.status()).toBe(200);
      expect(downgradedAccess.status()).toBe(200);

      const adminBody = (await adminAccess.json()) as ConnectShyftEnvelope;
      const downgradedBody = (await downgradedAccess.json()) as ConnectShyftEnvelope;

      expect((adminBody.data?.adminOptions ?? []).length).toBeGreaterThan(0);
      expect(downgradedBody).toMatchObject({
        ok: false,
        code: 'CONNECTSHYFT_SETTINGS_NAVIGATION_FORBIDDEN',
        refusalType: 'business',
      });
      expect(String(downgradedBody.message ?? '')).toMatch(/authorized|permission|role/i);
    },
  );
});
