import { Request, Response, Router } from 'express';
import type { Knex } from 'knex';
import { refusal, success } from '../../../platform/envelopes/response';
import {
  evaluateConnectShyftCapability,
  resolveConnectShyftFeatureFlags,
  type ConnectShyftCapability,
  type ConnectShyftFeatureFlags,
} from '../../../modules/connectshyft/featureFlags';
import { resolveConnectShyftOrgUnitContext } from '../../../modules/connectshyft/contextAccess';
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
