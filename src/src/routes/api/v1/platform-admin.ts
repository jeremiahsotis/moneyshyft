import { Request, Response, Router } from 'express';
import type { Knex } from 'knex';
import db from '../../../config/knex';
import { authenticateToken } from '../../../middleware/auth';
import { generateInvitationCode } from '../../../utils/invitationCode';
import { executePlatformMutation } from '../../../platform/mutations/executePlatformMutation';
import { refusal, success, systemError } from '../../../platform/envelopes/response';
import {
  CAPABILITIES,
  Capability,
  hasCapability,
  normalizeRole,
  ScopedRole,
} from '../../../platform/rbac/capabilities';

const router = Router();

type RoleSetInput = Array<string | null | undefined>;

const normalizeRoleSet = (input: RoleSetInput): ScopedRole[] => {
  const resolved: ScopedRole[] = [];
  const seen = new Set<string>();

  input.forEach((rawRole) => {
    const role = normalizeRole(rawRole);
    if (!role) {
      return;
    }

    if (!seen.has(role)) {
      resolved.push(role);
      seen.add(role);
    }
  });

  return resolved;
};

const parseRoleSetJson = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((entry): entry is string => typeof entry === 'string')
        : [];
    } catch (_error) {
      return [];
    }
  }

  return [];
};

const resolveMembershipRoles = async (
  trx: Knex.Transaction,
  userId: string,
  tenantId?: string,
  orgUnitId?: string
): Promise<string[]> => {
  const roles: string[] = [];

  if (tenantId) {
    const tenantMembership = await trx
      .withSchema('platform')
      .table('tenant_memberships')
      .where({ tenant_id: tenantId, user_id: userId })
      .first();

    roles.push(...parseRoleSetJson(tenantMembership?.role_set_json));
  }

  if (orgUnitId) {
    const orgUnitMembership = await trx
      .withSchema('platform')
      .table('org_unit_memberships')
      .where({ org_unit_id: orgUnitId, user_id: userId })
      .first();

    roles.push(...parseRoleSetJson(orgUnitMembership?.role_set_json));
  }

  return roles;
};

const resolveRequestRoles = async (
  trx: Knex.Transaction,
  req: Request,
  tenantId?: string,
  orgUnitId?: string
): Promise<ScopedRole[]> => {
  const baseRole = req.user?.role || null;
  const headerRoles = [
    req.header('x-system-role'),
    req.header('x-tenant-role'),
    req.header('x-orgunit-role'),
  ];

  const legacyRoleAliases: Record<string, ScopedRole> = {
    admin: 'TENANT_ADMIN',
    member: 'ORGUNIT_MEMBER',
  };

  const normalizedLegacy = baseRole && legacyRoleAliases[baseRole.toLowerCase()]
    ? legacyRoleAliases[baseRole.toLowerCase()]
    : null;

  const membershipRoles = req.user?.userId
    ? await resolveMembershipRoles(trx, req.user.userId, tenantId, orgUnitId)
    : [];

  return normalizeRoleSet([
    baseRole,
    normalizedLegacy,
    ...headerRoles,
    ...membershipRoles,
  ]);
};

const requireCapability = async (
  trx: Knex.Transaction,
  req: Request,
  capability: Capability,
  tenantId?: string,
  orgUnitId?: string
): Promise<void> => {
  const roles = await resolveRequestRoles(trx, req, tenantId, orgUnitId);

  if (!hasCapability(roles, capability)) {
    throw new Error(`FORBIDDEN:${capability}`);
  }
};

const parseRoleSetBody = (value: unknown): ScopedRole[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return normalizeRoleSet(value as string[]);
};

const toRoleSetJson = (roles: ScopedRole[]): string => JSON.stringify(roles);

const ensureHouseholdShadow = async (trx: Knex.Transaction, tenantId: string, tenantName: string): Promise<void> => {
  const existing = await trx('households').where({ id: tenantId }).first();
  if (existing) {
    return;
  }

  let invitationCode = '';
  for (let attempts = 0; attempts < 100; attempts += 1) {
    const candidate = generateInvitationCode();
    const collision = await trx('households').where({ invitation_code: candidate }).first();
    if (!collision) {
      invitationCode = candidate;
      break;
    }
  }

  if (!invitationCode) {
    throw new Error('Unable to generate unique invitation code for tenant shadow household');
  }

  await trx('households').insert({
    id: tenantId,
    name: tenantName,
    invitation_code: invitationCode,
  });
};

router.use(authenticateToken);

router.post('/tenants', async (req: Request, res: Response) => {
  const { name, status = 'active', billingAccountName, assignTenantAdminUserId } = req.body || {};

  if (typeof name !== 'string' || name.trim() === '') {
    return refusal(res, {
      code: 'TENANT_NAME_REQUIRED',
      message: 'name is required',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  try {
    const actorId = req.user?.userId || null;

    const created = await executePlatformMutation({
      mutation: async (trx) => {
        await requireCapability(trx, req, CAPABILITIES.TENANT_CREATE);

        const [tenant] = await trx
          .withSchema('platform')
          .table('tenants')
          .insert({
            name: name.trim(),
            status,
          })
          .returning(['id', 'name', 'status', 'created_at_utc']);

        await ensureHouseholdShadow(trx, tenant.id, tenant.name);

        let billingAccount: { id: string; name: string } | null = null;
        if (typeof billingAccountName === 'string' && billingAccountName.trim() !== '') {
          const [createdBilling] = await trx
            .withSchema('platform')
            .table('billing_accounts')
            .insert({
              name: billingAccountName.trim(),
              status: 'active',
            })
            .returning(['id', 'name']);

          await trx
            .withSchema('platform')
            .table('tenant_billing')
            .insert({
              tenant_id: tenant.id,
              billing_account_id: createdBilling.id,
            });

          billingAccount = createdBilling;
        }

        if (typeof assignTenantAdminUserId === 'string' && assignTenantAdminUserId.trim() !== '') {
          await trx
            .withSchema('platform')
            .table('tenant_memberships')
            .insert({
              tenant_id: tenant.id,
              user_id: assignTenantAdminUserId.trim(),
              role_set_json: toRoleSetJson(['TENANT_ADMIN']),
            })
            .onConflict(['tenant_id', 'user_id'])
            .merge({
              role_set_json: toRoleSetJson(['TENANT_ADMIN']),
              updated_at_utc: trx.fn.now(),
            });
        }

        return {
          tenant,
          billingAccount,
        };
      },
      event: (result) => ({
        tenantId: result.tenant.id,
        actorId,
        eventName: 'platform.tenant.created',
        entityType: 'tenant',
        entityId: result.tenant.id,
        payload: {
          status: result.tenant.status,
          hasBillingAccount: !!result.billingAccount,
        },
      }),
    }, db);

    return success(res, {
      code: 'TENANT_CREATED',
      message: 'Tenant created successfully',
      data: created,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('FORBIDDEN:')) {
      return refusal(res, {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions for tenant creation',
        refusalType: 'security',
        httpStatus: 403,
      });
    }

    return systemError(res, {
      code: 'TENANT_CREATE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to create tenant',
      httpStatus: 500,
    });
  }
});

router.post('/org-units', async (req: Request, res: Response) => {
  const {
    tenantId,
    name,
    type = 'ORG_UNIT',
    parentOrgUnitId = null,
    status = 'active',
  } = req.body || {};

  if (typeof tenantId !== 'string' || tenantId.trim() === '' || typeof name !== 'string' || name.trim() === '') {
    return refusal(res, {
      code: 'ORG_UNIT_INPUT_INVALID',
      message: 'tenantId and name are required',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  try {
    const actorId = req.user?.userId || null;

    const created = await executePlatformMutation({
      mutation: async (trx) => {
        await requireCapability(trx, req, CAPABILITIES.ORG_UNIT_CREATE, tenantId.trim());

        const [orgUnit] = await trx
          .withSchema('platform')
          .table('org_units')
          .insert({
            tenant_id: tenantId.trim(),
            parent_org_unit_id: typeof parentOrgUnitId === 'string' && parentOrgUnitId.trim() !== ''
              ? parentOrgUnitId.trim()
              : null,
            type,
            name: name.trim(),
            status,
          })
          .returning(['id', 'tenant_id', 'name', 'type', 'status', 'parent_org_unit_id']);

        return { orgUnit };
      },
      event: (result) => ({
        tenantId: result.orgUnit.tenant_id,
        actorId,
        eventName: 'platform.org_unit.created',
        entityType: 'org_unit',
        entityId: result.orgUnit.id,
        payload: {
          type: result.orgUnit.type,
          parentOrgUnitId: result.orgUnit.parent_org_unit_id,
        },
      }),
    }, db);

    return success(res, {
      code: 'ORG_UNIT_CREATED',
      message: 'OrgUnit created successfully',
      data: created,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('FORBIDDEN:')) {
      return refusal(res, {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions for org unit creation',
        refusalType: 'security',
        httpStatus: 403,
      });
    }

    return systemError(res, {
      code: 'ORG_UNIT_CREATE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to create org unit',
      httpStatus: 500,
    });
  }
});

router.post('/tenant-memberships', async (req: Request, res: Response) => {
  const { tenantId, userId, roleSet } = req.body || {};
  const parsedRoleSet = parseRoleSetBody(roleSet);

  if (
    typeof tenantId !== 'string'
    || tenantId.trim() === ''
    || typeof userId !== 'string'
    || userId.trim() === ''
    || parsedRoleSet.length === 0
  ) {
    return refusal(res, {
      code: 'TENANT_MEMBERSHIP_INPUT_INVALID',
      message: 'tenantId, userId, and roleSet[] are required',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  try {
    const actorId = req.user?.userId || null;

    const updated = await executePlatformMutation({
      mutation: async (trx) => {
        await requireCapability(trx, req, CAPABILITIES.TENANT_ROLE_ASSIGN, tenantId.trim());

        await trx
          .withSchema('platform')
          .table('tenant_memberships')
          .insert({
            tenant_id: tenantId.trim(),
            user_id: userId.trim(),
            role_set_json: toRoleSetJson(parsedRoleSet),
          })
          .onConflict(['tenant_id', 'user_id'])
          .merge({
            role_set_json: toRoleSetJson(parsedRoleSet),
            updated_at_utc: trx.fn.now(),
          });

        return {
          tenantId: tenantId.trim(),
          userId: userId.trim(),
          roleSet: parsedRoleSet,
        };
      },
      event: (result) => ({
        tenantId: result.tenantId,
        actorId,
        eventName: 'platform.tenant_membership.upserted',
        entityType: 'tenant_membership',
        entityId: result.userId,
        payload: {
          roleSet: result.roleSet,
        },
      }),
    }, db);

    return success(res, {
      code: 'TENANT_MEMBERSHIP_UPDATED',
      message: 'Tenant membership updated successfully',
      data: updated,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('FORBIDDEN:')) {
      return refusal(res, {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions for tenant membership update',
        refusalType: 'security',
        httpStatus: 403,
      });
    }

    return systemError(res, {
      code: 'TENANT_MEMBERSHIP_UPDATE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to update tenant membership',
      httpStatus: 500,
    });
  }
});

router.post('/org-unit-memberships', async (req: Request, res: Response) => {
  const { orgUnitId, userId, roleSet } = req.body || {};
  const parsedRoleSet = parseRoleSetBody(roleSet);

  if (
    typeof orgUnitId !== 'string'
    || orgUnitId.trim() === ''
    || typeof userId !== 'string'
    || userId.trim() === ''
    || parsedRoleSet.length === 0
  ) {
    return refusal(res, {
      code: 'ORG_UNIT_MEMBERSHIP_INPUT_INVALID',
      message: 'orgUnitId, userId, and roleSet[] are required',
      refusalType: 'client',
      httpStatus: 400,
    });
  }

  try {
    const actorId = req.user?.userId || null;

    const updated = await executePlatformMutation({
      mutation: async (trx) => {
        const orgUnit = await trx
          .withSchema('platform')
          .table('org_units')
          .where({ id: orgUnitId.trim() })
          .first(['id', 'tenant_id']);

        if (!orgUnit) {
          throw new Error('ORG_UNIT_NOT_FOUND');
        }

        await requireCapability(trx, req, CAPABILITIES.ORG_UNIT_MEMBERSHIP_MANAGE, orgUnit.tenant_id, orgUnit.id);

        await trx
          .withSchema('platform')
          .table('org_unit_memberships')
          .insert({
            org_unit_id: orgUnit.id,
            user_id: userId.trim(),
            role_set_json: toRoleSetJson(parsedRoleSet),
          })
          .onConflict(['org_unit_id', 'user_id'])
          .merge({
            role_set_json: toRoleSetJson(parsedRoleSet),
            updated_at_utc: trx.fn.now(),
          });

        return {
          orgUnitId: orgUnit.id,
          tenantId: orgUnit.tenant_id,
          userId: userId.trim(),
          roleSet: parsedRoleSet,
        };
      },
      event: (result) => ({
        tenantId: result.tenantId,
        actorId,
        eventName: 'platform.org_unit_membership.upserted',
        entityType: 'org_unit_membership',
        entityId: result.userId,
        payload: {
          orgUnitId: result.orgUnitId,
          roleSet: result.roleSet,
        },
      }),
    }, db);

    return success(res, {
      code: 'ORG_UNIT_MEMBERSHIP_UPDATED',
      message: 'OrgUnit membership updated successfully',
      data: updated,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'ORG_UNIT_NOT_FOUND') {
      return refusal(res, {
        code: 'ORG_UNIT_NOT_FOUND',
        message: 'OrgUnit was not found',
        refusalType: 'client',
        httpStatus: 404,
      });
    }

    if (error instanceof Error && error.message.startsWith('FORBIDDEN:')) {
      return refusal(res, {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions for org unit membership update',
        refusalType: 'security',
        httpStatus: 403,
      });
    }

    return systemError(res, {
      code: 'ORG_UNIT_MEMBERSHIP_UPDATE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to update org unit membership',
      httpStatus: 500,
    });
  }
});

router.get('/rbac/evaluate', async (req: Request, res: Response) => {
  const tenantId = req.query.tenantId && typeof req.query.tenantId === 'string'
    ? req.query.tenantId
    : undefined;
  const orgUnitId = req.query.orgUnitId && typeof req.query.orgUnitId === 'string'
    ? req.query.orgUnitId
    : undefined;

  try {
    const roles = await db.transaction((trx) => resolveRequestRoles(trx, req, tenantId, orgUnitId));

    return success(res, {
      code: 'RBAC_EVALUATED',
      message: 'Resolved request role and capability context',
      data: {
        roles,
        capabilities: Array.from(new Set(Object.values(CAPABILITIES).filter((capability) => hasCapability(roles, capability)))),
      },
    });
  } catch (error) {
    return systemError(res, {
      code: 'RBAC_EVALUATION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to evaluate RBAC',
      httpStatus: 500,
    });
  }
});

export default router;
