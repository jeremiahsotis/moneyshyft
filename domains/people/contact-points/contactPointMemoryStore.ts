import type { ContactPoint, ContactPointLink } from '../../../libs/contracts/src/people'

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
