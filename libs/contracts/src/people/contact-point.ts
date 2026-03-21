export type ContactPointType = 'phone' | 'email' | 'other';

export type ContactPointStatus =
  | 'active_personal'
  | 'active_shared_possible'
  | 'active_shared_confirmed'
  | 'stale'
  | 'reassignment_suspected'
  | 'archived';

export type ContactPoint = {
  id: string;
  tenantId: string;
  type: ContactPointType;
  normalizedValue: string;
  rawValue?: string;
  status: ContactPointStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  lastInboundAt?: string;
  lastOutboundAt?: string;
  suspectedShared: boolean;
  confirmedShared: boolean;
  reassignmentSuspected: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContactPointLinkSubjectType = 'person' | 'household';
export type IdentityConfidenceBand =
  | 'very_low'
  | 'low'
  | 'medium'
  | 'high'
  | 'very_high';
export type ContactPointLinkType = 'primary' | 'secondary' | 'historical' | 'unknown';

export type ContactPointLink = {
  id: string;
  contactPointId: string;
  subjectType: ContactPointLinkSubjectType;
  subjectId: string;
  linkType: ContactPointLinkType;
  confidenceBand: IdentityConfidenceBand;
  isCurrent: boolean;
  isPrimary: boolean;
  manuallyConfirmed: boolean;
  confirmationSource?: 'system' | 'user' | 'resolver';
  firstLinkedAt: string;
  lastConfirmedAt?: string;
  lastUsedAt?: string;
  linkedBy: 'system' | 'user' | 'resolver';
  linkedByUserId?: string;
  unlinkReason?: string;
  unlinkedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ContactPointEventType =
  | 'inbound_seen'
  | 'outbound_seen'
  | 'state_changed'
  | 'reassignment_suspected'
  | 'shared_detected'
  | 'stale_detected';

export type ContactPointEvent = {
  id: string;
  tenantId: string;
  contactPointId: string;
  eventType: ContactPointEventType;
  eventSource: string;
  relatedObjectType?: string;
  relatedObjectId?: string;
  createdAt: string;
};
