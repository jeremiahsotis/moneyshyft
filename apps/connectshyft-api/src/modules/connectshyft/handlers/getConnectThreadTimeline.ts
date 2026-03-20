import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import { resolveConnectShyftThreadTimelineMetadata } from '../readContracts';
import {
  getThreadTimeline,
  normalizeConnectShyftThreadTimelineLimit,
} from '../threadTimeline';
import { serializeConnectShyftThreadTimelineResponse } from '../threadTimelineDto';
import { loadConnectShyftPlatformDb } from '../http/accessContext';
import { resolveConnectShyftThreadTimelineReadContext } from '../http/threadReadContext';

const resolveTimelineLimit = (req: Request): number => {
  const rawLimit = typeof req.query?.limit === 'string'
    ? Number.parseInt(req.query.limit, 10)
    : Number.NaN;

  return normalizeConnectShyftThreadTimelineLimit(rawLimit);
};

export const getConnectThreadTimeline = async (req: Request, res: Response) => {
  const readContext = await resolveConnectShyftThreadTimelineReadContext(req, res);
  if (!readContext) {
    return;
  }

  const timeline = await getThreadTimeline({
    tenantId: readContext.context.tenantId,
    orgUnitId: readContext.context.orgUnitId,
    threadId: readContext.threadId,
    limit: resolveTimelineLimit(req),
    db: loadConnectShyftPlatformDb(),
  });
  const metadata = resolveConnectShyftThreadTimelineMetadata(readContext.thread);

  return success(res, {
    code: 'CONNECTSHYFT_THREAD_TIMELINE_LOADED',
    message: 'ConnectShyft thread timeline loaded',
    data: serializeConnectShyftThreadTimelineResponse({
      timeline,
      neighborDeleted: metadata.neighborDeleted,
      neighborDeletedAtUtc: metadata.neighborDeletedAtUtc,
    }),
  });
};
