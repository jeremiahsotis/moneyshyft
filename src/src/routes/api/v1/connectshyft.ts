import { Request, Response, Router } from 'express';
import type { Knex } from 'knex';
import { refusal, success } from '../../../platform/envelopes/response';
import { CAPABILITIES, hasCapability } from '../../../platform/rbac/capabilities';
import {
  evaluateConnectShyftCapability,
  isConnectShyftTestOverrideEnabled,
  resolveConnectShyftFeatureFlags,
  type ConnectShyftCapability,
  type ConnectShyftFeatureFlags,
} from '../../../modules/connectshyft/featureFlags';
import { resolveConnectShyftOrgUnitContext } from '../../../modules/connectshyft/contextAccess';
import { connectShyftNumberMappingService } from '../../../modules/connectshyft/numberMappings';
import {
  createKnexOrgUnitAccessStore,
  validateOrgUnitScopedAccess,
} from '../../../platform/tenancy/orgUnitAccess';

const router = Router();

const loadPlatformDb = (): Knex => {
  const knexModule = require('../../../config/knex') as { default: Knex };
  return knexModule.default;
};

const enforceCapability = (
  req: Request,
  res: Response,
  capability: ConnectShyftCapability,
): ConnectShyftFeatureFlags | null => {
  const flags = resolveConnectShyftFeatureFlags(req);
  const evaluation = evaluateConnectShyftCapability(flags, capability);
  if (evaluation.ok) {
    return flags;
  }

  refusal(res, {
    code: evaluation.code,
    message: evaluation.message,
    refusalType: evaluation.refusalType,
    httpStatus: 200,
  });
  return null;
};

const enforceOrgUnitContext = async (
  req: Request,
  res: Response,
  attemptedOrgUnitId?: string | null,
) => {
  const decision = await resolveConnectShyftOrgUnitContext(req, {
    attemptedOrgUnitId,
    resolveOrgUnitAccess: async ({ tenantId, orgUnitId, userId, baseRoles }) =>
      validateOrgUnitScopedAccess(
        createKnexOrgUnitAccessStore(loadPlatformDb()),
        {
          tenantId,
          orgUnitId,
          userId,
          baseRoles,
        },
      ),
  });

  if (decision.ok) {
    return decision.context;
  }

  refusal(res, {
    code: decision.code,
    message: decision.message,
    refusalType: decision.refusalType,
    httpStatus: decision.httpStatus,
  });
  return null;
};

const resolveConnectShyftRequestedRole = (req: Request): string | null => {
  if (isConnectShyftTestOverrideEnabled()) {
    const testOverrideRole = req.header('x-test-connectshyft-role');
    if (typeof testOverrideRole === 'string' && testOverrideRole.trim().length > 0) {
      return testOverrideRole.trim();
    }
  }

  return req.user?.role || null;
};

const enforceNumberMappingManageCapability = (
  req: Request,
  res: Response,
): boolean => {
  const requestedRole = resolveConnectShyftRequestedRole(req);
  if (hasCapability([requestedRole], CAPABILITIES.NUMBER_MAPPING_MANAGE)) {
    return true;
  }

  refusal(res, {
    code: 'CONNECTSHYFT_NUMBER_MAPPING_FORBIDDEN',
    message: 'Number mapping management requires an authorized ConnectShyft role.',
    refusalType: 'business',
    httpStatus: 200,
  });
  return false;
};

const parseOrgUnitIdFromBody = (req: Request): string | null => {
  if (typeof req.body?.orgUnitId !== 'string') {
    return null;
  }

  const normalized = req.body.orgUnitId.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseMappingBody = (req: Request) => ({
  twilioNumberE164: typeof req.body?.twilioNumberE164 === 'string' ? req.body.twilioNumberE164 : '',
  label: typeof req.body?.label === 'string' ? req.body.label : '',
  isActive: req.body?.isActive === undefined ? true : Boolean(req.body.isActive),
});

router.get('/availability', (req: Request, res: Response) => {
  const flags = resolveConnectShyftFeatureFlags(req);

  return success(res, {
    code: 'CONNECTSHYFT_AVAILABILITY_RESOLVED',
    message: 'ConnectShyft availability state resolved',
    data: {
      flags,
      capabilities: {
        module: evaluateConnectShyftCapability(flags, 'module').ok,
        inbox: evaluateConnectShyftCapability(flags, 'inbox').ok,
        escalation: evaluateConnectShyftCapability(flags, 'escalation').ok,
        webhooks: evaluateConnectShyftCapability(flags, 'webhooks').ok,
      },
    },
  });
});

router.get('/inbox', async (req: Request, res: Response) => {
  const flags = enforceCapability(req, res, 'inbox');
  if (!flags) {
    return;
  }

  const context = await enforceOrgUnitContext(req, res);
  if (!context) {
    return;
  }

  return success(res, {
    code: 'CONNECTSHYFT_INBOX_READY',
    message: 'ConnectShyft inbox is available for this tenant',
    data: {
      context,
      items: [],
      actions: {
        claim: flags.connectshyft_escalation_enabled,
        takeover: flags.connectshyft_escalation_enabled,
      },
    },
  });
});

router.get('/numbers', async (req: Request, res: Response) => {
  if (!enforceCapability(req, res, 'module')) {
    return;
  }

  if (!enforceNumberMappingManageCapability(req, res)) {
    return;
  }

  const context = await enforceOrgUnitContext(req, res);
  if (!context) {
    return;
  }

  return success(res, {
    code: 'CONNECTSHYFT_NUMBER_MAPPINGS_RESOLVED',
    message: 'ConnectShyft number mappings resolved',
    data: {
      orgUnitId: context.orgUnitId,
      mappings: connectShyftNumberMappingService.listMappings(context.tenantId, context.orgUnitId),
    },
  });
});

router.post('/numbers', async (req: Request, res: Response) => {
  if (!enforceCapability(req, res, 'module')) {
    return;
  }

  if (!enforceNumberMappingManageCapability(req, res)) {
    return;
  }

  const requestedOrgUnitId = parseOrgUnitIdFromBody(req);
  const context = await enforceOrgUnitContext(req, res, requestedOrgUnitId);
  if (!context) {
    return;
  }

  const payload = parseMappingBody(req);
  const saved = connectShyftNumberMappingService.createMapping({
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    twilioNumberE164: payload.twilioNumberE164,
    label: payload.label,
    isActive: payload.isActive,
  });

  if (!saved.ok) {
    refusal(res, {
      code: saved.code,
      message: saved.message,
      refusalType: 'business',
      httpStatus: 200,
      data: saved.data,
    });
    return;
  }

  return success(res, {
    code: saved.code,
    message: 'ConnectShyft number mapping saved',
    httpStatus: saved.httpStatus,
    data: {
      orgUnitId: saved.data.orgUnitId,
      mappingId: saved.data.mappingId,
      twilioNumberE164: saved.data.twilioNumberE164,
      label: saved.data.label,
      isActive: saved.data.isActive,
      mappings: saved.data.mappings,
    },
  });
});

router.put('/numbers/:mappingId', async (req: Request, res: Response) => {
  if (!enforceCapability(req, res, 'module')) {
    return;
  }

  if (!enforceNumberMappingManageCapability(req, res)) {
    return;
  }

  const mappingId = typeof req.params.mappingId === 'string' ? req.params.mappingId.trim() : '';
  if (!mappingId) {
    refusal(res, {
      code: 'CONNECTSHYFT_NUMBER_MAPPING_ID_REQUIRED',
      message: 'mappingId is required',
      refusalType: 'client',
      httpStatus: 400,
    });
    return;
  }

  const requestedOrgUnitId = parseOrgUnitIdFromBody(req);
  const context = await enforceOrgUnitContext(req, res, requestedOrgUnitId);
  if (!context) {
    return;
  }

  const payload = parseMappingBody(req);
  const updated = connectShyftNumberMappingService.updateMapping({
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    mappingId,
    twilioNumberE164: payload.twilioNumberE164,
    label: payload.label,
    isActive: payload.isActive,
  });

  if (!updated.ok) {
    refusal(res, {
      code: updated.code,
      message: updated.message,
      refusalType: 'business',
      httpStatus: 200,
      data: updated.data,
    });
    return;
  }

  return success(res, {
    code: updated.code,
    message: 'ConnectShyft number mapping updated',
    httpStatus: updated.httpStatus,
    data: {
      mappingId: updated.data.mappingId,
      orgUnitId: updated.data.orgUnitId,
      twilioNumberE164: updated.data.twilioNumberE164,
      label: updated.data.label,
      isActive: updated.data.isActive,
      mappings: updated.data.mappings,
    },
  });
});

router.post('/threads', async (req: Request, res: Response) => {
  if (!enforceCapability(req, res, 'inbox')) {
    return;
  }

  const requestedOrgUnitId = typeof req.body?.orgUnitId === 'string'
    ? req.body.orgUnitId
    : null;
  const context = await enforceOrgUnitContext(req, res, requestedOrgUnitId);
  if (!context) {
    return;
  }

  const fallbackThreadId = 'thread-connectshyft-generated';
  const requestedThreadId = typeof req.body?.threadId === 'string'
    ? req.body.threadId.trim()
    : '';

  return success(res, {
    code: 'CONNECTSHYFT_THREAD_ENSURED',
    message: 'ConnectShyft thread ensured',
    data: {
      threadId: requestedThreadId || fallbackThreadId,
      orgUnitId: context.orgUnitId,
      neighborId: typeof req.body?.neighborId === 'string' ? req.body.neighborId : null,
    },
  });
});

router.post('/threads/:threadId/claim', async (req: Request, res: Response) => {
  if (!enforceCapability(req, res, 'escalation')) {
    return;
  }

  const context = await enforceOrgUnitContext(req, res);
  if (!context) {
    return;
  }

  return success(res, {
    code: 'CONNECTSHYFT_THREAD_CLAIM_READY',
    message: 'ConnectShyft claim action accepted',
    data: {
      threadId: req.params.threadId,
      context,
      reason: typeof req.body?.reason === 'string' ? req.body.reason : null,
    },
  });
});

router.post('/threads/:threadId/takeover', async (req: Request, res: Response) => {
  if (!enforceCapability(req, res, 'escalation')) {
    return;
  }

  const context = await enforceOrgUnitContext(req, res);
  if (!context) {
    return;
  }

  return success(res, {
    code: 'CONNECTSHYFT_THREAD_TAKEOVER_READY',
    message: 'ConnectShyft takeover action accepted',
    data: {
      threadId: req.params.threadId,
      context,
      reason: typeof req.body?.reason === 'string' ? req.body.reason : null,
    },
  });
});

router.post('/webhooks/sms', (req: Request, res: Response) => {
  if (!enforceCapability(req, res, 'webhooks')) {
    return;
  }

  return success(res, {
    code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
    message: 'Inbound webhook accepted for processing',
    data: {
      sid: typeof req.body?.sid === 'string' ? req.body.sid : null,
      from: typeof req.body?.from === 'string' ? req.body.from : null,
      to: typeof req.body?.to === 'string' ? req.body.to : null,
    },
  });
});

export default router;
