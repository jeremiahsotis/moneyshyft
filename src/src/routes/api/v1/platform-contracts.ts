import { Request, Response, Router } from 'express';
import { refusal, success, systemError } from '../../../platform/envelopes/response';
import {
  formatUtcTimestampForTimezone,
  resolveTimezoneContext
} from '../../../platform/time/timezoneService';

const router = Router();

router.post('/_kernel/contracts/envelope/success', (req: Request, res: Response) => {
  const code = typeof req.body?.code === 'string' && req.body.code.trim() !== ''
    ? req.body.code
    : 'ENVELOPE_SUCCESS';
  const message = typeof req.body?.message === 'string' && req.body.message.trim() !== ''
    ? req.body.message
    : 'Envelope contract success';

  return success(res, {
    code,
    message,
    data: req.body?.data
  });
});

router.post('/_kernel/contracts/envelope/business-refusal', (req: Request, res: Response) => {
  const code = typeof req.body?.code === 'string' && req.body.code.trim() !== ''
    ? req.body.code
    : 'ENVELOPE_BUSINESS_REFUSAL';
  const message = typeof req.body?.message === 'string' && req.body.message.trim() !== ''
    ? req.body.message
    : 'Requested amount exceeds available envelope balance';

  return refusal(res, {
    code,
    message,
    data: req.body?.data
  });
});

router.post('/_kernel/contracts/envelope/system-error', (req: Request, res: Response) => {
  const code = typeof req.body?.code === 'string' && req.body.code.trim() !== ''
    ? req.body.code
    : 'ENVELOPE_SYSTEM_ERROR';
  const message = typeof req.body?.message === 'string' && req.body.message.trim() !== ''
    ? req.body.message
    : 'Unhandled exception while processing envelope contract';
  const httpStatus = typeof req.body?.httpStatus === 'number'
    && Number.isInteger(req.body.httpStatus)
    && req.body.httpStatus >= 500
    ? req.body.httpStatus
    : 500;

  return systemError(res, {
    code,
    message,
    data: req.body?.data,
    httpStatus
  });
});

router.get('/time/render-context', (req: Request, res: Response) => {
  const context = resolveTimezoneContext({
    userTimezone: req.header('x-user-timezone'),
    tenantTimezone: req.header('x-tenant-timezone'),
    systemTimezone: req.header('x-system-timezone')
  });

  if (!context) {
    return refusal(res, {
      code: 'TIMEZONE_CONTEXT_UNRESOLVED',
      message: 'Unable to resolve timezone context using fallback order user -> tenant -> system'
    });
  }

  return success(res, {
    code: 'TIMEZONE_CONTEXT_RESOLVED',
    message: 'Timezone context resolved for localized rendering',
    data: context
  });
});

router.post('/time/render-contract', (req: Request, res: Response) => {
  const context = resolveTimezoneContext({
    userTimezone: req.header('x-user-timezone'),
    tenantTimezone: req.header('x-tenant-timezone'),
    systemTimezone: req.header('x-system-timezone')
  });

  if (!context) {
    return refusal(res, {
      code: 'TIMEZONE_CONTEXT_UNRESOLVED',
      message: 'Unable to resolve timezone context using fallback order user -> tenant -> system'
    });
  }

  const utcTimestamp = typeof req.body?.utcTimestamp === 'string' ? req.body.utcTimestamp : '';
  const rendered = formatUtcTimestampForTimezone(utcTimestamp, context.timezone);

  if (!rendered) {
    return refusal(res, {
      code: 'INVALID_UTC_TIMESTAMP',
      message: 'utcTimestamp must be a valid UTC ISO-8601 timestamp'
    });
  }

  return success(res, {
    code: 'TIMEZONE_RENDER_CONTRACT_READY',
    message: 'UTC timestamp converted to localized display value',
    data: {
      rendered,
      timezone: context.timezone,
      timezoneSource: context.timezoneSource,
      purpose: typeof req.body?.purpose === 'string' ? req.body.purpose : 'unspecified'
    }
  });
});

router.get('/operations/feed', (req: Request, res: Response) => {
  const context = resolveTimezoneContext({
    userTimezone: req.header('x-user-timezone'),
    tenantTimezone: req.header('x-tenant-timezone'),
    systemTimezone: req.header('x-system-timezone')
  });

  if (!context) {
    return refusal(res, {
      code: 'TIMEZONE_CONTEXT_UNRESOLVED',
      message: 'Unable to resolve timezone context using fallback order user -> tenant -> system'
    });
  }

  const sourceRows = [
    { id: 'op-001', occurredAtUtc: '2026-02-17T15:30:00.000Z' },
    { id: 'op-002', occurredAtUtc: '2026-02-17T18:45:00.000Z' }
  ];

  const rows: Array<{ id: string; occurredAtLocal: string; timezoneSource: typeof context.timezoneSource }> = [];

  for (const row of sourceRows) {
    const occurredAtLocal = formatUtcTimestampForTimezone(row.occurredAtUtc, context.timezone);

    if (!occurredAtLocal) {
      return refusal(res, {
        code: 'INVALID_UTC_TIMESTAMP',
        message: `Operational row ${row.id} contains an invalid UTC timestamp`
      });
    }

    rows.push({
      id: row.id,
      occurredAtLocal,
      timezoneSource: context.timezoneSource
    });
  }

  return success(res, {
    code: 'OPERATIONS_FEED_READY',
    message: 'Operational feed prepared with localized timestamps',
    data: {
      timezone: context.timezone,
      timezoneSource: context.timezoneSource,
      rows
    }
  });
});

export default router;
