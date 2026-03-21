import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import {
  loadConnectShyftWebhookReceiptMetrics,
} from '../providerCorrelationMappings';
import { loadConnectShyftPlatformDb, sendConnectShyftRouteRefusal } from '../http/accessContext';
import { resolveConnectShyftWebhookReceiptMetricsAccessContext } from '../http/webhookReceiptAdminContext';

export const getConnectWebhookReceiptMetrics = async (req: Request, res: Response) => {
  const accessContext = await resolveConnectShyftWebhookReceiptMetricsAccessContext(req, res);
  if (!accessContext) {
    return;
  }

  const metrics = await loadConnectShyftWebhookReceiptMetrics({
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    retentionWindowDays: accessContext.query.retentionWindowDays,
    asOfUtc: accessContext.query.asOfUtc || undefined,
    db: loadConnectShyftPlatformDb(),
  });

  if (metrics.error) {
    sendConnectShyftRouteRefusal(res, {
      code: metrics.error.code,
      message: 'Webhook receipt metrics are temporarily unavailable.',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        orgUnitId: accessContext.context.orgUnitId,
      },
    });
    return;
  }

  return success(res, {
    code: 'CONNECTSHYFT_WEBHOOK_RECEIPT_METRICS_LOADED',
    message: 'Webhook receipt metrics loaded',
    data: {
      orgUnitId: accessContext.context.orgUnitId,
      retentionWindowDays: metrics.retentionWindowDays,
      totalRows: metrics.totalRows,
      expiredRowsCandidate: metrics.expiredRowsCandidate,
      oldestRetainedAt: metrics.oldestRetainedAt,
      asOfUtc: metrics.asOfUtc,
      cutoffUtc: metrics.cutoffUtc,
    },
  });
};
