import type { Person } from '@shyft/contracts';
import type { Knex } from 'knex';
import db from '../../config/knex';
import {
  CAPABILITIES,
  hasCapability,
  type Capability,
} from '../../platform/rbac/capabilities';
import type { Activity, ActivityStatus } from '../peoplecore/activity';
import {
  AsyncPeopleCoreService,
  PeopleCorePersistenceUnavailableError,
  peopleCoreServiceAsync,
} from '../peoplecore/service';
import { PeopleCoreScopeViolationError } from '../peoplecore/store';
import type { ConnectShyftThread } from './threads';

const CREATE_ACTIVITY_CAPABILITIES: readonly Capability[] = [
  CAPABILITIES.ORG_UNIT_NEIGHBOR_EDIT_RELATED,
  CAPABILITIES.NEIGHBOR_EDIT_ALL,
  CAPABILITIES.ORG_UNIT_IDENTITY_RESOLVE,
] as const;

const VIEW_ACTIVITY_CAPABILITIES: readonly Capability[] = [
  CAPABILITIES.ORG_UNIT_NEIGHBOR_EDIT_RELATED,
  CAPABILITIES.NEIGHBOR_EDIT_ALL,
  CAPABILITIES.ORG_UNIT_IDENTITY_RESOLVE,
  CAPABILITIES.ORG_UNIT_THREAD_VIEW,
  CAPABILITIES.THREAD_VIEW_ALL,
  CAPABILITIES.TENANT_READ_ALL,
] as const;

const isMissingPersistenceError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string };
  return candidate.code === '42P01'
    || candidate.code === '3F000'
    || candidate.code === '42703';
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const toIsoUtc = (value: unknown, fallbackIsoUtc: string): string => {
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed.toISOString();
    }
  }

  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString();
  }

  return fallbackIsoUtc;
};

const cloneThread = (thread: ConnectShyftThread): ConnectShyftThread => ({
  ...thread,
  escalation: {
    ...thread.escalation,
  },
});

const compareThreads = (left: ConnectShyftThread, right: ConnectShyftThread): number => {
  const createdAtDelta =
    new Date(left.createdAtUtc).getTime() - new Date(right.createdAtUtc).getTime();
  if (createdAtDelta !== 0) {
    return createdAtDelta;
  }

  return left.threadId.localeCompare(right.threadId);
};

type DbThreadRow = {
  id: string;
  tenant_id: string;
  org_unit_id: string;
  neighbor_id: string;
  person_id: string;
  activity_id: string | null;
  source: string;
  state: ConnectShyftThread['state'];
  escalation_stage: number;
  next_evaluation_at_utc: string | Date | null;
  last_inbound_cs_number_id: string;
  preferred_outbound_cs_number_id: string;
  claimed_by_user_id: string | null;
  claimed_at_utc: string | Date | null;
  closed_by_user_id: string | null;
  closed_at_utc: string | Date | null;
  created_at_utc: string | Date;
  updated_at_utc: string | Date;
};

const mapDbThreadRowToThread = (row: DbThreadRow): ConnectShyftThread => {
  const fallbackIsoUtc = new Date().toISOString();

  return {
    threadId: row.id,
    tenantId: row.tenant_id,
    orgUnitId: row.org_unit_id,
    neighborId: row.neighbor_id,
    personId: row.person_id,
    activityId: row.activity_id,
    source: row.source,
    state: row.state,
    lastInboundCsNumberId: row.last_inbound_cs_number_id,
    preferredOutboundCsNumberId: row.preferred_outbound_cs_number_id,
    claimedByUserId: row.claimed_by_user_id,
    claimedAtUtc: row.claimed_at_utc ? toIsoUtc(row.claimed_at_utc, fallbackIsoUtc) : null,
    closedByUserId: row.closed_by_user_id,
    closedAtUtc: row.closed_at_utc ? toIsoUtc(row.closed_at_utc, fallbackIsoUtc) : null,
    createdAtUtc: toIsoUtc(row.created_at_utc, fallbackIsoUtc),
    updatedAtUtc: toIsoUtc(row.updated_at_utc, fallbackIsoUtc),
    escalation: {
      stage: row.escalation_stage,
      nextEvaluationAtUtc: row.next_evaluation_at_utc
        ? toIsoUtc(row.next_evaluation_at_utc, fallbackIsoUtc)
        : null,
    },
  };
};

const hasAnyCapability = (
  actorRoles: Array<string | null | undefined>,
  capabilities: readonly Capability[],
): boolean => capabilities.some((capability) => hasCapability(actorRoles, capability));

const isPersonInOrgUnit = (person: Person | null, orgUnitId: string): person is Person =>
  Boolean(person && person.orgUnitId === orgUnitId);

type ActivityThreadStoreInput = {
  tenantId: string;
  orgUnitId: string;
  activityId: string;
};

type PeopleCoreActivityServiceLike = Pick<
  AsyncPeopleCoreService,
  'createActivity' | 'getActivity' | 'getPerson' | 'listActivities'
>;

export class ConnectShyftActivityServiceError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly httpStatus: number,
    readonly refusalType: 'business' | 'client' | 'security' = 'business',
    cause?: unknown,
  ) {
    super(message);
    this.name = 'ConnectShyftActivityServiceError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class ConnectShyftActivityForbiddenError extends ConnectShyftActivityServiceError {
  constructor() {
    super(
      'ConnectShyft activity access requires an authorized ConnectShyft role.',
      'CONNECTSHYFT_FORBIDDEN',
      403,
      'security',
    );
    this.name = 'ConnectShyftActivityForbiddenError';
  }
}

export class ConnectShyftPersonNotFoundError extends ConnectShyftActivityServiceError {
  constructor() {
    super(
      'Person not found for the active tenant and orgUnit context.',
      'CONNECTSHYFT_PERSON_NOT_FOUND',
      404,
    );
    this.name = 'ConnectShyftPersonNotFoundError';
  }
}

export class ConnectShyftActivityNotFoundError extends ConnectShyftActivityServiceError {
  constructor() {
    super(
      'Activity not found for the active tenant and orgUnit context.',
      'CONNECTSHYFT_ACTIVITY_NOT_FOUND',
      404,
    );
    this.name = 'ConnectShyftActivityNotFoundError';
  }
}

export class ConnectShyftActivityPersistenceUnavailableError extends ConnectShyftActivityServiceError {
  constructor(cause?: unknown) {
    super(
      'ConnectShyft activity persistence is temporarily unavailable.',
      'CONNECTSHYFT_ACTIVITY_PERSISTENCE_UNAVAILABLE',
      503,
      'business',
      cause,
    );
    this.name = 'ConnectShyftActivityPersistenceUnavailableError';
  }
}

export interface CreatePersonActivityInput {
  actorRoles: Array<string | null | undefined>;
  tenantId: string;
  orgUnitId: string;
  personId: string;
  type: string;
  status?: ActivityStatus;
}

export interface ListPersonActivitiesInput {
  actorRoles: Array<string | null | undefined>;
  tenantId: string;
  orgUnitId: string;
  personId: string;
}

export interface ListActivityThreadsInput {
  actorRoles: Array<string | null | undefined>;
  tenantId: string;
  orgUnitId: string;
  activityId: string;
}

export interface AsyncConnectShyftActivityService {
  createPersonActivity(input: CreatePersonActivityInput): Promise<Activity>;
  listPersonActivities(input: ListPersonActivitiesInput): Promise<Activity[]>;
  listActivityThreads(input: ListActivityThreadsInput): Promise<ConnectShyftThread[]>;
}

export interface ConnectShyftActivityThreadStore {
  listThreadsByActivity(input: ActivityThreadStoreInput): Promise<ConnectShyftThread[]>;
}

export class InMemoryConnectShyftActivityThreadStore implements ConnectShyftActivityThreadStore {
  constructor(private readonly threads: ConnectShyftThread[] = []) {}

  async listThreadsByActivity(input: ActivityThreadStoreInput): Promise<ConnectShyftThread[]> {
    return this.threads
      .filter((thread) =>
        thread.tenantId === input.tenantId
        && thread.orgUnitId === input.orgUnitId
        && thread.activityId === input.activityId)
      .sort(compareThreads)
      .map(cloneThread);
  }
}

export class KnexConnectShyftActivityThreadStore implements ConnectShyftActivityThreadStore {
  constructor(private readonly knexClient: Knex = db) {}

  async listThreadsByActivity(input: ActivityThreadStoreInput): Promise<ConnectShyftThread[]> {
    try {
      const rows = await this.knexClient
        .withSchema('connectshyft')
        .table('cs_threads')
        .where({
          tenant_id: input.tenantId,
          org_unit_id: input.orgUnitId,
          activity_id: input.activityId,
        })
        .orderBy('created_at_utc', 'asc')
        .orderBy('id', 'asc')
        .select<DbThreadRow[]>([
          'id',
          'tenant_id',
          'org_unit_id',
          'neighbor_id',
          'person_id',
          'activity_id',
          'source',
          'state',
          'escalation_stage',
          'next_evaluation_at_utc',
          'last_inbound_cs_number_id',
          'preferred_outbound_cs_number_id',
          'claimed_by_user_id',
          'claimed_at_utc',
          'closed_by_user_id',
          'closed_at_utc',
          'created_at_utc',
          'updated_at_utc',
        ]);

      return rows.map(mapDbThreadRowToThread);
    } catch (error) {
      if (isMissingPersistenceError(error)) {
        throw new ConnectShyftActivityPersistenceUnavailableError(error);
      }

      throw error;
    }
  }
}

export class ConnectShyftActivityService implements AsyncConnectShyftActivityService {
  constructor(
    private readonly peopleCoreService: PeopleCoreActivityServiceLike = peopleCoreServiceAsync,
    private readonly threadStore: ConnectShyftActivityThreadStore =
      new KnexConnectShyftActivityThreadStore(),
  ) {}

  private async withPersistenceHandling<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ConnectShyftActivityServiceError) {
        throw error;
      }

      if (error instanceof PeopleCorePersistenceUnavailableError) {
        throw new ConnectShyftActivityPersistenceUnavailableError(error);
      }

      throw error;
    }
  }

  private ensureCreateCapability(actorRoles: Array<string | null | undefined>): void {
    if (!hasAnyCapability(actorRoles, CREATE_ACTIVITY_CAPABILITIES)) {
      throw new ConnectShyftActivityForbiddenError();
    }
  }

  private ensureViewCapability(actorRoles: Array<string | null | undefined>): void {
    if (!hasAnyCapability(actorRoles, VIEW_ACTIVITY_CAPABILITIES)) {
      throw new ConnectShyftActivityForbiddenError();
    }
  }

  private async ensurePersonInScope(input: {
    tenantId: string;
    orgUnitId: string;
    personId: string;
  }): Promise<Person> {
    const person = await this.peopleCoreService.getPerson({
      tenantId: input.tenantId,
      personId: input.personId,
    });

    if (!isPersonInOrgUnit(person, input.orgUnitId)) {
      throw new ConnectShyftPersonNotFoundError();
    }

    return person;
  }

  async createPersonActivity(input: CreatePersonActivityInput): Promise<Activity> {
    this.ensureCreateCapability(input.actorRoles);

    return this.withPersistenceHandling(async () => {
      await this.ensurePersonInScope(input);

      try {
        return await this.peopleCoreService.createActivity({
          tenantId: input.tenantId,
          orgUnitId: input.orgUnitId,
          personId: input.personId,
          type: normalizeString(input.type),
          status: input.status,
        });
      } catch (error) {
        if (error instanceof PeopleCoreScopeViolationError) {
          throw new ConnectShyftPersonNotFoundError();
        }

        throw error;
      }
    });
  }

  async listPersonActivities(input: ListPersonActivitiesInput): Promise<Activity[]> {
    this.ensureViewCapability(input.actorRoles);

    return this.withPersistenceHandling(async () => {
      await this.ensurePersonInScope(input);

      try {
        return await this.peopleCoreService.listActivities({
          tenantId: input.tenantId,
          orgUnitId: input.orgUnitId,
          personId: input.personId,
        });
      } catch (error) {
        if (error instanceof PeopleCoreScopeViolationError) {
          throw new ConnectShyftPersonNotFoundError();
        }

        throw error;
      }
    });
  }

  async listActivityThreads(input: ListActivityThreadsInput): Promise<ConnectShyftThread[]> {
    this.ensureViewCapability(input.actorRoles);

    return this.withPersistenceHandling(async () => {
      const activity = await this.peopleCoreService.getActivity({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        activityId: input.activityId,
      });

      if (!activity) {
        throw new ConnectShyftActivityNotFoundError();
      }

      return this.threadStore.listThreadsByActivity({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        activityId: input.activityId,
      });
    });
  }
}

export const connectShyftActivityServiceAsync = new ConnectShyftActivityService();
