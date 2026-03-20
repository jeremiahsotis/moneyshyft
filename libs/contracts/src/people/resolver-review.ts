import type { IdentityConfidenceBand } from './contact-point';

export type ResolverReviewType =
  | 'very_high_duplicate_override'
  | 'shared_contact_ambiguity'
  | 'contact_point_reassignment'
  | 'merge_review'
  | 'subject_reassignment_review'
  | 'identity_conflict';

export type ResolverReviewStatus =
  | 'pending'
  | 'queued'
  | 'in_review'
  | 'waiting_for_more_info'
  | 'resolved_confirmed_existing'
  | 'resolved_confirmed_new'
  | 'resolved_shared_contact'
  | 'resolved_reassigned'
  | 'resolved_merged'
  | 'dismissed';

export type ResolverResolutionType =
  | 'confirm_existing_person'
  | 'confirm_new_person'
  | 'mark_shared_contact'
  | 'reassign_contact_point'
  | 'merge_people'
  | 'link_without_merge'
  | 'dismiss_no_action';

export type ResolverRiskFlag =
  | 'shared_contact_possible'
  | 'shared_contact_confirmed'
  | 'stale_contact'
  | 'archived_prior_owner'
  | 'conflicting_name_dob'
  | 'rapid_contact_reuse'
  | 'duplicate_creation_attempt'
  | 'high_confidence_override_attempt';

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
