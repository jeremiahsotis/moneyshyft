import { randomUUID } from 'node:crypto';
import type { CapacityAlternative, DonorCapacitySlot } from '../domain/capacityPolicy';

export type DonorRequestStatus = 'PENDING' | 'SCHEDULABLE' | 'REFUSED';

export type DonorRequestRecord = {
  requestId: string;
  tenantId: string;
  orgUnitId: string;
  requestedAtUtc: string;
  requestedWindowStartUtc: string;
  requestedWindowEndUtc: string;
  donorEligibilityConfirmed: boolean;
  pickupAddress: string;
  zipCode: string;
  channel: string;
  notes: string;
  itemCount: number;
  itemSummary: string;
  forceRefusal: boolean;
  status: DonorRequestStatus;
  createdAtUtc: string;
  updatedAtUtc: string;
  commitmentId: string | null;
  slots: DonorCapacitySlot[];
  alternatives: CapacityAlternative[];
  nextSteps: string[];
  refusalReason: string | null;
};

export type CommitmentRecord = {
  commitmentId: string;
  tenantId: string;
  orgUnitId: string;
  requestId: string;
  status: 'SCHEDULED';
  slotStartUtc: string;
  slotEndUtc: string;
  createdAtUtc: string;
};

export type CreatePendingRequestInput = {
  tenantId: string;
  orgUnitId: string;
  requestedAtUtc: string;
  requestedWindowStartUtc: string;
  requestedWindowEndUtc: string;
  donorEligibilityConfirmed: boolean;
  pickupAddress: string;
  zipCode: string;
  channel: string;
  notes: string;
  itemCount: number;
  itemSummary: string;
  forceRefusal: boolean;
};

const scopeKey = (tenantId: string, orgUnitId: string): string => `${tenantId}::${orgUnitId}`;

const idempotencyKey = (tenantId: string, orgUnitId: string, key: string): string =>
  `${scopeKey(tenantId, orgUnitId)}::${key}`;

const overlaps = (
  leftStartUtc: string,
  leftEndUtc: string,
  rightStartUtc: string,
  rightEndUtc: string,
): boolean => {
  const leftStart = new Date(leftStartUtc).getTime();
  const leftEnd = new Date(leftEndUtc).getTime();
  const rightStart = new Date(rightStartUtc).getTime();
  const rightEnd = new Date(rightEndUtc).getTime();
  return leftStart < rightEnd && rightStart < leftEnd;
};

export class InMemoryRouteIntakeStore {
  private readonly requests = new Map<string, DonorRequestRecord>();

  private readonly commitments = new Map<string, CommitmentRecord>();

  private readonly requestsByScope = new Map<string, string[]>();

  private readonly requestsByIdempotency = new Map<string, string>();

  reset(): void {
    this.requests.clear();
    this.commitments.clear();
    this.requestsByScope.clear();
    this.requestsByIdempotency.clear();
  }

  createPendingRequest(input: CreatePendingRequestInput): DonorRequestRecord {
    const nowUtc = new Date().toISOString();
    const requestId = `request-${randomUUID()}`;
    const record: DonorRequestRecord = {
      requestId,
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      requestedAtUtc: input.requestedAtUtc,
      requestedWindowStartUtc: input.requestedWindowStartUtc,
      requestedWindowEndUtc: input.requestedWindowEndUtc,
      donorEligibilityConfirmed: input.donorEligibilityConfirmed,
      pickupAddress: input.pickupAddress,
      zipCode: input.zipCode,
      channel: input.channel,
      notes: input.notes,
      itemCount: input.itemCount,
      itemSummary: input.itemSummary,
      forceRefusal: input.forceRefusal,
      status: 'PENDING',
      createdAtUtc: nowUtc,
      updatedAtUtc: nowUtc,
      commitmentId: null,
      slots: [],
      alternatives: [],
      nextSteps: [],
      refusalReason: null,
    };

    this.requests.set(record.requestId, record);

    const key = scopeKey(record.tenantId, record.orgUnitId);
    const current = this.requestsByScope.get(key) ?? [];
    current.push(record.requestId);
    this.requestsByScope.set(key, current);

    return record;
  }

  finalizeAcceptedWithCommitment(
    requestId: string,
    slots: DonorCapacitySlot[],
    nextSteps: string[],
  ): { request: DonorRequestRecord; commitment: CommitmentRecord } {
    const request = this.mustGetRequest(requestId);

    if (request.commitmentId) {
      const existingCommitment = this.commitments.get(request.commitmentId);
      if (!existingCommitment) {
        throw new Error('REQUEST_COMMITMENT_REFERENCE_BROKEN');
      }

      return {
        request,
        commitment: existingCommitment,
      };
    }

    const nowUtc = new Date().toISOString();
    const selectedSlot = slots[0];
    const commitment: CommitmentRecord = {
      commitmentId: `commitment-${randomUUID()}`,
      tenantId: request.tenantId,
      orgUnitId: request.orgUnitId,
      requestId,
      status: 'SCHEDULED',
      slotStartUtc: selectedSlot.slotStartUtc,
      slotEndUtc: selectedSlot.slotEndUtc,
      createdAtUtc: nowUtc,
    };

    request.status = 'SCHEDULABLE';
    request.commitmentId = commitment.commitmentId;
    request.slots = slots;
    request.alternatives = [];
    request.refusalReason = null;
    request.nextSteps = [...nextSteps];
    request.updatedAtUtc = nowUtc;

    this.commitments.set(commitment.commitmentId, commitment);

    return {
      request,
      commitment,
    };
  }

  finalizeRefusal(
    requestId: string,
    refusalReason: string,
    alternatives: CapacityAlternative[],
    nextSteps: string[],
  ): DonorRequestRecord {
    const request = this.mustGetRequest(requestId);
    const nowUtc = new Date().toISOString();

    request.status = 'REFUSED';
    request.commitmentId = null;
    request.slots = [];
    request.alternatives = [...alternatives];
    request.refusalReason = refusalReason;
    request.nextSteps = [...nextSteps];
    request.updatedAtUtc = nowUtc;

    return request;
  }

  setIdempotencyRequest(
    tenantId: string,
    orgUnitId: string,
    key: string,
    requestId: string,
  ): void {
    this.requestsByIdempotency.set(idempotencyKey(tenantId, orgUnitId, key), requestId);
  }

  findByIdempotency(
    tenantId: string,
    orgUnitId: string,
    key: string,
  ): DonorRequestRecord | null {
    const requestId = this.requestsByIdempotency.get(idempotencyKey(tenantId, orgUnitId, key));
    if (!requestId) {
      return null;
    }

    return this.requests.get(requestId) ?? null;
  }

  findRequestById(requestId: string): DonorRequestRecord | null {
    return this.requests.get(requestId) ?? null;
  }

  listCommitmentsForWindow(
    tenantId: string,
    orgUnitId: string,
    requestedWindowStartUtc: string,
    requestedWindowEndUtc: string,
  ): CommitmentRecord[] {
    return [...this.commitments.values()].filter((commitment) => (
      commitment.tenantId === tenantId
      && commitment.orgUnitId === orgUnitId
      && overlaps(
        commitment.slotStartUtc,
        commitment.slotEndUtc,
        requestedWindowStartUtc,
        requestedWindowEndUtc,
      )
    ));
  }

  private mustGetRequest(requestId: string): DonorRequestRecord {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('REQUEST_NOT_FOUND');
    }

    return request;
  }
}

export const routeIntakeStore = new InMemoryRouteIntakeStore();

export const resetRouteIntakeStoreForTests = (): void => {
  routeIntakeStore.reset();
};
