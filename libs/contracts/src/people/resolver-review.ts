import type { IdentityConfidenceBand } from './contact-point';

export const RESOLVER_REVIEW_TYPES = [
  'very_high_duplicate_override',
  'shared_contact_ambiguity',
  'contact_point_reassignment',
  'merge_review',
  'subject_reassignment_review',
  'identity_conflict',
] as const;

export type ResolverReviewType = typeof RESOLVER_REVIEW_TYPES[number];

export const RESOLVER_REVIEW_ACTIVE_STATUSES = [
  'pending',
  'queued',
  'in_review',
  'waiting_for_more_info',
] as const;

export const RESOLVER_REVIEW_RESOLVED_STATUSES = [
  'resolved_confirmed_existing',
  'resolved_confirmed_new',
  'resolved_shared_contact',
  'resolved_reassigned',
  'resolved_merged',
] as const;

export const RESOLVER_REVIEW_TERMINAL_STATUSES = [
  ...RESOLVER_REVIEW_RESOLVED_STATUSES,
  'dismissed',
] as const;

export const RESOLVER_REVIEW_STATUSES = [
  ...RESOLVER_REVIEW_ACTIVE_STATUSES,
  ...RESOLVER_REVIEW_TERMINAL_STATUSES,
] as const;

export type ResolverReviewStatus = typeof RESOLVER_REVIEW_STATUSES[number];
export type ResolverReviewResolvedStatus = typeof RESOLVER_REVIEW_RESOLVED_STATUSES[number];
export type ResolverReviewTerminalStatus = typeof RESOLVER_REVIEW_TERMINAL_STATUSES[number];

export const RESOLVER_ACTION_TYPES = [
  'confirm_existing_person',
  'confirm_new_person',
  'merge_people',
  'link_without_merge',
  'mark_shared_contact',
  'reassign_contact_point',
  'dismiss_no_action',
] as const;

export type ResolverActionType = typeof RESOLVER_ACTION_TYPES[number];
export type ResolverResolutionType = ResolverActionType;

export const RESOLVER_RISK_FLAGS = [
  'shared_contact_possible',
  'shared_contact_confirmed',
  'stale_contact',
  'archived_prior_owner',
  'conflicting_name_dob',
  'rapid_contact_reuse',
  'duplicate_creation_attempt',
  'high_confidence_override_attempt',
] as const;

export type ResolverRiskFlag = typeof RESOLVER_RISK_FLAGS[number];

export type ResolverDecisionStatus = 'resolved' | 'dismissed';

export const RESOLVER_ACTION_STATUS_MAP: Record<
  ResolverActionType,
  ResolverReviewTerminalStatus
> = {
  confirm_existing_person: 'resolved_confirmed_existing',
  confirm_new_person: 'resolved_confirmed_new',
  merge_people: 'resolved_merged',
  link_without_merge: 'resolved_confirmed_existing',
  mark_shared_contact: 'resolved_shared_contact',
  reassign_contact_point: 'resolved_reassigned',
  dismiss_no_action: 'dismissed',
};

export type ResolverDecisionInput = {
  tenantId: string;
  reviewId: string;
  action: ResolverActionType;
  actorUserId: string;
  reason?: string;
  notes?: string;
  personId?: string;
  provisionalPersonId?: string;
  sourcePersonId?: string;
  targetPersonId?: string;
  contactPointId?: string;
  ambiguityEventId?: string;
};

export type ValidatedResolverDecisionInput = {
  tenantId: string;
  reviewId: string;
  action: ResolverActionType;
  actorUserId: string;
  reason?: string;
  notes?: string;
  personId?: string;
  sourcePersonId?: string;
  targetPersonId?: string;
  contactPointId?: string;
  ambiguityEventId?: string;
};

export const isResolverActionType = (value: unknown): value is ResolverActionType =>
  typeof value === 'string'
  && (RESOLVER_ACTION_TYPES as readonly string[]).includes(value);

export const isResolverReviewActiveStatus = (
  value: unknown,
): value is typeof RESOLVER_REVIEW_ACTIVE_STATUSES[number] =>
  typeof value === 'string'
  && (RESOLVER_REVIEW_ACTIVE_STATUSES as readonly string[]).includes(value);

export const isResolverReviewResolvedStatus = (
  value: unknown,
): value is ResolverReviewResolvedStatus =>
  typeof value === 'string'
  && (RESOLVER_REVIEW_RESOLVED_STATUSES as readonly string[]).includes(value);

export const isResolverReviewTerminalStatus = (
  value: unknown,
): value is ResolverReviewTerminalStatus =>
  typeof value === 'string'
  && (RESOLVER_REVIEW_TERMINAL_STATUSES as readonly string[]).includes(value);

export const deriveResolverDecisionStatus = (
  reviewStatus: ResolverReviewStatus,
): ResolverDecisionStatus | null => {
  if (isResolverReviewResolvedStatus(reviewStatus)) {
    return 'resolved';
  }

  if (reviewStatus === 'dismissed') {
    return 'dismissed';
  }

  return null;
};

export type ResolverReview = {
  id: string;
  tenantId: string;
  orgUnitId: string;
  reviewType: ResolverReviewType;
  reviewStatus: ResolverReviewStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  triggerSourceType: string;
  triggerSourceId: string;
  conversationId?: string;
  provisionalPersonId?: string;
  candidatePersonIds: string[];
  contactPointId?: string;
  confidenceBand: IdentityConfidenceBand;
  confidenceReasons: string[];
  riskFlags: ResolverRiskFlag[];
  requestedByUserId: string;
  assignedResolverUserId?: string;
  requestedAt: string;
  startedAt?: string;
  resolvedAt?: string;
  resolutionType?: ResolverResolutionType;
  resolutionReason?: string;
  resolutionNotes?: string;
};
