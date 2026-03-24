import type {
  ContactPoint,
  ContactPointEvent,
  ContactPointLink,
  ContactPointStatus,
  ResolverReviewStatus,
  ContactPointLinkSubjectType,
  ContactPointType,
  Household,
  HouseholdMembership,
  Person,
  ResolverReview,
} from '@shyft/contracts';
import type { Knex } from 'knex';
import db from '../../config/knex';
import {
  assertContactPointStatus,
  computeContactPointStatus,
} from './lifecycle';
import type {
  Activity,
  CreateActivityInput,
  GetActivityInput,
  ListActivitiesInput,
  PeopleCoreActivityStore,
} from './activity';

const PEOPLE_SCHEMA = 'people';
const DEFAULT_CONTACT_POINT_EVENT_LIMIT = 50;
const MAX_CONTACT_POINT_EVENT_LIMIT = 200;

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

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));
};

const normalizeEventLimit = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_CONTACT_POINT_EVENT_LIMIT;
  }

  const normalized = Math.trunc(value);
  if (normalized <= 0) {
    return DEFAULT_CONTACT_POINT_EVENT_LIMIT;
  }

  return Math.min(normalized, MAX_CONTACT_POINT_EVENT_LIMIT);
};

const PENDING_RESOLVER_REVIEW_STATUSES = new Set<ResolverReviewStatus>([
  'pending',
  'queued',
  'in_review',
  'waiting_for_more_info',
]);

const normalizePersonMergeStatus = (person: Pick<Person, 'status' | 'mergedIntoPersonId'>): PersonMergeStatus => {
  if (person.status === 'merged' || normalizeOptionalString(person.mergedIntoPersonId)) {
    return 'merged';
  }

  return person.status === 'active_provisional' ? 'provisional' : 'canonical';
};

const uniqueStrings = (values: Iterable<string>): string[] =>
  Array.from(new Set(Array.from(values).filter((value) => value.length > 0)));

const normalizeOptionalUtc = (value: unknown): string | undefined => {
  if (value == null) {
    return undefined;
  }

  return toIsoUtc(value, new Date(0).toISOString());
};

const buildMergeReviewTriggerSourceId = (input: {
  provisionalPersonId: string;
  canonicalPersonId: string;
}): string => `${input.provisionalPersonId}:${input.canonicalPersonId}`;

export class PeopleCoreScopeViolationError extends Error {
  readonly code = 'PEOPLECORE_SCOPE_VIOLATION';

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'PeopleCoreScopeViolationError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class PeopleCoreMergeScopeViolationError extends Error {
  readonly code = 'PEOPLECORE_MERGE_SCOPE_VIOLATION';

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'PeopleCoreMergeScopeViolationError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class PeopleCorePersonAlreadyMergedError extends Error {
  readonly code = 'PEOPLECORE_PERSON_ALREADY_MERGED';

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'PeopleCorePersonAlreadyMergedError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class PeopleCoreConflictError extends Error {
  readonly code = 'PEOPLECORE_CONFLICT';

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'PeopleCoreConflictError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export type CreatePersonInput = Omit<Person, 'id' | 'createdAt' | 'updatedAt'> & {
  personId?: string;
};

export type GetPersonInput = {
  tenantId: string;
  personId: string;
};

export type ListPersonsInput = {
  tenantId: string;
  orgUnitId?: string;
};

export type CreateHouseholdInput = Omit<Household, 'id' | 'createdAt' | 'updatedAt'> & {
  householdId?: string;
};

export type GetHouseholdInput = {
  tenantId: string;
  householdId: string;
};

export type CreateHouseholdMembershipInput = Omit<
  HouseholdMembership,
  'id' | 'createdAt' | 'updatedAt'
> & {
  membershipId?: string;
  tenantId: string;
};

export type ListHouseholdMembershipsInput = {
  tenantId: string;
  householdId?: string;
  personId?: string;
  isCurrent?: boolean;
};

export type CreateContactPointInput = Omit<ContactPoint, 'id' | 'createdAt' | 'updatedAt'> & {
  contactPointId?: string;
};

export type GetContactPointInput = {
  tenantId: string;
  contactPointId: string;
};

export type ListContactPointsByNormalizedValueInput = {
  tenantId: string;
  type: ContactPointType;
  normalizedValue: string;
};

export type CreateContactPointLinkInput = Omit<
  ContactPointLink,
  'id' | 'createdAt' | 'updatedAt'
> & {
  linkId?: string;
  tenantId: string;
  mergedIntoSubjectId?: string;
  mergedAt?: string;
  mergedByUserId?: string;
  mergeClass?: PeopleCoreMergeClass;
  mergeReason?: string;
};

export type ListCurrentContactPointLinksInput = {
  tenantId: string;
  contactPointId?: string;
  subjectType?: ContactPointLinkSubjectType;
  subjectId?: string;
};

export type ListContactPointLinksInput = ListCurrentContactPointLinksInput & {
  isCurrent?: boolean;
};

export type AppendContactPointEventInput = Omit<ContactPointEvent, 'id' | 'createdAt'> & {
  eventId?: string;
  createdAt?: string;
};

export type ListContactPointEventsInput = {
  tenantId: string;
  contactPointId: string;
  limit?: number;
};

export type CreateResolverReviewInput = Omit<ResolverReview, 'id'> & {
  reviewId?: string;
};

export type GetResolverReviewInput = {
  tenantId: string;
  reviewId: string;
};

export type ListResolverReviewsInput = {
  tenantId: string;
  orgUnitId?: string;
};

export type PeopleCoreMergeClass = 'auto' | 'review';

export type MergePersonInput = {
  tenantId: string;
  orgUnitId: string;
  provisionalPersonId: string;
  canonicalPersonId: string;
  performedByUserId: string;
  mergeReason?: string;
};

export type PersonMergeStatus = 'provisional' | 'canonical' | 'merged';

export type PeopleCoreMergeResult = {
  mergedProvisionalPersonId: string;
  canonicalPersonId: string;
  autoMergedContactPointLinkIds: string[];
  reviewContactPointLinkIds: string[];
  resolverReviewId?: string;
  didPersistMerge?: boolean;
};

export interface PeopleCoreStore extends PeopleCoreActivityStore {
  createPerson(input: CreatePersonInput): Promise<Person>;
  getPerson(input: GetPersonInput): Promise<Person | null>;
  listPersons(input: ListPersonsInput): Promise<Person[]>;
  mergePerson(input: MergePersonInput): Promise<PeopleCoreMergeResult>;
  getPersonMergeStatus(input: GetPersonInput): Promise<PersonMergeStatus>;
  createHousehold(input: CreateHouseholdInput): Promise<Household>;
  getHousehold(input: GetHouseholdInput): Promise<Household | null>;
  createHouseholdMembership(input: CreateHouseholdMembershipInput): Promise<HouseholdMembership>;
  listHouseholdMemberships(input: ListHouseholdMembershipsInput): Promise<HouseholdMembership[]>;
  createContactPoint(input: CreateContactPointInput): Promise<ContactPoint>;
  getContactPoint(input: GetContactPointInput): Promise<ContactPoint | null>;
  listContactPointsByNormalizedValue(
    input: ListContactPointsByNormalizedValueInput,
  ): Promise<ContactPoint[]>;
  createContactPointLink(input: CreateContactPointLinkInput): Promise<ContactPointLink>;
  listContactPointLinks(input: ListContactPointLinksInput): Promise<ContactPointLink[]>;
  listCurrentContactPointLinks(
    input: ListCurrentContactPointLinksInput,
  ): Promise<ContactPointLink[]>;
  appendContactPointEvent(input: AppendContactPointEventInput): Promise<ContactPointEvent>;
  updateContactPointStatus(input: {
    tenantId: string;
    contactPointId: string;
    newStatus: ContactPointStatus;
  }): Promise<void>;
  listContactPointEvents(input: ListContactPointEventsInput): Promise<ContactPointEvent[]>;
  createResolverReview(input: CreateResolverReviewInput): Promise<ResolverReview>;
  getResolverReview(input: GetResolverReviewInput): Promise<ResolverReview | null>;
  listResolverReviews(input: ListResolverReviewsInput): Promise<ResolverReview[]>;
}

type DbPersonRow = {
  id: string;
  tenant_id: string;
  org_unit_id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  status: Person['status'];
  merged_into_person_id: string | null;
  created_at_utc: string | Date;
  updated_at_utc: string | Date;
};

type DbHouseholdRow = {
  id: string;
  tenant_id: string;
  org_unit_id: string;
  name: string | null;
  status: Household['status'];
  created_at_utc: string | Date;
  updated_at_utc: string | Date;
};

type DbHouseholdMembershipRow = {
  id: string;
  household_id: string;
  person_id: string;
  role: HouseholdMembership['role'];
  is_current: boolean;
  start_at_utc: string | Date | null;
  end_at_utc: string | Date | null;
  created_at_utc: string | Date;
  updated_at_utc: string | Date;
};

type DbContactPointRow = {
  id: string;
  tenant_id: string;
  type: ContactPoint['type'];
  normalized_value: string;
  raw_value: string | null;
  status: ContactPoint['status'];
  first_seen_at_utc: string | Date;
  last_seen_at_utc: string | Date;
  last_inbound_at_utc: string | Date | null;
  last_outbound_at_utc: string | Date | null;
  suspected_shared: boolean;
  confirmed_shared: boolean;
  reassignment_suspected: boolean;
  created_at_utc: string | Date;
  updated_at_utc: string | Date;
};

type DbContactPointLinkRow = {
  id: string;
  contact_point_id: string;
  subject_type: ContactPointLink['subjectType'];
  subject_id: string;
  link_type: ContactPointLink['linkType'];
  confidence_band: ContactPointLink['confidenceBand'];
  is_current: boolean;
  is_primary: boolean;
  manually_confirmed: boolean;
  confirmation_source: ContactPointLink['confirmationSource'] | null;
  first_linked_at_utc: string | Date;
  last_confirmed_at_utc: string | Date | null;
  last_used_at_utc: string | Date | null;
  linked_by: ContactPointLink['linkedBy'];
  linked_by_user_id: string | null;
  unlink_reason: string | null;
  unlinked_at_utc: string | Date | null;
  merged_into_subject_id: string | null;
  merged_at_utc: string | Date | null;
  merged_by_user_id: string | null;
  merge_class: PeopleCoreMergeClass;
  merge_reason: string | null;
  created_at_utc: string | Date;
  updated_at_utc: string | Date;
};

type DbContactPointEventRow = {
  id: string;
  tenant_id: string;
  contact_point_id: string;
  event_type: ContactPointEvent['eventType'];
  event_source: string;
  related_object_type: string | null;
  related_object_id: string | null;
  created_at_utc: string | Date;
};

type DbResolverReviewRow = {
  id: string;
  tenant_id: string;
  org_unit_id: string;
  review_type: ResolverReview['reviewType'];
  review_status: ResolverReview['reviewStatus'];
  priority: ResolverReview['priority'];
  trigger_source_type: string;
  trigger_source_id: string;
  conversation_id: string | null;
  provisional_person_id: string | null;
  candidate_person_ids: unknown;
  contact_point_id: string | null;
  confidence_band: ResolverReview['confidenceBand'];
  confidence_reasons: unknown;
  risk_flags: unknown;
  requested_by_user_id: string;
  assigned_resolver_user_id: string | null;
  requested_at_utc: string | Date;
  started_at_utc: string | Date | null;
  resolved_at_utc: string | Date | null;
  resolution_type: ResolverReview['resolutionType'] | null;
  resolution_reason: string | null;
  resolution_notes: string | null;
};

type DbActivityRow = {
  id: string;
  tenant_id: string;
  org_unit_id: string;
  person_id: string;
  type: string;
  status: Activity['status'];
  created_at_utc: string | Date;
  updated_at_utc: string | Date;
};

const mapPersonRow = (row: DbPersonRow): Person => {
  const fallbackIsoUtc = new Date().toISOString();

  return {
    id: row.id,
    tenantId: row.tenant_id,
    orgUnitId: row.org_unit_id,
    firstName: row.first_name,
    lastName: row.last_name,
    preferredName: normalizeOptionalString(row.preferred_name),
    status: row.status,
    mergedIntoPersonId: normalizeOptionalString(row.merged_into_person_id),
    createdAt: toIsoUtc(row.created_at_utc, fallbackIsoUtc),
    updatedAt: toIsoUtc(row.updated_at_utc, fallbackIsoUtc),
  };
};

const mapHouseholdRow = (row: DbHouseholdRow): Household => {
  const fallbackIsoUtc = new Date().toISOString();

  return {
    id: row.id,
    tenantId: row.tenant_id,
    orgUnitId: row.org_unit_id,
    name: normalizeOptionalString(row.name),
    status: row.status,
    createdAt: toIsoUtc(row.created_at_utc, fallbackIsoUtc),
    updatedAt: toIsoUtc(row.updated_at_utc, fallbackIsoUtc),
  };
};

const mapHouseholdMembershipRow = (row: DbHouseholdMembershipRow): HouseholdMembership => {
  const fallbackIsoUtc = new Date().toISOString();

  return {
    id: row.id,
    householdId: row.household_id,
    personId: row.person_id,
    role: row.role,
    isCurrent: row.is_current,
    startAt: row.start_at_utc ? toIsoUtc(row.start_at_utc, fallbackIsoUtc) : undefined,
    endAt: row.end_at_utc ? toIsoUtc(row.end_at_utc, fallbackIsoUtc) : undefined,
    createdAt: toIsoUtc(row.created_at_utc, fallbackIsoUtc),
    updatedAt: toIsoUtc(row.updated_at_utc, fallbackIsoUtc),
  };
};

const mapContactPointRow = (row: DbContactPointRow): ContactPoint => {
  const fallbackIsoUtc = new Date().toISOString();

  return {
    id: row.id,
    tenantId: row.tenant_id,
    type: row.type,
    normalizedValue: row.normalized_value,
    rawValue: normalizeOptionalString(row.raw_value),
    status: row.status,
    firstSeenAt: toIsoUtc(row.first_seen_at_utc, fallbackIsoUtc),
    lastSeenAt: toIsoUtc(row.last_seen_at_utc, fallbackIsoUtc),
    lastInboundAt: row.last_inbound_at_utc
      ? toIsoUtc(row.last_inbound_at_utc, fallbackIsoUtc)
      : undefined,
    lastOutboundAt: row.last_outbound_at_utc
      ? toIsoUtc(row.last_outbound_at_utc, fallbackIsoUtc)
      : undefined,
    suspectedShared: row.suspected_shared,
    confirmedShared: row.confirmed_shared,
    reassignmentSuspected: row.reassignment_suspected,
    createdAt: toIsoUtc(row.created_at_utc, fallbackIsoUtc),
    updatedAt: toIsoUtc(row.updated_at_utc, fallbackIsoUtc),
  };
};

const mapContactPointLinkRow = (row: DbContactPointLinkRow): ContactPointLink => {
  const fallbackIsoUtc = new Date().toISOString();

  const mappedLink = {
    id: row.id,
    contactPointId: row.contact_point_id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    linkType: row.link_type,
    confidenceBand: row.confidence_band,
    isCurrent: row.is_current,
    isPrimary: row.is_primary,
    manuallyConfirmed: row.manually_confirmed,
    confirmationSource: row.confirmation_source || undefined,
    firstLinkedAt: toIsoUtc(row.first_linked_at_utc, fallbackIsoUtc),
    lastConfirmedAt: row.last_confirmed_at_utc
      ? toIsoUtc(row.last_confirmed_at_utc, fallbackIsoUtc)
      : undefined,
    lastUsedAt: row.last_used_at_utc
      ? toIsoUtc(row.last_used_at_utc, fallbackIsoUtc)
      : undefined,
    linkedBy: row.linked_by,
    linkedByUserId: normalizeOptionalString(row.linked_by_user_id),
    unlinkReason: normalizeOptionalString(row.unlink_reason),
    unlinkedAt: row.unlinked_at_utc ? toIsoUtc(row.unlinked_at_utc, fallbackIsoUtc) : undefined,
    mergedIntoSubjectId: normalizeOptionalString(row.merged_into_subject_id),
    mergedAt: row.merged_at_utc ? toIsoUtc(row.merged_at_utc, fallbackIsoUtc) : undefined,
    mergedByUserId: normalizeOptionalString(row.merged_by_user_id),
    mergeClass: row.merge_class,
    mergeReason: normalizeOptionalString(row.merge_reason),
    createdAt: toIsoUtc(row.created_at_utc, fallbackIsoUtc),
    updatedAt: toIsoUtc(row.updated_at_utc, fallbackIsoUtc),
  };

  return mappedLink;
};

const mapContactPointEventRow = (row: DbContactPointEventRow): ContactPointEvent => {
  const fallbackIsoUtc = new Date().toISOString();

  return {
    id: row.id,
    tenantId: row.tenant_id,
    contactPointId: row.contact_point_id,
    eventType: row.event_type,
    eventSource: row.event_source,
    relatedObjectType: normalizeOptionalString(row.related_object_type),
    relatedObjectId: normalizeOptionalString(row.related_object_id),
    createdAt: toIsoUtc(row.created_at_utc, fallbackIsoUtc),
  };
};

const mapResolverReviewRow = (row: DbResolverReviewRow): ResolverReview => {
  const fallbackIsoUtc = new Date().toISOString();

  return {
    id: row.id,
    tenantId: row.tenant_id,
    orgUnitId: row.org_unit_id,
    reviewType: row.review_type,
    reviewStatus: row.review_status,
    priority: row.priority,
    triggerSourceType: row.trigger_source_type,
    triggerSourceId: row.trigger_source_id,
    conversationId: normalizeOptionalString(row.conversation_id),
    provisionalPersonId: normalizeOptionalString(row.provisional_person_id),
    candidatePersonIds: normalizeStringArray(row.candidate_person_ids),
    contactPointId: normalizeOptionalString(row.contact_point_id),
    confidenceBand: row.confidence_band,
    confidenceReasons: normalizeStringArray(row.confidence_reasons),
    riskFlags: normalizeStringArray(row.risk_flags) as ResolverReview['riskFlags'],
    requestedByUserId: row.requested_by_user_id,
    assignedResolverUserId: normalizeOptionalString(row.assigned_resolver_user_id),
    requestedAt: toIsoUtc(row.requested_at_utc, fallbackIsoUtc),
    startedAt: row.started_at_utc ? toIsoUtc(row.started_at_utc, fallbackIsoUtc) : undefined,
    resolvedAt: row.resolved_at_utc ? toIsoUtc(row.resolved_at_utc, fallbackIsoUtc) : undefined,
    resolutionType: row.resolution_type || undefined,
    resolutionReason: normalizeOptionalString(row.resolution_reason),
    resolutionNotes: normalizeOptionalString(row.resolution_notes),
  };
};

const mapActivityRow = (row: DbActivityRow): Activity => {
  const fallbackIsoUtc = new Date().toISOString();

  return {
    id: row.id,
    tenantId: row.tenant_id,
    orgUnitId: row.org_unit_id,
    personId: row.person_id,
    type: row.type,
    status: row.status,
    createdAtUtc: toIsoUtc(row.created_at_utc, fallbackIsoUtc),
    updatedAtUtc: toIsoUtc(row.updated_at_utc, fallbackIsoUtc),
  };
};

export class KnexPeopleCoreStore implements PeopleCoreStore {
  constructor(private readonly knexClient: Knex = db) {}

  private personColumns(): string[] {
    return [
      'id',
      'tenant_id',
      'org_unit_id',
      'first_name',
      'last_name',
      'preferred_name',
      'status',
      'merged_into_person_id',
      'created_at_utc',
      'updated_at_utc',
    ];
  }

  private householdColumns(): string[] {
    return [
      'id',
      'tenant_id',
      'org_unit_id',
      'name',
      'status',
      'created_at_utc',
      'updated_at_utc',
    ];
  }

  private householdMembershipColumns(): string[] {
    return [
      'id',
      'household_id',
      'person_id',
      'role',
      'is_current',
      'start_at_utc',
      'end_at_utc',
      'created_at_utc',
      'updated_at_utc',
    ];
  }

  private contactPointColumns(): string[] {
    return [
      'id',
      'tenant_id',
      'type',
      'normalized_value',
      'raw_value',
      'status',
      'first_seen_at_utc',
      'last_seen_at_utc',
      'last_inbound_at_utc',
      'last_outbound_at_utc',
      'suspected_shared',
      'confirmed_shared',
      'reassignment_suspected',
      'created_at_utc',
      'updated_at_utc',
    ];
  }

  private contactPointLinkColumns(): string[] {
    return [
      'id',
      'contact_point_id',
      'subject_type',
      'subject_id',
      'link_type',
      'confidence_band',
      'is_current',
      'is_primary',
      'manually_confirmed',
      'confirmation_source',
      'first_linked_at_utc',
      'last_confirmed_at_utc',
      'last_used_at_utc',
      'linked_by',
      'linked_by_user_id',
      'unlink_reason',
      'unlinked_at_utc',
      'merged_into_subject_id',
      'merged_at_utc',
      'merged_by_user_id',
      'merge_class',
      'merge_reason',
      'created_at_utc',
      'updated_at_utc',
    ];
  }

  private contactPointEventColumns(): string[] {
    return [
      'id',
      'tenant_id',
      'contact_point_id',
      'event_type',
      'event_source',
      'related_object_type',
      'related_object_id',
      'created_at_utc',
    ];
  }

  private resolverReviewColumns(): string[] {
    return [
      'id',
      'tenant_id',
      'org_unit_id',
      'review_type',
      'review_status',
      'priority',
      'trigger_source_type',
      'trigger_source_id',
      'conversation_id',
      'provisional_person_id',
      'candidate_person_ids',
      'contact_point_id',
      'confidence_band',
      'confidence_reasons',
      'risk_flags',
      'requested_by_user_id',
      'assigned_resolver_user_id',
      'requested_at_utc',
      'started_at_utc',
      'resolved_at_utc',
      'resolution_type',
      'resolution_reason',
      'resolution_notes',
    ];
  }

  private activityColumns(): string[] {
    return [
      'id',
      'tenant_id',
      'org_unit_id',
      'person_id',
      'type',
      'status',
      'created_at_utc',
      'updated_at_utc',
    ];
  }

  private async assertPersonInTenant(
    tenantId: string,
    personId: string,
    orgUnitId?: string,
  ): Promise<void> {
    const whereClause: Record<string, string> = {
      id: personId,
      tenant_id: tenantId,
    };

    if (orgUnitId) {
      whereClause.org_unit_id = orgUnitId;
    }

    const row = await this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('persons')
      .where(whereClause)
      .first(['id']);

    if (!row) {
      throw new PeopleCoreScopeViolationError(
        orgUnitId
          ? `Person ${personId} is not available in tenant ${tenantId} org unit ${orgUnitId}.`
          : `Person ${personId} is not available in tenant ${tenantId}.`,
      );
    }
  }

  private async assertHouseholdInTenant(tenantId: string, householdId: string): Promise<void> {
    const row = await this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('households')
      .where({
        id: householdId,
        tenant_id: tenantId,
      })
      .first(['id']);

    if (!row) {
      throw new PeopleCoreScopeViolationError(
        `Household ${householdId} is not available in tenant ${tenantId}.`,
      );
    }
  }

  private async assertContactPointInTenant(tenantId: string, contactPointId: string): Promise<void> {
    const row = await this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('contact_points')
      .where({
        id: contactPointId,
        tenant_id: tenantId,
      })
      .first(['id']);

    if (!row) {
      throw new PeopleCoreScopeViolationError(
        `ContactPoint ${contactPointId} is not available in tenant ${tenantId}.`,
      );
    }
  }

  private async getScopedPersonRow(
    knexClient: Knex,
    input: {
      tenantId: string;
      orgUnitId: string;
      personId: string;
    },
  ): Promise<DbPersonRow | null> {
    const row = await knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('persons')
      .where({
        id: input.personId,
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
      })
      .first<DbPersonRow>(this.personColumns());

    return row ?? null;
  }

  private async getScopedContactPointRow(
    knexClient: Knex,
    input: {
      tenantId: string;
      contactPointId: string;
    },
  ): Promise<DbContactPointRow | null> {
    const row = await knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('contact_points')
      .where({
        id: input.contactPointId,
        tenant_id: input.tenantId,
      })
      .first<DbContactPointRow>(this.contactPointColumns());

    return row ?? null;
  }

  private async listScopedContactPointEventRows(
    knexClient: Knex,
    input: {
      tenantId: string;
      contactPointId: string;
    },
  ): Promise<DbContactPointEventRow[]> {
    return knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('contact_point_events')
      .where({
        tenant_id: input.tenantId,
        contact_point_id: input.contactPointId,
      })
      .orderBy('created_at_utc', 'asc')
      .orderBy('id', 'asc')
      .select<DbContactPointEventRow[]>(this.contactPointEventColumns());
  }

  private async listCurrentContactPointLinkRowsForContactPoint(
    knexClient: Knex,
    input: {
      contactPointId: string;
    },
  ): Promise<DbContactPointLinkRow[]> {
    return knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('contact_point_links')
      .where({
        contact_point_id: input.contactPointId,
        is_current: true,
      })
      .orderBy('created_at_utc', 'asc')
      .orderBy('id', 'asc')
      .select<DbContactPointLinkRow[]>(this.contactPointLinkColumns());
  }

  private async updateContactPointStatusWithClient(
    knexClient: Knex,
    input: {
      tenantId: string;
      contactPointId: string;
      newStatus: ContactPointStatus;
    },
  ): Promise<void> {
    const newStatus = assertContactPointStatus(input.newStatus);
    const currentRow = await this.getScopedContactPointRow(knexClient, input);

    if (!currentRow) {
      throw new PeopleCoreScopeViolationError(
        `ContactPoint ${input.contactPointId} is not available in tenant ${input.tenantId}.`,
      );
    }

    if (currentRow.status === newStatus) {
      return;
    }

    const updatedRows = await knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('contact_points')
      .where({
        id: input.contactPointId,
        tenant_id: input.tenantId,
        status: currentRow.status,
      })
      .update({
        status: newStatus,
        updated_at_utc: knexClient.fn.now(),
      });

    if (updatedRows === 0) {
      throw new PeopleCoreConflictError(
        `ContactPoint ${input.contactPointId} status changed concurrently in tenant ${input.tenantId}.`,
      );
    }

    await knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('contact_point_events')
      .insert({
        tenant_id: input.tenantId,
        contact_point_id: input.contactPointId,
        event_type: 'lifecycle_changed',
        event_source: 'peoplecore.lifecycle',
        related_object_type: 'effective_status',
        related_object_id: newStatus,
        created_at_utc: knexClient.fn.now(),
      });
  }

  private async recomputeContactPointStatusWithinTransaction(
    knexClient: Knex,
    input: {
      tenantId: string;
      contactPointId: string;
    },
  ): Promise<void> {
    const currentRow = await this.getScopedContactPointRow(knexClient, input);
    if (!currentRow) {
      throw new PeopleCoreScopeViolationError(
        `ContactPoint ${input.contactPointId} is not available in tenant ${input.tenantId}.`,
      );
    }

    const [eventRows, currentLinkRows] = await Promise.all([
      this.listScopedContactPointEventRows(knexClient, input),
      this.listCurrentContactPointLinkRowsForContactPoint(knexClient, {
        contactPointId: input.contactPointId,
      }),
    ]);
    const computedStatus = computeContactPointStatus(
      eventRows.map(mapContactPointEventRow),
      currentLinkRows.map(mapContactPointLinkRow),
    );

    if (computedStatus !== currentRow.status) {
      await this.updateContactPointStatusWithClient(knexClient, {
        ...input,
        newStatus: computedStatus,
      });
    }
  }

  private async listPersonContactPointLinksForTenant(
    knexClient: Knex,
    input: {
      tenantId: string;
      personId: string;
    },
  ): Promise<DbContactPointLinkRow[]> {
    const linkRows = await knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('contact_point_links')
      .where({
        subject_type: 'person',
        subject_id: input.personId,
      })
      .orderBy('created_at_utc', 'asc')
      .orderBy('id', 'asc')
      .select<DbContactPointLinkRow[]>(this.contactPointLinkColumns());

    if (linkRows.length === 0) {
      return [];
    }

    const scopedContactPointRows = await knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('contact_points')
      .where({
        tenant_id: input.tenantId,
      })
      .whereIn('id', uniqueStrings(linkRows.map((row) => row.contact_point_id)))
      .select<Array<{ id: string }>>(['id']);

    const scopedContactPointIds = new Set(scopedContactPointRows.map((row) => row.id));
    return linkRows.filter((row) => scopedContactPointIds.has(row.contact_point_id));
  }

  private async listCurrentHouseholdMembershipsForTenant(
    knexClient: Knex,
    input: {
      tenantId: string;
      personId: string;
    },
  ): Promise<DbHouseholdMembershipRow[]> {
    const membershipRows = await knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('household_memberships')
      .where({
        person_id: input.personId,
        is_current: true,
      })
      .orderBy('created_at_utc', 'asc')
      .orderBy('id', 'asc')
      .select<DbHouseholdMembershipRow[]>(this.householdMembershipColumns());

    if (membershipRows.length === 0) {
      return [];
    }

    const scopedHouseholdRows = await knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('households')
      .where({
        tenant_id: input.tenantId,
      })
      .whereIn('id', uniqueStrings(membershipRows.map((row) => row.household_id)))
      .select<Array<{ id: string }>>(['id']);

    const scopedHouseholdIds = new Set(scopedHouseholdRows.map((row) => row.id));
    return membershipRows.filter((row) => scopedHouseholdIds.has(row.household_id));
  }

  private hasPrimaryContactConflict(
    provisionalLink: DbContactPointLinkRow,
    canonicalLinks: DbContactPointLinkRow[],
  ): boolean {
    if (!provisionalLink.is_current || !provisionalLink.is_primary) {
      return false;
    }

    return canonicalLinks.some((candidate) => candidate.is_current && candidate.is_primary);
  }

  private hasEquivalentCanonicalLink(
    canonicalLinks: DbContactPointLinkRow[],
    provisionalLink: DbContactPointLinkRow,
  ): boolean {
    return canonicalLinks.some((candidate) =>
      candidate.contact_point_id === provisionalLink.contact_point_id
      && candidate.link_type === provisionalLink.link_type
      && candidate.confidence_band === provisionalLink.confidence_band
      && candidate.is_current === provisionalLink.is_current
      && candidate.is_primary === provisionalLink.is_primary
      && candidate.manually_confirmed === provisionalLink.manually_confirmed
      && candidate.confirmation_source === provisionalLink.confirmation_source
      && candidate.linked_by === provisionalLink.linked_by
      && candidate.linked_by_user_id === provisionalLink.linked_by_user_id
      && candidate.unlink_reason === provisionalLink.unlink_reason
      && normalizeOptionalUtc(candidate.first_linked_at_utc)
        === normalizeOptionalUtc(provisionalLink.first_linked_at_utc)
      && normalizeOptionalUtc(candidate.last_confirmed_at_utc)
        === normalizeOptionalUtc(provisionalLink.last_confirmed_at_utc)
      && normalizeOptionalUtc(candidate.last_used_at_utc)
        === normalizeOptionalUtc(provisionalLink.last_used_at_utc)
      && normalizeOptionalUtc(candidate.unlinked_at_utc)
        === normalizeOptionalUtc(provisionalLink.unlinked_at_utc));
  }

  private async markContactPointLinkMerged(
    knexClient: Knex,
    input: {
      linkId: string;
      canonicalPersonId: string;
      mergedAtUtc: string;
      mergedByUserId: string;
      mergeClass: PeopleCoreMergeClass;
      mergeReason?: string;
    },
  ): Promise<void> {
    await knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('contact_point_links')
      .where({
        id: input.linkId,
      })
      .update({
        is_current: false,
        merged_into_subject_id: input.canonicalPersonId,
        merged_at_utc: input.mergedAtUtc,
        merged_by_user_id: input.mergedByUserId,
        merge_class: input.mergeClass,
        merge_reason: input.mergeReason ?? null,
        updated_at_utc: input.mergedAtUtc,
      });
  }

  private async findExistingMergeReview(
    knexClient: Knex,
    input: {
      tenantId: string;
      orgUnitId: string;
      provisionalPersonId: string;
      canonicalPersonId: string;
    },
  ): Promise<ResolverReview | null> {
    const rows = await knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('resolver_reviews')
      .where({
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        trigger_source_type: 'person_merge',
        trigger_source_id: buildMergeReviewTriggerSourceId(input),
      })
      .orderBy('requested_at_utc', 'asc')
      .orderBy('id', 'asc')
      .select<DbResolverReviewRow[]>(this.resolverReviewColumns());

    const existing = rows
      .map(mapResolverReviewRow)
      .find((review) =>
        review.provisionalPersonId === input.provisionalPersonId
        && review.candidatePersonIds.includes(input.canonicalPersonId)
        && PENDING_RESOLVER_REVIEW_STATUSES.has(review.reviewStatus));

    return existing ?? null;
  }

  private async buildExistingMergeResult(
    knexClient: Knex,
    input: MergePersonInput,
  ): Promise<PeopleCoreMergeResult> {
    const provisionalLinks = await this.listPersonContactPointLinksForTenant(knexClient, {
      tenantId: input.tenantId,
      personId: input.provisionalPersonId,
    });
    const canonicalLinks = await this.listPersonContactPointLinksForTenant(knexClient, {
      tenantId: input.tenantId,
      personId: input.canonicalPersonId,
    });
    const provisionalHouseholds = await this.listCurrentHouseholdMembershipsForTenant(knexClient, {
      tenantId: input.tenantId,
      personId: input.provisionalPersonId,
    });
    const canonicalHouseholds = await this.listCurrentHouseholdMembershipsForTenant(knexClient, {
      tenantId: input.tenantId,
      personId: input.canonicalPersonId,
    });

    const canonicalLinksByContactPointId = new Map<string, DbContactPointLinkRow[]>();
    canonicalLinks.forEach((link) => {
      const existing = canonicalLinksByContactPointId.get(link.contact_point_id) ?? [];
      existing.push(link);
      canonicalLinksByContactPointId.set(link.contact_point_id, existing);
    });

    const autoMergedContactPointLinkIds = provisionalLinks
      .filter((link) => normalizeOptionalString(link.merged_into_subject_id) === input.canonicalPersonId)
      .map((link) => link.id);
    const reviewContactPointLinkIds = provisionalLinks
      .filter((link) => !normalizeOptionalString(link.merged_into_subject_id))
      .filter((link) =>
        this.hasPrimaryContactConflict(
          link,
          canonicalLinksByContactPointId.get(link.contact_point_id) ?? [],
        ))
      .map((link) => link.id);

    const householdAmbiguity = provisionalHouseholds.some((membership) =>
      canonicalHouseholds.some((candidate) => candidate.household_id !== membership.household_id));
    const existingReview = await this.findExistingMergeReview(knexClient, input);

    return {
      mergedProvisionalPersonId: input.provisionalPersonId,
      canonicalPersonId: input.canonicalPersonId,
      autoMergedContactPointLinkIds,
      reviewContactPointLinkIds,
      resolverReviewId: householdAmbiguity || reviewContactPointLinkIds.length > 0
        ? existingReview?.id
        : undefined,
      didPersistMerge: false,
    };
  }

  async createPerson(input: CreatePersonInput): Promise<Person> {
    const [row] = await this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('persons')
      .insert({
        ...(input.personId ? { id: input.personId } : {}),
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        first_name: input.firstName,
        last_name: input.lastName,
        preferred_name: input.preferredName ?? null,
        status: input.status,
        merged_into_person_id: input.mergedIntoPersonId ?? null,
        created_at_utc: this.knexClient.fn.now(),
        updated_at_utc: this.knexClient.fn.now(),
      })
      .returning<DbPersonRow[]>(this.personColumns());

    return mapPersonRow(row);
  }

  async getPerson(input: GetPersonInput): Promise<Person | null> {
    const row = await this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('persons')
      .where({
        id: input.personId,
        tenant_id: input.tenantId,
      })
      .first<DbPersonRow>(this.personColumns());

    return row ? mapPersonRow(row) : null;
  }

  async listPersons(input: ListPersonsInput): Promise<Person[]> {
    const query = this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('persons')
      .where({
        tenant_id: input.tenantId,
      });

    if (input.orgUnitId) {
      query.where({
        org_unit_id: input.orgUnitId,
      });
    }

    const rows = await query
      .orderBy('created_at_utc', 'asc')
      .orderBy('id', 'asc')
      .select<DbPersonRow[]>(this.personColumns());

    return rows.map(mapPersonRow);
  }

  async mergePerson(input: MergePersonInput): Promise<PeopleCoreMergeResult> {
    return this.knexClient.transaction(async (trx) => {
      const provisionalRow = await this.getScopedPersonRow(trx, {
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        personId: input.provisionalPersonId,
      });
      const canonicalRow = await this.getScopedPersonRow(trx, {
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        personId: input.canonicalPersonId,
      });

      if (!provisionalRow || !canonicalRow) {
        throw new PeopleCoreMergeScopeViolationError(
          `PeopleCore merge requires both persons to exist in tenant ${input.tenantId} org unit ${input.orgUnitId}.`,
        );
      }

      if (input.provisionalPersonId === input.canonicalPersonId) {
        throw new PeopleCoreMergeScopeViolationError(
          'PeopleCore merge requires distinct provisional and canonical person ids.',
        );
      }

      if (normalizeOptionalString(provisionalRow.merged_into_person_id)) {
        if (provisionalRow.merged_into_person_id === input.canonicalPersonId) {
          return this.buildExistingMergeResult(trx, input);
        }

        throw new PeopleCorePersonAlreadyMergedError(
          `Person ${input.provisionalPersonId} is already merged into ${provisionalRow.merged_into_person_id}.`,
        );
      }

      if (provisionalRow.status !== 'active_provisional') {
        throw new PeopleCoreMergeScopeViolationError(
          `Person ${input.provisionalPersonId} must be active_provisional before merge.`,
        );
      }

      if (canonicalRow.status !== 'active_confirmed') {
        throw new PeopleCoreMergeScopeViolationError(
          `Person ${input.canonicalPersonId} must be active_confirmed before merge.`,
        );
      }

      const provisionalLinks = await this.listPersonContactPointLinksForTenant(trx, {
        tenantId: input.tenantId,
        personId: input.provisionalPersonId,
      });
      const canonicalLinks = await this.listPersonContactPointLinksForTenant(trx, {
        tenantId: input.tenantId,
        personId: input.canonicalPersonId,
      });
      const provisionalHouseholds = await this.listCurrentHouseholdMembershipsForTenant(trx, {
        tenantId: input.tenantId,
        personId: input.provisionalPersonId,
      });
      const canonicalHouseholds = await this.listCurrentHouseholdMembershipsForTenant(trx, {
        tenantId: input.tenantId,
        personId: input.canonicalPersonId,
      });
      const canonicalLinksByContactPointId = new Map<string, DbContactPointLinkRow[]>();

      canonicalLinks.forEach((link) => {
        const existing = canonicalLinksByContactPointId.get(link.contact_point_id) ?? [];
        existing.push(link);
        canonicalLinksByContactPointId.set(link.contact_point_id, existing);
      });

      const autoMergedContactPointLinkIds: string[] = [];
      const reviewContactPointLinkIds: string[] = [];
      const affectedContactPointIds = new Set<string>();
      const mergedAtUtc = new Date().toISOString();
      const transactionalStore = new KnexPeopleCoreStore(trx as unknown as Knex);

      for (const link of provisionalLinks) {
        const canonicalLinksForContactPoint = canonicalLinksByContactPointId.get(link.contact_point_id) ?? [];
        if (this.hasPrimaryContactConflict(link, canonicalLinksForContactPoint)) {
          reviewContactPointLinkIds.push(link.id);
          continue;
        }

        await this.markContactPointLinkMerged(trx, {
          linkId: link.id,
          canonicalPersonId: input.canonicalPersonId,
          mergedAtUtc,
          mergedByUserId: input.performedByUserId,
          mergeClass: 'auto',
          mergeReason: input.mergeReason,
        });
        autoMergedContactPointLinkIds.push(link.id);
        affectedContactPointIds.add(link.contact_point_id);

        if (this.hasEquivalentCanonicalLink(canonicalLinksForContactPoint, link)) {
          continue;
        }

        const createdLink = await transactionalStore.createContactPointLink({
          tenantId: input.tenantId,
          contactPointId: link.contact_point_id,
          subjectType: 'person',
          subjectId: input.canonicalPersonId,
          linkType: link.link_type,
          confidenceBand: link.confidence_band,
          isCurrent: link.is_current,
          isPrimary: link.is_primary,
          manuallyConfirmed: link.manually_confirmed,
          confirmationSource: link.confirmation_source ?? undefined,
          firstLinkedAt: toIsoUtc(link.first_linked_at_utc, mergedAtUtc),
          lastConfirmedAt: link.last_confirmed_at_utc
            ? toIsoUtc(link.last_confirmed_at_utc, mergedAtUtc)
            : undefined,
          lastUsedAt: link.last_used_at_utc
            ? toIsoUtc(link.last_used_at_utc, mergedAtUtc)
            : undefined,
          linkedBy: link.linked_by,
          linkedByUserId: normalizeOptionalString(link.linked_by_user_id),
          unlinkReason: normalizeOptionalString(link.unlink_reason),
          unlinkedAt: link.unlinked_at_utc ? toIsoUtc(link.unlinked_at_utc, mergedAtUtc) : undefined,
          mergeClass: 'auto',
        });
        const existing = canonicalLinksByContactPointId.get(link.contact_point_id) ?? [];
        existing.push({
          id: createdLink.id,
          contact_point_id: createdLink.contactPointId,
          subject_type: createdLink.subjectType,
          subject_id: createdLink.subjectId,
          link_type: createdLink.linkType,
          confidence_band: createdLink.confidenceBand,
          is_current: createdLink.isCurrent,
          is_primary: createdLink.isPrimary,
          manually_confirmed: createdLink.manuallyConfirmed,
          confirmation_source: createdLink.confirmationSource ?? null,
          first_linked_at_utc: createdLink.firstLinkedAt,
          last_confirmed_at_utc: createdLink.lastConfirmedAt ?? null,
          last_used_at_utc: createdLink.lastUsedAt ?? null,
          linked_by: createdLink.linkedBy,
          linked_by_user_id: createdLink.linkedByUserId ?? null,
          unlink_reason: createdLink.unlinkReason ?? null,
          unlinked_at_utc: createdLink.unlinkedAt ?? null,
          merged_into_subject_id: null,
          merged_at_utc: null,
          merged_by_user_id: null,
          merge_class: 'auto',
          merge_reason: null,
          created_at_utc: createdLink.createdAt,
          updated_at_utc: createdLink.updatedAt,
        });
        canonicalLinksByContactPointId.set(link.contact_point_id, existing);
      }

      const householdAmbiguity = provisionalHouseholds.some((membership) =>
        canonicalHouseholds.some((candidate) => candidate.household_id !== membership.household_id));

      let resolverReviewId: string | undefined;
      if (reviewContactPointLinkIds.length > 0 || householdAmbiguity) {
        const existingReview = await this.findExistingMergeReview(trx, input);
        if (existingReview) {
          resolverReviewId = existingReview.id;
        } else {
          const reasons = reviewContactPointLinkIds.length > 0
            ? ['Manual review required because both people own current primary contact links.']
            : [];
          if (householdAmbiguity) {
            reasons.push('Manual review required because the people have ambiguous current household memberships.');
          }

          const review = await transactionalStore.createResolverReview({
            tenantId: input.tenantId,
            orgUnitId: input.orgUnitId,
            reviewType: 'merge_review',
            reviewStatus: 'pending',
            priority: 'normal',
            triggerSourceType: 'person_merge',
            triggerSourceId: buildMergeReviewTriggerSourceId(input),
            provisionalPersonId: input.provisionalPersonId,
            candidatePersonIds: [input.canonicalPersonId],
            contactPointId: provisionalLinks.find((link) =>
              reviewContactPointLinkIds.includes(link.id))?.contact_point_id,
            confidenceBand: 'medium',
            confidenceReasons: reasons.length > 0
              ? reasons
              : ['Manual review required before finalizing this person merge.'],
            riskFlags: [],
            requestedByUserId: input.performedByUserId,
            requestedAt: mergedAtUtc,
          });
          resolverReviewId = review.id;
        }
      }

      await trx
        .withSchema(PEOPLE_SCHEMA)
        .table('persons')
        .where({
          id: input.provisionalPersonId,
          tenant_id: input.tenantId,
          org_unit_id: input.orgUnitId,
        })
        .update({
          status: 'merged',
          merged_into_person_id: input.canonicalPersonId,
          updated_at_utc: mergedAtUtc,
        });

      for (const contactPointId of affectedContactPointIds) {
        await this.recomputeContactPointStatusWithinTransaction(trx as unknown as Knex, {
          tenantId: input.tenantId,
          contactPointId,
        });
      }

      return {
        mergedProvisionalPersonId: input.provisionalPersonId,
        canonicalPersonId: input.canonicalPersonId,
        autoMergedContactPointLinkIds,
        reviewContactPointLinkIds,
        resolverReviewId,
        didPersistMerge: true,
      };
    });
  }

  async getPersonMergeStatus(input: GetPersonInput): Promise<PersonMergeStatus> {
    const person = await this.getPerson(input);
    if (!person) {
      throw new PeopleCoreScopeViolationError(
        `Person ${input.personId} is not available in tenant ${input.tenantId}.`,
      );
    }

    return normalizePersonMergeStatus(person);
  }

  async createActivity(input: CreateActivityInput): Promise<Activity> {
    await this.assertPersonInTenant(input.tenantId, input.personId, input.orgUnitId);

    const [row] = await this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('activities')
      .insert({
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        person_id: input.personId,
        type: input.type,
        status: input.status ?? 'ACTIVE',
        created_at_utc: this.knexClient.fn.now(),
        updated_at_utc: this.knexClient.fn.now(),
      })
      .returning<DbActivityRow[]>(this.activityColumns());

    return mapActivityRow(row);
  }

  async getActivity(input: GetActivityInput): Promise<Activity | null> {
    const row = await this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('activities')
      .where({
        id: input.activityId,
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
      })
      .first<DbActivityRow>(this.activityColumns());

    return row ? mapActivityRow(row) : null;
  }

  async listActivities(input: ListActivitiesInput): Promise<Activity[]> {
    await this.assertPersonInTenant(input.tenantId, input.personId, input.orgUnitId);

    const rows = await this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('activities')
      .where({
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        person_id: input.personId,
      })
      .orderBy('created_at_utc', 'asc')
      .orderBy('id', 'asc')
      .select<DbActivityRow[]>(this.activityColumns());

    return rows.map(mapActivityRow);
  }

  async createHousehold(input: CreateHouseholdInput): Promise<Household> {
    const [row] = await this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('households')
      .insert({
        ...(input.householdId ? { id: input.householdId } : {}),
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        name: input.name ?? null,
        status: input.status,
        created_at_utc: this.knexClient.fn.now(),
        updated_at_utc: this.knexClient.fn.now(),
      })
      .returning<DbHouseholdRow[]>(this.householdColumns());

    return mapHouseholdRow(row);
  }

  async getHousehold(input: GetHouseholdInput): Promise<Household | null> {
    const row = await this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('households')
      .where({
        id: input.householdId,
        tenant_id: input.tenantId,
      })
      .first<DbHouseholdRow>(this.householdColumns());

    return row ? mapHouseholdRow(row) : null;
  }

  async createHouseholdMembership(input: CreateHouseholdMembershipInput): Promise<HouseholdMembership> {
    await this.assertHouseholdInTenant(input.tenantId, input.householdId);
    await this.assertPersonInTenant(input.tenantId, input.personId);

    const [row] = await this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('household_memberships')
      .insert({
        ...(input.membershipId ? { id: input.membershipId } : {}),
        household_id: input.householdId,
        person_id: input.personId,
        role: input.role,
        is_current: input.isCurrent,
        start_at_utc: input.startAt ?? null,
        end_at_utc: input.endAt ?? null,
        created_at_utc: this.knexClient.fn.now(),
        updated_at_utc: this.knexClient.fn.now(),
      })
      .returning<DbHouseholdMembershipRow[]>(this.householdMembershipColumns());

    return mapHouseholdMembershipRow(row);
  }

  async listHouseholdMemberships(input: ListHouseholdMembershipsInput): Promise<HouseholdMembership[]> {
    const query = this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('household_memberships')
      .join('households', 'households.id', '=', 'household_memberships.household_id')
      .where({
        'households.tenant_id': input.tenantId,
      });

    if (input.householdId) {
      query.where({
        'household_memberships.household_id': input.householdId,
      });
    }

    if (input.personId) {
      query.where({
        'household_memberships.person_id': input.personId,
      });
    }

    if (typeof input.isCurrent === 'boolean') {
      query.where({
        'household_memberships.is_current': input.isCurrent,
      });
    }

    const rows = await query
      .orderBy('household_memberships.created_at_utc', 'asc')
      .orderBy('household_memberships.id', 'asc')
      .select<DbHouseholdMembershipRow[]>(
        this.householdMembershipColumns().map((column) => `household_memberships.${column}`),
      );

    return rows.map(mapHouseholdMembershipRow);
  }

  async createContactPoint(input: CreateContactPointInput): Promise<ContactPoint> {
    const [row] = await this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('contact_points')
      .insert({
        ...(input.contactPointId ? { id: input.contactPointId } : {}),
        tenant_id: input.tenantId,
        type: input.type,
        normalized_value: input.normalizedValue,
        raw_value: input.rawValue ?? null,
        status: input.status,
        first_seen_at_utc: input.firstSeenAt,
        last_seen_at_utc: input.lastSeenAt,
        last_inbound_at_utc: input.lastInboundAt ?? null,
        last_outbound_at_utc: input.lastOutboundAt ?? null,
        suspected_shared: input.suspectedShared,
        confirmed_shared: input.confirmedShared,
        reassignment_suspected: input.reassignmentSuspected,
        created_at_utc: this.knexClient.fn.now(),
        updated_at_utc: this.knexClient.fn.now(),
      })
      .returning<DbContactPointRow[]>(this.contactPointColumns());

    return mapContactPointRow(row);
  }

  async getContactPoint(input: GetContactPointInput): Promise<ContactPoint | null> {
    const row = await this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('contact_points')
      .where({
        id: input.contactPointId,
        tenant_id: input.tenantId,
      })
      .first<DbContactPointRow>(this.contactPointColumns());

    return row ? mapContactPointRow(row) : null;
  }

  async listContactPointsByNormalizedValue(
    input: ListContactPointsByNormalizedValueInput,
  ): Promise<ContactPoint[]> {
    const rows = await this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('contact_points')
      .where({
        tenant_id: input.tenantId,
        type: input.type,
        normalized_value: input.normalizedValue,
      })
      .orderBy('created_at_utc', 'asc')
      .orderBy('id', 'asc')
      .select<DbContactPointRow[]>(this.contactPointColumns());

    return rows.map(mapContactPointRow);
  }

  async createContactPointLink(input: CreateContactPointLinkInput): Promise<ContactPointLink> {
    await this.assertContactPointInTenant(input.tenantId, input.contactPointId);

    const [row] = await this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('contact_point_links')
      .insert({
        ...(input.linkId ? { id: input.linkId } : {}),
        contact_point_id: input.contactPointId,
        subject_type: input.subjectType,
        subject_id: input.subjectId,
        link_type: input.linkType,
        confidence_band: input.confidenceBand,
        is_current: input.isCurrent,
        is_primary: input.isPrimary,
        manually_confirmed: input.manuallyConfirmed,
        confirmation_source: input.confirmationSource ?? null,
        first_linked_at_utc: input.firstLinkedAt,
        last_confirmed_at_utc: input.lastConfirmedAt ?? null,
        last_used_at_utc: input.lastUsedAt ?? null,
        linked_by: input.linkedBy,
        linked_by_user_id: input.linkedByUserId ?? null,
        unlink_reason: input.unlinkReason ?? null,
        unlinked_at_utc: input.unlinkedAt ?? null,
        merged_into_subject_id: input.mergedIntoSubjectId ?? null,
        merged_at_utc: input.mergedAt ?? null,
        merged_by_user_id: input.mergedByUserId ?? null,
        merge_class: input.mergeClass ?? 'auto',
        merge_reason: input.mergeReason ?? null,
        created_at_utc: this.knexClient.fn.now(),
        updated_at_utc: this.knexClient.fn.now(),
      })
      .returning<DbContactPointLinkRow[]>(this.contactPointLinkColumns());

    return mapContactPointLinkRow(row);
  }

  async listCurrentContactPointLinks(
    input: ListCurrentContactPointLinksInput,
  ): Promise<ContactPointLink[]> {
    return this.listContactPointLinks({
      ...input,
      isCurrent: true,
    });
  }

  async listContactPointLinks(input: ListContactPointLinksInput): Promise<ContactPointLink[]> {
    const query = this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('contact_point_links')
      .join('contact_points', 'contact_points.id', '=', 'contact_point_links.contact_point_id')
      .where({
        'contact_points.tenant_id': input.tenantId,
      });

    if (typeof input.isCurrent === 'boolean') {
      query.where({
        'contact_point_links.is_current': input.isCurrent,
      });
    }

    if (input.contactPointId) {
      query.where({
        'contact_point_links.contact_point_id': input.contactPointId,
      });
    }

    if (input.subjectType) {
      query.where({
        'contact_point_links.subject_type': input.subjectType,
      });
    }

    if (input.subjectId) {
      query.where({
        'contact_point_links.subject_id': input.subjectId,
      });
    }

    const rows = await query
      .orderBy('contact_point_links.is_current', 'desc')
      .orderBy('contact_point_links.is_primary', 'desc')
      .orderBy('contact_point_links.created_at_utc', 'asc')
      .orderBy('contact_point_links.id', 'asc')
      .select<DbContactPointLinkRow[]>(
        this.contactPointLinkColumns().map((column) => `contact_point_links.${column}`),
      );

    return rows.map(mapContactPointLinkRow);
  }

  async appendContactPointEvent(input: AppendContactPointEventInput): Promise<ContactPointEvent> {
    await this.assertContactPointInTenant(input.tenantId, input.contactPointId);

    const [row] = await this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('contact_point_events')
      .insert({
        ...(input.eventId ? { id: input.eventId } : {}),
        tenant_id: input.tenantId,
        contact_point_id: input.contactPointId,
        event_type: input.eventType,
        event_source: input.eventSource,
        related_object_type: input.relatedObjectType ?? null,
        related_object_id: input.relatedObjectId ?? null,
        created_at_utc: input.createdAt ?? this.knexClient.fn.now(),
      })
      .returning<DbContactPointEventRow[]>(this.contactPointEventColumns());

    return mapContactPointEventRow(row);
  }

  async updateContactPointStatus(input: {
    tenantId: string;
    contactPointId: string;
    newStatus: ContactPointStatus;
  }): Promise<void> {
    await this.knexClient.transaction(async (trx) => {
      await this.updateContactPointStatusWithClient(trx as unknown as Knex, input);
    });
  }

  async listContactPointEvents(input: ListContactPointEventsInput): Promise<ContactPointEvent[]> {
    const rows = await this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('contact_point_events')
      .where({
        tenant_id: input.tenantId,
        contact_point_id: input.contactPointId,
      })
      .orderBy('created_at_utc', 'asc')
      .orderBy('id', 'asc')
      .limit(normalizeEventLimit(input.limit))
      .select<DbContactPointEventRow[]>(this.contactPointEventColumns());

    return rows.map(mapContactPointEventRow);
  }

  async createResolverReview(input: CreateResolverReviewInput): Promise<ResolverReview> {
    const [row] = await this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('resolver_reviews')
      .insert({
        ...(input.reviewId ? { id: input.reviewId } : {}),
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        review_type: input.reviewType,
        review_status: input.reviewStatus,
        priority: input.priority,
        trigger_source_type: input.triggerSourceType,
        trigger_source_id: input.triggerSourceId,
        conversation_id: input.conversationId ?? null,
        provisional_person_id: input.provisionalPersonId ?? null,
        candidate_person_ids: JSON.stringify(input.candidatePersonIds),
        contact_point_id: input.contactPointId ?? null,
        confidence_band: input.confidenceBand,
        confidence_reasons: JSON.stringify(input.confidenceReasons),
        risk_flags: JSON.stringify(input.riskFlags),
        requested_by_user_id: input.requestedByUserId,
        assigned_resolver_user_id: input.assignedResolverUserId ?? null,
        requested_at_utc: input.requestedAt,
        started_at_utc: input.startedAt ?? null,
        resolved_at_utc: input.resolvedAt ?? null,
        resolution_type: input.resolutionType ?? null,
        resolution_reason: input.resolutionReason ?? null,
        resolution_notes: input.resolutionNotes ?? null,
      })
      .returning<DbResolverReviewRow[]>(this.resolverReviewColumns());

    return mapResolverReviewRow(row);
  }

  async getResolverReview(input: GetResolverReviewInput): Promise<ResolverReview | null> {
    const row = await this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('resolver_reviews')
      .where({
        id: input.reviewId,
        tenant_id: input.tenantId,
      })
      .first<DbResolverReviewRow>(this.resolverReviewColumns());

    return row ? mapResolverReviewRow(row) : null;
  }

  async listResolverReviews(input: ListResolverReviewsInput): Promise<ResolverReview[]> {
    const query = this.knexClient
      .withSchema(PEOPLE_SCHEMA)
      .table('resolver_reviews')
      .where({
        tenant_id: input.tenantId,
      });

    if (input.orgUnitId) {
      query.where({
        org_unit_id: input.orgUnitId,
      });
    }

    const rows = await query
      .orderBy('requested_at_utc', 'asc')
      .orderBy('id', 'asc')
      .select<DbResolverReviewRow[]>(this.resolverReviewColumns());

    return rows.map(mapResolverReviewRow);
  }
}
