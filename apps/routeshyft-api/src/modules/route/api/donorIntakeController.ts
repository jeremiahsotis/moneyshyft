import type { Request } from 'express';
import {
  donorIntakeService,
  type DonorIntakeContext,
  type DonorIntakePayloadInput,
  type DonorIntakeService,
} from '../application/donorIntakeService';

export type DonorControllerResponse = {
  ok: boolean;
  code: string;
  message: string;
  data: Record<string, unknown>;
};

const resolveContext = (req: Request): DonorIntakeContext => ({
  tenantId: req.tenantId || 'public',
  orgUnitId: req.orgUnitId || null,
});

export class DonorIntakeController {
  constructor(private readonly service: DonorIntakeService = donorIntakeService) {}

  submit(req: Request): DonorControllerResponse {
    const body = (req.body ?? {}) as DonorIntakePayloadInput;
    const result = this.service.submitDonorRequest(
      body,
      resolveContext(req),
      req.header('x-idempotency-key') || null,
    );

    return {
      ok: result.ok,
      code: result.code,
      message: result.message,
      data: result.data,
    };
  }

  detail(req: Request): DonorControllerResponse {
    const requestId = typeof req.params.requestId === 'string' ? req.params.requestId : '';
    const result = this.service.getDonorRequestDetail(requestId, resolveContext(req));

    return {
      ok: result.ok,
      code: result.code,
      message: result.message,
      data: result.data,
    };
  }
}

export const donorIntakeController = new DonorIntakeController();
