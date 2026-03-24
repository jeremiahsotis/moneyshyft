import type {
  ContactPointLink,
  HouseholdMembership,
} from '@shyft/contracts';
import { assignConfidenceBand } from '../confidenceBand';
import {
  applyStatusPenalty,
  scoreIdentityCandidates,
  type CandidateSubject,
  type ScoreContext,
} from '../identityScoring';

const CONTACT_POINT_ID = 'contact-point-1';

const buildLink = (overrides: Partial<ContactPointLink> = {}): ContactPointLink => ({
  id: 'link-1',
  contactPointId: CONTACT_POINT_ID,
  subjectType: 'person',
  subjectId: 'person-1',
  linkType: 'primary',
  confidenceBand: 'high',
  isCurrent: true,
  isPrimary: true,
  manuallyConfirmed: false,
  firstLinkedAt: '2026-03-23T12:00:00.000Z',
  lastConfirmedAt: '2026-03-23T12:00:00.000Z',
  lastUsedAt: '2026-03-23T12:00:00.000Z',
  linkedBy: 'system',
  createdAt: '2026-03-23T12:00:00.000Z',
  updatedAt: '2026-03-23T12:00:00.000Z',
  ...overrides,
});

const buildScoreContext = (overrides: Partial<ScoreContext> = {}): ScoreContext => ({
  contactPoint: {
    status: 'active_personal',
    confirmedShared: false,
    reassignmentSuspected: false,
  },
  contactPointStatus: 'active_personal',
  currentLinkCount: 1,
  currentLinks: [],
  historicalLinks: [],
  householdMemberships: [] as HouseholdMembership[],
  recentActivity: [],
  recentConfirmation: [],
  asOfUtc: '2026-03-23T12:00:00.000Z',
  ...overrides,
});

describe('identityScoring', () => {
  it('returns the locked status penalties', () => {
    expect(applyStatusPenalty('active_personal')).toBe(0);
    expect(applyStatusPenalty('active_shared_possible')).toBe(-20);
    expect(applyStatusPenalty('active_shared_confirmed')).toBe(-45);
    expect(applyStatusPenalty('stale')).toBe(-25);
    expect(applyStatusPenalty('reassignment_suspected')).toBe(-70);
    expect(applyStatusPenalty('archived')).toBeLessThan(-1_000_000);
  });

  it('subtracts status penalties from candidate scores', () => {
    const candidate: CandidateSubject = {
      subjectType: 'person',
      subjectId: 'person-1',
      generationReason: 'current_person_link',
      directness: 'direct',
      recencyHint: 'current',
      supportingLinkIds: ['link-1'],
    };

    const personal = scoreIdentityCandidates([candidate], buildScoreContext({
      currentLinks: [buildLink()],
      contactPointStatus: 'active_personal',
    }))[0];
    const shared = scoreIdentityCandidates([candidate], buildScoreContext({
      currentLinks: [buildLink()],
      contactPointStatus: 'active_shared_possible',
    }))[0];
    const reassignment = scoreIdentityCandidates([candidate], buildScoreContext({
      currentLinks: [buildLink()],
      contactPointStatus: 'reassignment_suspected',
    }))[0];

    expect(personal.score - shared.score).toBe(20);
    expect(personal.score - reassignment.score).toBe(70);
  });

  it('caps reassignment_suspected candidates at the medium confidence band', () => {
    expect(assignConfidenceBand(140, 'reassignment_suspected', false)).toBe('medium');
  });
});
