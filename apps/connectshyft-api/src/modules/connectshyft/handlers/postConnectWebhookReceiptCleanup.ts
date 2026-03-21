import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import {
  cleanupConnectShyftWebhookReceipts,
} from '../providerCorrelationMappings';
import { loadConnectShyftPlatformDb, sendConnectShyftRouteRefusal } from '../http/accessContext';
import { resolveConnectShyftWebhookReceiptCleanupAccessContext } from '../http/webhookReceiptAdminContext';

export const postConnectWebhookReceiptCleanup = async (req: Request, res: Response) => {
  const accessContext = await resolveConnectShyftWebhookReceiptCleanupAccessContext(req, res);
  if (!accessContext) {
    return;
  }

  const cleanup = await cleanupConnectShyftWebhookReceipts({
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    policyWindowDays: accessContext.payload.policyWindowDays,
    dryRun: accessContext.payload.dryRun,
    asOfUtc: accessContext.payload.asOfUtc || undefined,
    db: loadConnectShyftPlatformDb(),
  });

  if (cleanup.error) {
    sendConnectShyftRouteRefusal(res, {
      code: cleanup.error.code,
      message: 'Webhook receipt cleanup is temporarily unavailable.',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        orgUnitId: accessContext.context.orgUnitId,
        policyWindowDays: accessContext.payload.policyWindowDays,
      },
    });
    return;
  }

  return success(res, {
    code: 'CONNECTSHYFT_WEBHOOK_RECEIPT_RETENTION_APPLIED',
    message: cleanup.dryRun
      ? 'Webhook receipt retention cleanup dry-run complete'
      : 'Webhook receipt retention cleanup complete',
    data: {
      orgUnitId: accessContext.context.orgUnitId,
      policyWindowDays: cleanup.policyWindowDays,
      dryRun: cleanup.dryRun,
      expiredRowsRemoved: cleanup.expiredRowsRemoved,
      activeWindowProtected: cleanup.activeWindowProtected,
      totalRowsBefore: cleanup.totalRowsBefore,
      totalRowsAfter: cleanup.totalRowsAfter,
      oldestRetainedAt: cleanup.oldestRetainedAt,
      executedAtUtc: cleanup.executedAtUtc,
      cutoffUtc: cleanup.cutoffUtc,
    },
  });
};
