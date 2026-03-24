import type {
  ContactPointEvent,
  ContactPointLink,
  ContactPointStatus,
} from '@shyft/contracts';

export const CONTACT_POINT_STATUS_VALUES: ContactPointStatus[] = [
  'active_personal',
  'active_shared_possible',
  'active_shared_confirmed',
  'stale',
  'reassignment_suspected',
  'archived',
];

const ACTIVE_STATUSES = new Set<ContactPointStatus>([
  'active_personal',
  'active_shared_possible',
  'active_shared_confirmed',
]);

const EVENT_PRIORITY: Record<ContactPointEvent['eventType'], number> = {
  inbound_seen: 8,
  outbound_seen: 8,
  state_changed: 7,
  reassignment_suspected: 6,
  shared_detected: 3,
  stale_detected: 5,
  lifecycle_changed: 10,
};

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const eventTimestamp = (event: ContactPointEvent): number => {
  const parsed = Date.parse(event.createdAt);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const compareEvents = (left: ContactPointEvent, right: ContactPointEvent): number => {
  const timestampDiff = eventTimestamp(left) - eventTimestamp(right);
  if (timestampDiff !== 0) {
    return timestampDiff;
  }

  const priorityDiff = EVENT_PRIORITY[left.eventType] - EVENT_PRIORITY[right.eventType];
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  return left.id.localeCompare(right.id);
};

const currentSubjectLinkCount = (links: ContactPointLink[]): number =>
  new Set(
    links
      .filter((link) => link.isCurrent)
      .map((link) => `${link.subjectType}:${link.subjectId}`),
  ).size;

const normalizeActiveStatusForLinks = (
  status: ContactPointStatus,
  linkCount: number,
): ContactPointStatus => {
  if (!ACTIVE_STATUSES.has(status)) {
    return status;
  }

  if (linkCount >= 2) {
    return status === 'active_shared_confirmed'
      ? 'active_shared_confirmed'
      : 'active_shared_possible';
  }

  return 'active_personal';
};

export class InvalidContactPointStatusError extends Error {
  readonly code = 'INVALID_CONTACT_POINT_STATUS';

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'InvalidContactPointStatusError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export const isContactPointStatus = (value: unknown): value is ContactPointStatus =>
  typeof value === 'string'
  && CONTACT_POINT_STATUS_VALUES.includes(value as ContactPointStatus);

export const assertContactPointStatus = (value: unknown): ContactPointStatus => {
  if (!isContactPointStatus(value)) {
    throw new InvalidContactPointStatusError(`Unsupported ContactPoint status: ${String(value)}`);
  }

  return value;
};

export function computeContactPointStatus(
  events: ContactPointEvent[],
  links: ContactPointLink[],
): ContactPointStatus {
  if (!Array.isArray(events)) {
    throw new InvalidContactPointStatusError('computeContactPointStatus requires events to be an array.');
  }
  if (!Array.isArray(links)) {
    throw new InvalidContactPointStatusError('computeContactPointStatus requires links to be an array.');
  }

  const orderedEvents = [...events].sort(compareEvents);
  const linkCount = currentSubjectLinkCount(links);
  let status: ContactPointStatus = normalizeActiveStatusForLinks('active_personal', linkCount);

  orderedEvents.forEach((event) => {
    switch (event.eventType) {
      case 'shared_detected':
        status = linkCount >= 2 ? 'active_shared_confirmed' : 'active_personal';
        break;
      case 'stale_detected':
        if (ACTIVE_STATUSES.has(status)) {
          status = 'stale';
        }
        break;
      case 'reassignment_suspected':
        if (status !== 'archived') {
          status = 'reassignment_suspected';
        }
        break;
      case 'state_changed':
        status = normalizeString(event.relatedObjectType) === 'archive'
          || normalizeString(event.relatedObjectType) === 'archived'
          ? 'archived'
          : 'active_personal';
        break;
      case 'inbound_seen':
      case 'outbound_seen':
        if (status === 'stale') {
          status = 'active_personal';
        }
        break;
      case 'lifecycle_changed':
        break;
      default:
        break;
    }

    status = normalizeActiveStatusForLinks(status, linkCount);
  });

  return assertContactPointStatus(normalizeActiveStatusForLinks(status, linkCount));
}
