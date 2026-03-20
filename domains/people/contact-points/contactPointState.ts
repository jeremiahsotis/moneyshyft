import type { ContactPointStatus } from '../../../libs/contracts/src/people'

const SHARED_CONTACT_STATUSES = new Set<ContactPointStatus>([
  'active_shared_possible',
  'active_shared_confirmed',
])

const STALE_CONTACT_STATUSES = new Set<ContactPointStatus>(['stale'])

const RESOLVER_REVIEW_REQUIRED_STATUSES = new Set<ContactPointStatus>([
  'active_shared_possible',
  'reassignment_suspected',
])

export function isSharedContact(status: ContactPointStatus): boolean {
  return SHARED_CONTACT_STATUSES.has(status)
}

export function isStaleContact(status: ContactPointStatus): boolean {
  return STALE_CONTACT_STATUSES.has(status)
}

export function requiresResolverReview(status: ContactPointStatus): boolean {
  return RESOLVER_REVIEW_REQUIRED_STATUSES.has(status)
}
