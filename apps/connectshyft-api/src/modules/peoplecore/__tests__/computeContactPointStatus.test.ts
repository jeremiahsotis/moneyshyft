import type {
  ContactPointEvent,
  ContactPointLink,
} from '@shyft/contracts';
import { computeContactPointStatus } from '../lifecycle';

const CONTACT_POINT_ID = 'contact-point-1';

const buildEvent = (overrides: Partial<ContactPointEvent> = {}): ContactPointEvent => ({
  id: 'event-1',
  tenantId: 'tenant-1',
  contactPointId: CONTACT_POINT_ID,
  eventType: 'inbound_seen',
  eventSource: 'peoplecore',
  createdAt: '2026-03-24T12:00:00.000Z',
  ...overrides,
});

const buildLink = (overrides: Partial<ContactPointLink> = {}): ContactPointLink => ({
  id: 'link-1',
  contactPointId: CONTACT_POINT_ID,
  subjectType: 'person',
  subjectId: 'person-1',
  linkType: 'primary',
  confidenceBand: 'medium',
  isCurrent: true,
  isPrimary: true,
  manuallyConfirmed: false,
  firstLinkedAt: '2026-03-24T11:00:00.000Z',
  linkedBy: 'system',
  createdAt: '2026-03-24T11:00:00.000Z',
  updatedAt: '2026-03-24T11:00:00.000Z',
  ...overrides,
});

describe('computeContactPointStatus', () => {
  it('treats two current links as active_shared_possible by default', () => {
    const status = computeContactPointStatus([], [
      buildLink({ id: 'link-1', subjectId: 'person-1' }),
      buildLink({ id: 'link-2', subjectId: 'person-2' }),
    ]);

    expect(status).toBe('active_shared_possible');
  });

  it('promotes to active_shared_confirmed when shared_detected is recorded', () => {
    const status = computeContactPointStatus([
      buildEvent({
        eventType: 'shared_detected',
      }),
    ], [
      buildLink({ id: 'link-1', subjectId: 'person-1' }),
      buildLink({ id: 'link-2', subjectId: 'person-2' }),
    ]);

    expect(status).toBe('active_shared_confirmed');
  });

  it('returns active_personal when a previously shared contact point now has one current link', () => {
    const status = computeContactPointStatus([
      buildEvent({
        eventType: 'shared_detected',
      }),
    ], [
      buildLink({ id: 'link-1', subjectId: 'person-1' }),
    ]);

    expect(status).toBe('active_personal');
  });

  it('marks active statuses stale and restores personal on new activity', () => {
    const staleStatus = computeContactPointStatus([
      buildEvent({
        id: 'event-stale',
        eventType: 'stale_detected',
      }),
    ], [
      buildLink(),
    ]);
    const restoredStatus = computeContactPointStatus([
      buildEvent({
        id: 'event-stale',
        eventType: 'stale_detected',
        createdAt: '2026-03-24T12:00:00.000Z',
      }),
      buildEvent({
        id: 'event-inbound',
        eventType: 'inbound_seen',
        createdAt: '2026-03-24T12:05:00.000Z',
      }),
    ], [
      buildLink(),
    ]);

    expect(staleStatus).toBe('stale');
    expect(restoredStatus).toBe('active_personal');
  });

  it('marks reassignment_suspected until a state_changed reset occurs', () => {
    const suspected = computeContactPointStatus([
      buildEvent({
        id: 'event-reassignment',
        eventType: 'reassignment_suspected',
      }),
    ], [
      buildLink(),
    ]);
    const reset = computeContactPointStatus([
      buildEvent({
        id: 'event-reassignment',
        eventType: 'reassignment_suspected',
        createdAt: '2026-03-24T12:00:00.000Z',
      }),
      buildEvent({
        id: 'event-reset',
        eventType: 'state_changed',
        createdAt: '2026-03-24T12:05:00.000Z',
      }),
    ], [
      buildLink(),
    ]);

    expect(suspected).toBe('reassignment_suspected');
    expect(reset).toBe('active_personal');
  });

  it('supports archived via an archiving state_changed marker', () => {
    const status = computeContactPointStatus([
      buildEvent({
        eventType: 'state_changed',
        relatedObjectType: 'archived',
      }),
    ], [
      buildLink(),
    ]);

    expect(status).toBe('archived');
  });
});
