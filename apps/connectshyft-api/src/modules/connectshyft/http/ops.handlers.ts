import { Request, Response } from 'express';
import logger from '../../../utils/logger';
import { refusal, success } from '../../../platform/envelopes/response';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import {
  enforceConnectShyftCapability,
  requestHasAnyCapability,
  resolveConnectShyftRouteContextDecision,
  respondWithConnectShyftContextRefusal,
  sendConnectShyftRouteRefusal,
} from './accessContext';
import { readConnectShyftIdentityVisibility } from '../ops/identityVisibility.service';
import { readConnectShyftBridgeVisibility } from '../ops/bridgeVisibility.service';
import { readConnectShyftThreadVisibility } from '../ops/threadVisibility.service';

const parseParam = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const logOpsVisibilityRequested = (input: {
  surface: 'identity' | 'thread' | 'bridge';
  tenantId: string;
  orgUnitId: string;
  resourceId: string;
}) => {
  logger.info('ops.visibility.requested', {
    eventName: 'ops.visibility.requested',
    surface: input.surface,
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    resourceId: input.resourceId,
  });
};

const logOpsVisibilityReturned = (input: {
  surface: 'identity' | 'thread' | 'bridge';
  tenantId: string;
  orgUnitId: string;
  resourceId: string;
  outcome: 'success' | 'refusal';
  code: string;
}) => {
  logger.info('ops.visibility.response_returned', {
    eventName: 'ops.visibility.response_returned',
    surface: input.surface,
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    resourceId: input.resourceId,
    outcome: input.outcome,
    code: input.code,
  });
};

const resolveOpsIdentityReadContext = async (
  req: Request,
  res: Response,
) => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return null;
  }

  const contextDecision = await resolveConnectShyftRouteContextDecision(req);
  if (!contextDecision.ok) {
    respondWithConnectShyftContextRefusal(res, contextDecision);
    return null;
  }

  const allowed = requestHasAnyCapability(req, [
    CAPABILITIES.NEIGHBOR_EDIT_ALL,
    CAPABILITIES.ORG_UNIT_IDENTITY_RESOLVE,
  ], contextDecision.context);
  if (!allowed) {
    sendConnectShyftRouteRefusal(res, {
      code: 'CONNECTSHYFT_OPS_IDENTITY_VIEW_FORBIDDEN',
      message: 'Ops identity visibility requires an authorized ConnectShyft role.',
      refusalType: 'business',
      httpStatus: 200,
    });
    return null;
  }

  return {
    context: contextDecision.context,
  };
};

const resolveOpsThreadReadContext = async (
  req: Request,
  res: Response,
) => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return null;
  }

  const contextDecision = await resolveConnectShyftRouteContextDecision(req);
  if (!contextDecision.ok) {
    respondWithConnectShyftContextRefusal(res, contextDecision);
    return null;
  }

  const allowed = requestHasAnyCapability(req, [
    CAPABILITIES.ORG_UNIT_THREAD_VIEW,
    CAPABILITIES.THREAD_VIEW_ALL,
  ], contextDecision.context);
  if (!allowed) {
    sendConnectShyftRouteRefusal(res, {
      code: 'CONNECTSHYFT_THREAD_VIEW_FORBIDDEN',
      message: 'Thread access requires an authorized ConnectShyft role.',
      refusalType: 'business',
      httpStatus: 200,
    });
    return null;
  }

  return {
    context: contextDecision.context,
    allowCrossOrgUnit: requestHasAnyCapability(req, [CAPABILITIES.THREAD_VIEW_ALL], contextDecision.context),
  };
};

export const getConnectOpsIdentityVisibility = async (req: Request, res: Response) => {
  const phone = parseParam(req.params.phone);
  if (!phone) {
    refusal(res, {
      code: 'CONNECTSHYFT_OPS_PHONE_REQUIRED',
      message: 'phone is required',
      refusalType: 'client',
      httpStatus: 400,
    });
    return;
  }

  const accessContext = await resolveOpsIdentityReadContext(req, res);
  if (!accessContext) {
    return;
  }

  logOpsVisibilityRequested({
    surface: 'identity',
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    resourceId: phone,
  });

  const visibility = await readConnectShyftIdentityVisibility({
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    phone,
  });

  if (!visibility.ok) {
    logOpsVisibilityReturned({
      surface: 'identity',
      tenantId: accessContext.context.tenantId,
      orgUnitId: accessContext.context.orgUnitId,
      resourceId: phone,
      outcome: 'refusal',
      code: visibility.code,
    });
    refusal(res, visibility);
    return;
  }

  logOpsVisibilityReturned({
    surface: 'identity',
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    resourceId: phone,
    outcome: 'success',
    code: 'CONNECTSHYFT_OPS_IDENTITY_VISIBILITY_LOADED',
  });

  success(res, {
    code: 'CONNECTSHYFT_OPS_IDENTITY_VISIBILITY_LOADED',
    message: 'ConnectShyft ops identity visibility loaded',
    data: visibility.data,
  });
};

export const getConnectOpsThreadVisibility = async (req: Request, res: Response) => {
  const threadId = parseParam(req.params.threadId);
  if (!threadId) {
    refusal(res, {
      code: 'CONNECTSHYFT_THREAD_ID_REQUIRED',
      message: 'threadId is required',
      refusalType: 'client',
      httpStatus: 400,
    });
    return;
  }

  const accessContext = await resolveOpsThreadReadContext(req, res);
  if (!accessContext) {
    return;
  }

  logOpsVisibilityRequested({
    surface: 'thread',
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    resourceId: threadId,
  });

  const visibility = await readConnectShyftThreadVisibility({
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    threadId,
    allowCrossOrgUnit: accessContext.allowCrossOrgUnit,
  });

  if (!visibility) {
    logOpsVisibilityReturned({
      surface: 'thread',
      tenantId: accessContext.context.tenantId,
      orgUnitId: accessContext.context.orgUnitId,
      resourceId: threadId,
      outcome: 'refusal',
      code: 'CONNECTSHYFT_OPS_THREAD_NOT_FOUND',
    });
    sendConnectShyftRouteRefusal(res, {
      code: 'CONNECTSHYFT_OPS_THREAD_NOT_FOUND',
      message: 'Thread visibility is unavailable for the requested orgUnit context.',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        threadId,
        orgUnitId: accessContext.context.orgUnitId,
      },
    });
    return;
  }

  logOpsVisibilityReturned({
    surface: 'thread',
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    resourceId: threadId,
    outcome: 'success',
    code: 'CONNECTSHYFT_OPS_THREAD_VISIBILITY_LOADED',
  });

  success(res, {
    code: 'CONNECTSHYFT_OPS_THREAD_VISIBILITY_LOADED',
    message: 'ConnectShyft ops thread visibility loaded',
    data: visibility,
  });
};

export const getConnectOpsBridgeVisibility = async (req: Request, res: Response) => {
  const bridgeId = parseParam(req.params.bridgeId);
  if (!bridgeId) {
    refusal(res, {
      code: 'CONNECTSHYFT_OPS_BRIDGE_ID_REQUIRED',
      message: 'bridgeId is required',
      refusalType: 'client',
      httpStatus: 400,
    });
    return;
  }

  const accessContext = await resolveOpsThreadReadContext(req, res);
  if (!accessContext) {
    return;
  }

  logOpsVisibilityRequested({
    surface: 'bridge',
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    resourceId: bridgeId,
  });

  const visibility = await readConnectShyftBridgeVisibility({
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    bridgeId,
    allowCrossOrgUnit: accessContext.allowCrossOrgUnit,
  });

  if (!visibility) {
    logOpsVisibilityReturned({
      surface: 'bridge',
      tenantId: accessContext.context.tenantId,
      orgUnitId: accessContext.context.orgUnitId,
      resourceId: bridgeId,
      outcome: 'refusal',
      code: 'CONNECTSHYFT_OPS_BRIDGE_NOT_FOUND',
    });
    sendConnectShyftRouteRefusal(res, {
      code: 'CONNECTSHYFT_OPS_BRIDGE_NOT_FOUND',
      message: 'Bridge visibility is unavailable for the requested orgUnit context.',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        bridgeId,
        orgUnitId: accessContext.context.orgUnitId,
      },
    });
    return;
  }

  logOpsVisibilityReturned({
    surface: 'bridge',
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    resourceId: bridgeId,
    outcome: 'success',
    code: 'CONNECTSHYFT_OPS_BRIDGE_VISIBILITY_LOADED',
  });

  success(res, {
    code: 'CONNECTSHYFT_OPS_BRIDGE_VISIBILITY_LOADED',
    message: 'ConnectShyft ops bridge visibility loaded',
    data: visibility,
  });
};
