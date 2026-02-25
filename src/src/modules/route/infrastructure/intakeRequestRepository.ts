import { randomUUID } from 'node:crypto';
import type { RouteIntakeChannel, RouteScheduleMode } from '../domain/intakePolicy';

export type RouteIntakeStatus = 'Accepted' | 'Refused';

export type RouteIntakeOutcome = {
  reasonCode: string;
  message: string;
  alternatives: string[];
  nextSteps: string;
} | null;

export type RouteIntakeRecord = {
  requestId: string;
  tenantId: string;
  orgUnitId: string;
  channel: RouteIntakeChannel;
  requestedAtUtc: string;
  requestedWindowStartUtc: string;
  requestedWindowEndUtc: string;
  scheduleMode: RouteScheduleMode;
  notes: string;
  status: RouteIntakeStatus;
  commitmentId: string | null;
  refusal: RouteIntakeOutcome;
  createdByUserId: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type CreateAcceptedIntakeInput = {
  tenantId: string;
  orgUnitId: string;
  channel: RouteIntakeChannel;
  requestedAtUtc: string;
  requestedWindowStartUtc: string;
  requestedWindowEndUtc: string;
  scheduleMode: RouteScheduleMode;
  notes: string;
  commitmentId: string;
  createdByUserId: string | null;
};

export type CreateRefusedIntakeInput = {
  tenantId: string;
  orgUnitId: string;
  channel: RouteIntakeChannel;
  requestedAtUtc: string;
  requestedWindowStartUtc: string;
  requestedWindowEndUtc: string;
  scheduleMode: RouteScheduleMode;
  notes: string;
  refusal: Exclude<RouteIntakeOutcome, null>;
  createdByUserId: string | null;
};

export interface IntakeRequestRepository {
  createAccepted(input: CreateAcceptedIntakeInput): Promise<RouteIntakeRecord>;
  createRefused(input: CreateRefusedIntakeInput): Promise<RouteIntakeRecord>;
  getById(tenantId: string, requestId: string): Promise<RouteIntakeRecord | null>;
}

export class InMemoryIntakeRequestRepository implements IntakeRequestRepository {
  private readonly requestsById = new Map<string, RouteIntakeRecord>();

  async createAccepted(input: CreateAcceptedIntakeInput): Promise<RouteIntakeRecord> {
    const now = new Date().toISOString();
    const requestId = randomUUID();

    const record: RouteIntakeRecord = {
      requestId,
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      channel: input.channel,
      requestedAtUtc: input.requestedAtUtc,
      requestedWindowStartUtc: input.requestedWindowStartUtc,
      requestedWindowEndUtc: input.requestedWindowEndUtc,
      scheduleMode: input.scheduleMode,
      notes: input.notes,
      status: 'Accepted',
      commitmentId: input.commitmentId,
      refusal: null,
      createdByUserId: input.createdByUserId,
      createdAtUtc: now,
      updatedAtUtc: now,
    };

    this.requestsById.set(requestId, record);

    return { ...record };
  }

  async createRefused(input: CreateRefusedIntakeInput): Promise<RouteIntakeRecord> {
    const now = new Date().toISOString();
    const requestId = randomUUID();

    const record: RouteIntakeRecord = {
      requestId,
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      channel: input.channel,
      requestedAtUtc: input.requestedAtUtc,
      requestedWindowStartUtc: input.requestedWindowStartUtc,
      requestedWindowEndUtc: input.requestedWindowEndUtc,
      scheduleMode: input.scheduleMode,
      notes: input.notes,
      status: 'Refused',
      commitmentId: null,
      refusal: input.refusal,
      createdByUserId: input.createdByUserId,
      createdAtUtc: now,
      updatedAtUtc: now,
    };

    this.requestsById.set(requestId, record);

    return { ...record };
  }

  async getById(tenantId: string, requestId: string): Promise<RouteIntakeRecord | null> {
    const record = this.requestsById.get(requestId);
    if (!record || record.tenantId !== tenantId) {
      return null;
    }

    return { ...record };
  }
}
