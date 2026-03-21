import { Request, Response } from 'express';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import type { ResolvedConnectShyftContext } from '../contextAccess';
import { CONNECTSHYFT_WEBHOOK_RECEIPT_RETENTION_POLICY_DAYS } from '../providerCorrelationMappings';
import {
  enforceConnectShyftCapability,
  requestHasAnyCapability,
  resolveConnectShyftRouteContextDecision,
  respondWithConnectShyftContextRefusal,
  sendConnectShyftRouteRefusal,
} from './accessContext';

const CONNECTSHYFT_WEBHOOK_RECEIPT_RETENTION_DAYS_MAX = 3650;

export type ConnectShyftWebhookReceiptMetricsQuery = {
  orgUnitId: string | null;
  retentionWindowDays: number;
  asOfUtc: string | null;
};

export type ConnectShyftWebhookReceiptCleanupPayload = {
  orgUnitId: string | null;
  policyWindowDays: number;
  dryRun: boolean;
  asOfUtc: string | null;
};

export type ConnectShyftWebhookReceiptMetricsAccessContext = {
  context: ResolvedConnectShyftContext;
  query: ConnectShyftWebhookReceiptMetricsQuery;
};

export type ConnectShyftWebhookReceiptCleanupAccessContext = {
  context: ResolvedConnectShyftContext;
  payload: ConnectShyftWebhookReceiptCleanupPayload;
};

const parseOrgUnitIdFromBody = (req: Request): string | null => {
  if (typeof req.body?.orgUnitId !== 'string') {
    return null;
  }

  const normalized = req.body.orgUnitId.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseOrgUnitIdFromQuery = (req: Request): string | null => {
  if (typeof req.query?.orgUnitId !== 'string') {
    return null;
  }

  const normalized = req.query.orgUnitId.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseOptionalBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return null;
};

const parseOptionalNonNegativeInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.trunc(parsed);
    }
  }

  return null;
};

const normalizeWebhookReceiptRetentionDays = (
  value: unknown,
  fallback = CONNECTSHYFT_WEBHOOK_RECEIPT_RETENTION_POLICY_DAYS,
): number => {
  const parsed = parseOptionalNonNegativeInteger(value);
  if (parsed === null || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, CONNECTSHYFT_WEBHOOK_RECEIPT_RETENTION_DAYS_MAX);
};

const parseWebhookReceiptMetricsQuery = (
  req: Request,
): ConnectShyftWebhookReceiptMetricsQuery => {
  const asOfCandidate = typeof req.query?.asOfUtc === 'string'
    ? req.query.asOfUtc.trim()
    : '';
  return {
    orgUnitId: parseOrgUnitIdFromQuery(req),
    retentionWindowDays: normalizeWebhookReceiptRetentionDays(req.query?.retentionWindowDays),
    asOfUtc: asOfCandidate.length > 0 ? asOfCandidate : null,
  };
};

const parseWebhookReceiptCleanupBody = (
  req: Request,
): ConnectShyftWebhookReceiptCleanupPayload => {
  const asOfCandidate = typeof req.body?.asOfUtc === 'string'
    ? req.body.asOfUtc.trim()
    : '';
  return {
    orgUnitId: parseOrgUnitIdFromBody(req),
    policyWindowDays: normalizeWebhookReceiptRetentionDays(
      req.body?.policyWindowDays,
      CONNECTSHYFT_WEBHOOK_RECEIPT_RETENTION_POLICY_DAYS,
    ),
    dryRun: parseOptionalBoolean(req.body?.dryRun) === true,
    asOfUtc: asOfCandidate.length > 0 ? asOfCandidate : null,
  };
};

const sendWebhookReceiptAdminForbidden = (res: Response) => {
  sendConnectShyftRouteRefusal(res, {
    code: 'CONNECTSHYFT_NUMBER_MAPPING_FORBIDDEN',
    message: 'Number mapping management requires an authorized ConnectShyft role.',
    refusalType: 'business',
    httpStatus: 200,
  });
};

const resolveWebhookReceiptAdminContext = async (
  req: Request,
  res: Response,
  attemptedOrgUnitId?: string | null,
): Promise<{
  context: ResolvedConnectShyftContext;
} | null> => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return null;
  }

  const contextDecision = await resolveConnectShyftRouteContextDecision(req, {
    attemptedOrgUnitId,
  });
  if (!contextDecision.ok) {
    respondWithConnectShyftContextRefusal(res, contextDecision);
    return null;
  }

  if (!requestHasAnyCapability(req, [CAPABILITIES.NUMBER_MAPPING_MANAGE], contextDecision.context)) {
    sendWebhookReceiptAdminForbidden(res);
    return null;
  }

  return {
    context: contextDecision.context,
  };
};

export const resolveConnectShyftWebhookReceiptMetricsAccessContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftWebhookReceiptMetricsAccessContext | null> => {
  const query = parseWebhookReceiptMetricsQuery(req);
  const accessContext = await resolveWebhookReceiptAdminContext(req, res, query.orgUnitId);
  if (!accessContext) {
    return null;
  }

  return {
    ...accessContext,
    query,
  };
};

export const resolveConnectShyftWebhookReceiptCleanupAccessContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftWebhookReceiptCleanupAccessContext | null> => {
  const payload = parseWebhookReceiptCleanupBody(req);
  const accessContext = await resolveWebhookReceiptAdminContext(req, res, payload.orgUnitId);
  if (!accessContext) {
    return null;
  }

  return {
    ...accessContext,
    payload,
  };
};
