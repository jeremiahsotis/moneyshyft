import { Request, Response, Router } from 'express';
import { refusal, success } from '../../../platform/envelopes/response';

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

export default router;
