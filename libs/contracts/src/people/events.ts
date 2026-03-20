import type { EventEnvelope } from '../event-envelope';
import type { ContactPoint } from './contact-point';
import type { Person } from './person';
import type { ResolverReview } from './resolver-review';

export type PersonProvisionalCreatedPayload = Pick<
  Person,
  'id' | 'tenantId' | 'orgUnitId' | 'firstName' | 'lastName' | 'preferredName' | 'status'
> & {
  contactPointId?: string;
};

export type PersonProvisionalCreatedEvent = EventEnvelope<PersonProvisionalCreatedPayload> & {
  type: 'person.provisional_created';
};

export type PersonConfirmedPayload = {
  personId: string;
  tenantId: string;
  orgUnitId: string;
  previousStatus: 'active_provisional' | 'active_confirmed';
  currentStatus: 'active_confirmed';
  confirmedBy: 'system' | 'user' | 'resolver';
  resolverReviewId?: string;
};

export type PersonConfirmedEvent = EventEnvelope<PersonConfirmedPayload> & {
  type: 'person.confirmed';
};

export type ContactPointReassignmentSuspectedPayload = Pick<
  ContactPoint,
  'id' | 'normalizedValue' | 'status' | 'reassignmentSuspected'
> & {
  priorSubjectId?: string;
  nextSubjectId?: string;
  reasons: string[];
};

export type ContactPointReassignmentSuspectedEvent =
  EventEnvelope<ContactPointReassignmentSuspectedPayload> & {
    type: 'contact_point.reassignment_suspected';
  };

export type ResolverReviewCreatedPayload = Pick<
  ResolverReview,
  | 'id'
  | 'tenantId'
  | 'orgUnitId'
  | 'reviewType'
  | 'reviewStatus'
  | 'priority'
  | 'triggerSourceType'
  | 'triggerSourceId'
  | 'candidatePersonIds'
  | 'contactPointId'
  | 'confidenceBand'
  | 'riskFlags'
  | 'requestedAt'
> & {
  provisionalPersonId?: string;
};

export type ResolverReviewCreatedEvent = EventEnvelope<ResolverReviewCreatedPayload> & {
  type: 'resolver_review.created';
};

export type PeopleEvent =
  | PersonProvisionalCreatedEvent
  | PersonConfirmedEvent
  | ContactPointReassignmentSuspectedEvent
  | ResolverReviewCreatedEvent;
