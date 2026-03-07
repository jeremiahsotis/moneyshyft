import { test, expect } from '../../support/fixtures/connectShyftStoryG5.fixture';
import { apiRequest } from '../../support/helpers/apiClient';
import { createStoryG5Headers } from '../../support/factories/connectShyftStoryG5Factory';

type ConnectShyftEnvelope = {
  ok?: boolean;
  code?: string;
  message?: string;
  refusalType?: string;
  data?: {
    primaryOptions?: Array<{ key?: string; label?: string; path?: string }>;
    adminOptions?: Array<{ key?: string; label?: string; path?: string }>;
    pathways?: Array<{ path?: string; allowed?: boolean }>;
    capabilities?: {
      module?: boolean;
      inbox?: boolean;
      escalation?: boolean;
      webhooks?: boolean;
    };
  };
};

const ADMIN_PATHS = [
  '/app/connectshyft/settings/availability',
  '/app/connectshyft/settings/numbers',
  '/app/connectshyft/settings/escalation',
] as const;

test.describe('Story g.5 More/Settings Volunteer IA and Admin Separation (Automate API Expansion)', () => {
  test(
    '[G5-AUTO-API-301][P0] volunteer settings navigation keeps primary pathways allowed while marking admin pathways denied @P0',
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

      const pathways = Array.isArray(body.data?.pathways) ? body.data?.pathways : [];

      const primaryPaths = new Set(
        (body.data?.primaryOptions ?? [])
          .map((option) => String(option.path ?? '').trim())
          .filter((path) => path.length > 0),
      );
      expect(primaryPaths.size).toBeGreaterThan(0);

      for (const primaryPath of primaryPaths) {
        expect(pathways).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: primaryPath,
              allowed: true,
            }),
          ]),
        );
      }

      expect(body.data?.adminOptions ?? []).toHaveLength(0);
      for (const adminPath of ADMIN_PATHS) {
        expect(pathways).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: adminPath,
              allowed: false,
            }),
          ]),
        );
      }
    },
  );

  test(
    '[G5-AUTO-API-302][P0] orgUnit admin settings navigation exposes all explicit admin pathways with allowed=true @P0',
    async ({ request, storyG5Context, storyG5AdminHeaders }) => {
      const response = await apiRequest(request, {
        method: 'GET',
        path: storyG5Context.paths.settingsNavigation,
        headers: storyG5AdminHeaders,
      });

      expect(response.status()).toBe(200);
      const body = (await response.json()) as ConnectShyftEnvelope;

      expect(body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_SETTINGS_NAVIGATION_RESOLVED',
      });

      expect(body.data?.adminOptions ?? []).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'availability', path: ADMIN_PATHS[0] }),
          expect.objectContaining({ key: 'number-mappings', path: ADMIN_PATHS[1] }),
          expect.objectContaining({ key: 'escalation-configuration', path: ADMIN_PATHS[2] }),
        ]),
      );

      for (const adminPath of ADMIN_PATHS) {
        expect(body.data?.pathways ?? []).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: adminPath,
              allowed: true,
            }),
          ]),
        );
      }
    },
  );

  test(
    '[G5-AUTO-API-303][P0] orgUnit admin without orgUnit membership receives forbidden navigation with no admin option leakage @P0',
    async ({ request, storyG5Context }) => {
      const nonMemberAdminHeaders = createStoryG5Headers(storyG5Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyG5Context.orgUnitAdminUserId,
        orgUnitMemberships: [],
      });

      const response = await apiRequest(request, {
        method: 'GET',
        path: storyG5Context.paths.settingsNavigation,
        headers: nonMemberAdminHeaders,
      });

      expect(response.status()).toBe(200);
      const body = (await response.json()) as ConnectShyftEnvelope;

      expect(body).toMatchObject({
        ok: false,
        code: 'CONNECTSHYFT_SETTINGS_NAVIGATION_FORBIDDEN',
        refusalType: 'business',
      });

      expect(body.data?.adminOptions ?? []).toHaveLength(0);
      for (const adminPath of ADMIN_PATHS) {
        expect(body.data?.pathways ?? []).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: adminPath,
              allowed: false,
            }),
          ]),
        );
      }
    },
  );

  test(
    '[G5-AUTO-API-304][P1] availability refusal preserves capability matrix for volunteer actors without exposing admin configuration payload @P1',
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
        data: {
          capabilities: {
            module: true,
            inbox: true,
            escalation: true,
            webhooks: true,
          },
        },
      });
      expect(String(body.message ?? '')).toMatch(/authorized|admin|role/i);
      expect(body).not.toHaveProperty('data.recipients');
      expect(body).not.toHaveProperty('data.escalationBaselineHours');
    },
  );
});
