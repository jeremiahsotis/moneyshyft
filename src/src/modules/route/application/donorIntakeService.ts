import {
  evaluateDonorIntakeCapacity,
  type CapacityAlternative,
  type DonorCapacitySlot,
} from '../domain/capacityPolicy';
import {
  routeIntakeStore,
  type DonorRequestRecord,
  type InMemoryRouteIntakeStore,
} from '../infrastructure/inMemoryRouteIntakeStore';

export type DonorIntakePayloadInput = {
  tenantId?: unknown;
  orgUnitId?: unknown;
  requestedAtUtc?: unknown;
  requestedWindowStartUtc?: unknown;
  requestedWindowEndUtc?: unknown;
  channel?: unknown;
  notes?: unknown;
  forceRefusal?: unknown;
  itemCount?: unknown;
  itemSummary?: unknown;
};

export type DonorIntakeContext = {
  tenantId: string;
  orgUnitId: string | null;
};

export type FieldError = {
  field: string;
  reason: string;
  message: string;
};

type DonorIntakeNormalizedPayload = {
  tenantId: string;
  orgUnitId: string;
  requestedAtUtc: string;
  requestedWindowStartUtc: string;
  requestedWindowEndUtc: string;
  channel: string;
  notes: string;
  forceRefusal: boolean;
  itemCount: number;
  itemSummary: string;
};

type IntakeValidationResult = {
  ok: true;
  payload: DonorIntakeNormalizedPayload;
} | {
  ok: false;
  fieldErrors: FieldError[];
};

export type DonorIntakeSuccessResult = {
  ok: true;
  code: 'ROUTESHYFT_DONOR_INTAKE_SLOTS_AVAILABLE';
  message: string;
  data: {
    requestId: string;
    commitmentId: string;
    status: 'Schedulable';
    slots: DonorCapacitySlot[];
    nextSteps: string[];
    lineage: {
      requestId: string;
      commitmentId: string;
    };
  };
};

export type DonorIntakeRefusalResult = {
  ok: false;
  code:
    | 'ROUTESHYFT_DONOR_INTAKE_VALIDATION_FAILED'
    | 'ROUTESHYFT_DONOR_INTAKE_REFUSED_CAPACITY';
  message: string;
  data: {
    requestId?: string;
    refusalReason?: string;
    fieldErrors?: FieldError[];
    alternatives?: CapacityAlternative[];
    nextSteps: string[];
  };
};

export type DonorIntakeSubmissionResult = DonorIntakeSuccessResult | DonorIntakeRefusalResult;

export type DonorRequestDetailResult = {
  ok: boolean;
  code:
    | 'ROUTESHYFT_DONOR_INTAKE_COMMITMENT_LINKED'
    | 'ROUTESHYFT_DONOR_INTAKE_REQUEST_RESOLVED'
    | 'ROUTESHYFT_DONOR_INTAKE_SCOPE_MISMATCH'
    | 'ROUTESHYFT_DONOR_INTAKE_REQUEST_NOT_FOUND'
    | 'ROUTESHYFT_DONOR_INTAKE_REQUEST_ID_REQUIRED';
  message: string;
  data: {
    requestId?: string;
    status?: string;
    commitmentId?: string;
    refusalReason?: string;
    alternatives?: CapacityAlternative[];
    nextSteps?: string[];
    lineage?: {
      requestId: string;
      commitmentId: string;
    };
  };
};

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const parseBoolean = (value: unknown): boolean => value === true;

const parseItemCount = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Math.trunc(Number(value));
  }

  return 0;
};

const isValidIsoTimestamp = (value: string): boolean => {
  if (value.length === 0) {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && value.includes('T');
};

const pushRequiredFieldError = (fieldErrors: FieldError[], field: string): void => {
  fieldErrors.push({
    field,
    reason: 'required',
    message: `${field} is required`,
  });
};

const validatePayload = (
  input: DonorIntakePayloadInput,
  context: DonorIntakeContext,
): IntakeValidationResult => {
  const payload: DonorIntakeNormalizedPayload = {
    tenantId: normalizeString(input.tenantId),
    orgUnitId: normalizeString(input.orgUnitId),
    requestedAtUtc: normalizeString(input.requestedAtUtc),
    requestedWindowStartUtc: normalizeString(input.requestedWindowStartUtc),
    requestedWindowEndUtc: normalizeString(input.requestedWindowEndUtc),
    channel: normalizeString(input.channel),
    notes: normalizeString(input.notes),
    forceRefusal: parseBoolean(input.forceRefusal),
    itemCount: parseItemCount(input.itemCount),
    itemSummary: normalizeString(input.itemSummary),
  };

  const fieldErrors: FieldError[] = [];

  if (payload.tenantId.length === 0) {
    pushRequiredFieldError(fieldErrors, 'tenantId');
  }
  if (payload.orgUnitId.length === 0) {
    pushRequiredFieldError(fieldErrors, 'orgUnitId');
  }
  if (payload.requestedAtUtc.length === 0) {
    pushRequiredFieldError(fieldErrors, 'requestedAtUtc');
  }
  if (payload.requestedWindowStartUtc.length === 0) {
    pushRequiredFieldError(fieldErrors, 'requestedWindowStartUtc');
  }
  if (payload.requestedWindowEndUtc.length === 0) {
    pushRequiredFieldError(fieldErrors, 'requestedWindowEndUtc');
  }
  if (payload.channel.length === 0) {
    pushRequiredFieldError(fieldErrors, 'channel');
  }
  if (payload.itemSummary.length === 0) {
    pushRequiredFieldError(fieldErrors, 'itemSummary');
  }
  if (payload.itemCount <= 0) {
    fieldErrors.push({
      field: 'itemCount',
      reason: 'invalid',
      message: 'itemCount must be greater than 0',
    });
  }

  if (payload.requestedAtUtc.length > 0 && !isValidIsoTimestamp(payload.requestedAtUtc)) {
    fieldErrors.push({
      field: 'requestedAtUtc',
      reason: 'invalid',
      message: 'requestedAtUtc must be an ISO timestamp',
    });
  }

  if (payload.requestedWindowStartUtc.length > 0 && !isValidIsoTimestamp(payload.requestedWindowStartUtc)) {
    fieldErrors.push({
      field: 'requestedWindowStartUtc',
      reason: 'invalid',
      message: 'requestedWindowStartUtc must be an ISO timestamp',
    });
  }

  if (payload.requestedWindowEndUtc.length > 0 && !isValidIsoTimestamp(payload.requestedWindowEndUtc)) {
    fieldErrors.push({
      field: 'requestedWindowEndUtc',
      reason: 'invalid',
      message: 'requestedWindowEndUtc must be an ISO timestamp',
    });
  }

  if (
    isValidIsoTimestamp(payload.requestedWindowStartUtc)
    && isValidIsoTimestamp(payload.requestedWindowEndUtc)
    && new Date(payload.requestedWindowStartUtc).getTime() >= new Date(payload.requestedWindowEndUtc).getTime()
  ) {
    fieldErrors.push({
      field: 'requestedWindowEndUtc',
      reason: 'invalid',
      message: 'requestedWindowEndUtc must be after requestedWindowStartUtc',
    });
  }

  if (payload.tenantId.length > 0 && payload.tenantId !== context.tenantId) {
    fieldErrors.push({
      field: 'tenantId',
      reason: 'scope_mismatch',
      message: 'tenantId must match authenticated tenant context',
    });
  }

  if (context.orgUnitId && payload.orgUnitId.length > 0 && payload.orgUnitId !== context.orgUnitId) {
    fieldErrors.push({
      field: 'orgUnitId',
      reason: 'scope_mismatch',
      message: 'orgUnitId must match authenticated orgUnit context',
    });
  }

  if (fieldErrors.length > 0) {
    return {
      ok: false,
      fieldErrors,
    };
  }

  return {
    ok: true,
    payload,
  };
};

const toSubmissionResultFromRequest = (request: DonorRequestRecord): DonorIntakeSubmissionResult => {
  if (request.status === 'SCHEDULABLE' && request.commitmentId) {
    return {
      ok: true,
      code: 'ROUTESHYFT_DONOR_INTAKE_SLOTS_AVAILABLE',
      message: 'Pickup request accepted with schedulable slots.',
      data: {
        requestId: request.requestId,
        commitmentId: request.commitmentId,
        status: 'Schedulable',
        slots: request.slots,
        nextSteps: request.nextSteps,
        lineage: {
          requestId: request.requestId,
          commitmentId: request.commitmentId,
        },
      },
    };
  }

  return {
    ok: false,
    code: 'ROUTESHYFT_DONOR_INTAKE_REFUSED_CAPACITY',
    message: 'Pickup request refused because no capacity is available.',
    data: {
      requestId: request.requestId,
      refusalReason: request.refusalReason || 'Capacity unavailable',
      alternatives: request.alternatives,
      nextSteps: request.nextSteps,
    },
  };
};

export class DonorIntakeService {
  constructor(private readonly store: InMemoryRouteIntakeStore = routeIntakeStore) {}

  submitDonorRequest(
    input: DonorIntakePayloadInput,
    context: DonorIntakeContext,
    idempotencyKey: string | null,
  ): DonorIntakeSubmissionResult {
    const normalizedIdempotencyKey = typeof idempotencyKey === 'string' && idempotencyKey.trim().length > 0
      ? idempotencyKey.trim()
      : null;

    if (normalizedIdempotencyKey) {
      const existing = this.store.findByIdempotency(context.tenantId, context.orgUnitId || '', normalizedIdempotencyKey);
      if (existing) {
        return toSubmissionResultFromRequest(existing);
      }
    }

    const validation = validatePayload(input, context);
    if (!validation.ok) {
      return {
        ok: false,
        code: 'ROUTESHYFT_DONOR_INTAKE_VALIDATION_FAILED',
        message: 'Pickup request validation failed.',
        data: {
          fieldErrors: validation.fieldErrors,
          nextSteps: ['Correct the listed fields and resubmit the request.'],
        },
      };
    }

    const pending = this.store.createPendingRequest(validation.payload);

    const existingCommitments = this.store.listCommitmentsForWindow(
      validation.payload.tenantId,
      validation.payload.orgUnitId,
      validation.payload.requestedWindowStartUtc,
      validation.payload.requestedWindowEndUtc,
    );

    const outcome = evaluateDonorIntakeCapacity(validation.payload, existingCommitments);

    if (outcome.ok) {
      const accepted = this.store.finalizeAcceptedWithCommitment(
        pending.requestId,
        outcome.slots,
        outcome.nextSteps,
      );

      if (normalizedIdempotencyKey) {
        this.store.setIdempotencyRequest(
          accepted.request.tenantId,
          accepted.request.orgUnitId,
          normalizedIdempotencyKey,
          accepted.request.requestId,
        );
      }

      return {
        ok: true,
        code: 'ROUTESHYFT_DONOR_INTAKE_SLOTS_AVAILABLE',
        message: 'Pickup request accepted with schedulable slots.',
        data: {
          requestId: accepted.request.requestId,
          commitmentId: accepted.commitment.commitmentId,
          status: 'Schedulable',
          slots: accepted.request.slots,
          nextSteps: accepted.request.nextSteps,
          lineage: {
            requestId: accepted.request.requestId,
            commitmentId: accepted.commitment.commitmentId,
          },
        },
      };
    }

    const refused = this.store.finalizeRefusal(
      pending.requestId,
      outcome.refusalReason,
      outcome.alternatives,
      outcome.nextSteps,
    );

    if (normalizedIdempotencyKey) {
      this.store.setIdempotencyRequest(
        refused.tenantId,
        refused.orgUnitId,
        normalizedIdempotencyKey,
        refused.requestId,
      );
    }

    return {
      ok: false,
      code: 'ROUTESHYFT_DONOR_INTAKE_REFUSED_CAPACITY',
      message: 'Pickup request refused because no capacity is available.',
      data: {
        requestId: refused.requestId,
        refusalReason: refused.refusalReason || 'Capacity unavailable',
        alternatives: refused.alternatives,
        nextSteps: refused.nextSteps,
      },
    };
  }

  getDonorRequestDetail(
    requestId: string,
    context: DonorIntakeContext,
  ): DonorRequestDetailResult {
    const normalizedRequestId = requestId.trim();
    if (normalizedRequestId.length === 0) {
      return {
        ok: false,
        code: 'ROUTESHYFT_DONOR_INTAKE_REQUEST_ID_REQUIRED',
        message: 'requestId is required.',
        data: {},
      };
    }

    const request = this.store.findRequestById(normalizedRequestId);
    if (!request) {
      return {
        ok: false,
        code: 'ROUTESHYFT_DONOR_INTAKE_REQUEST_NOT_FOUND',
        message: 'Pickup request not found.',
        data: {
          requestId: normalizedRequestId,
        },
      };
    }

    if (request.tenantId !== context.tenantId || (context.orgUnitId && request.orgUnitId !== context.orgUnitId)) {
      return {
        ok: false,
        code: 'ROUTESHYFT_DONOR_INTAKE_SCOPE_MISMATCH',
        message: 'Pickup request is outside the active tenant/orgUnit scope.',
        data: {
          requestId: normalizedRequestId,
        },
      };
    }

    if (request.commitmentId) {
      return {
        ok: true,
        code: 'ROUTESHYFT_DONOR_INTAKE_COMMITMENT_LINKED',
        message: 'Pickup request is linked to a commitment.',
        data: {
          requestId: request.requestId,
          status: 'Schedulable',
          commitmentId: request.commitmentId,
          lineage: {
            requestId: request.requestId,
            commitmentId: request.commitmentId,
          },
          nextSteps: request.nextSteps,
        },
      };
    }

    return {
      ok: true,
      code: 'ROUTESHYFT_DONOR_INTAKE_REQUEST_RESOLVED',
      message: 'Pickup request resolved with refusal outcome.',
      data: {
        requestId: request.requestId,
        status: 'Refused',
        refusalReason: request.refusalReason || 'Capacity unavailable',
        alternatives: request.alternatives,
        nextSteps: request.nextSteps,
      },
    };
  }
}

export const donorIntakeService = new DonorIntakeService();
