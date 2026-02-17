import { Request, Response, Router } from 'express';
import { refusal, success, systemError } from '../../../platform/envelopes/response';

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

export default router;
