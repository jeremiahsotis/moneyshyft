import type { SubjectContext } from './subject-context';

export type EventEnvelope<T = unknown> = {
  id: string;
  type: string;
  source: string;
  tenantId: string;
  orgUnitId: string;
  subject: SubjectContext;
  payload: T;
  createdAt: string;
};

export function validateEventEnvelope(event: EventEnvelope) {
  if (!event.id) throw new Error('Missing id');
  if (!event.type) throw new Error('Missing type');
  if (!event.orgUnitId) throw new Error('Missing orgUnitId');
  if (!event.subject?.orgUnitId) throw new Error('Missing subject.orgUnitId');
}
