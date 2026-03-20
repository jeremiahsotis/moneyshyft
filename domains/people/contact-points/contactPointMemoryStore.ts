import type { IdentityConfidenceBand } from '../identity/confidenceBands'

export type ContactPointType = 'phone' | 'email' | 'other'

export type ContactPointStatus =
  | 'active_personal'
  | 'active_shared_possible'
  | 'active_shared_confirmed'
  | 'stale'
  | 'reassignment_suspected'
  | 'archived'

export type ContactPoint = {
  id: string
  tenantId: string
  type: ContactPointType
  normalizedValue: string
  rawValue?: string
  status: ContactPointStatus
  firstSeenAt: string
  lastSeenAt: string
  lastInboundAt?: string
  lastOutboundAt?: string
  suspectedShared: boolean
  confirmedShared: boolean
  reassignmentSuspected: boolean
  createdAt: string
  updatedAt: string
}

export type ContactPointLinkSubjectType = 'person' | 'household'
export type ContactPointLinkType = 'primary' | 'secondary' | 'historical' | 'unknown'

export type ContactPointLink = {
  id: string
  contactPointId: string
  subjectType: ContactPointLinkSubjectType
  subjectId: string
  linkType: ContactPointLinkType
  confidenceBand: IdentityConfidenceBand
  isCurrent: boolean
  isPrimary: boolean
  manuallyConfirmed: boolean
  confirmationSource?: 'system' | 'user' | 'resolver'
  firstLinkedAt: string
  lastConfirmedAt?: string
  lastUsedAt?: string
  linkedBy: 'system' | 'user' | 'resolver'
  linkedByUserId?: string
  unlinkReason?: string
  unlinkedAt?: string
  createdAt: string
  updatedAt: string
}

export type CreateContactPointInput = Omit<ContactPoint, 'id' | 'createdAt' | 'updatedAt'>

export type CreateContactPointLinkInput = Omit<ContactPointLink, 'id' | 'createdAt' | 'updatedAt'>

const contactPoints: ContactPoint[] = []
const contactPointLinks: ContactPointLink[] = []

let contactPointSequence = 0
let contactPointLinkSequence = 0

const nextTimestamp = (): string => new Date().toISOString()

export function listContactPoints(): ContactPoint[] {
  return contactPoints.map((contactPoint) => ({ ...contactPoint }))
}

export function createContactPoint(input: CreateContactPointInput): ContactPoint {
  const now = nextTimestamp()
  const contactPoint: ContactPoint = {
    ...input,
    id: `cp_${++contactPointSequence}`,
    createdAt: now,
    updatedAt: now,
  }

  contactPoints.push(contactPoint)

  return { ...contactPoint }
}

export function listContactPointLinks(): ContactPointLink[] {
  return contactPointLinks.map((contactPointLink) => ({ ...contactPointLink }))
}

export function createContactPointLink(input: CreateContactPointLinkInput): ContactPointLink {
  const now = nextTimestamp()
  const contactPointLink: ContactPointLink = {
    ...input,
    id: `cpl_${++contactPointLinkSequence}`,
    createdAt: now,
    updatedAt: now,
  }

  contactPointLinks.push(contactPointLink)

  return { ...contactPointLink }
}
