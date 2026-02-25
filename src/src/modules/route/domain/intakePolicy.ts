export type RouteIntakeChannel = 'donor' | 'cashier';
export type RouteScheduleMode = 'pickup' | 'delivery';

export type RouteIntakePayload = {
  tenantId: string;
  orgUnitId: string;
  requestedAtUtc: string;
  requestedWindowStartUtc: string;
  requestedWindowEndUtc: string;
  channel: string;
  notes: string;
  forceRefusal: boolean;
  scheduleMode?: string | null;
};

export type NormalizedIntakePayload = {
  tenantId: string;
  orgUnitId: string;
  requestedAtUtc: string;
  requestedWindowStartUtc: string;
  requestedWindowEndUtc: string;
  channel: string;
  notes: string;
  scheduleMode: RouteScheduleMode;
};

export type RouteIntakeRefusal = {
  reasonCode: string;
  message: string;
  alternatives: string[];
  nextSteps: string;
};

export type RouteIntakePolicyDecision =
  | {
    ok: true;
    normalized: NormalizedIntakePayload;
    availableSlots: string[];
  }
  | {
    ok: false;
    refusal: RouteIntakeRefusal;
  };

const normalizeNonEmpty = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const isUtcIso = (value: string): boolean => {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return false;
  }

  return value.endsWith('Z');
};

const parseUtcDate = (value: string): Date | null => {
  if (!isUtcIso(value)) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }

  return parsed;
};

const refusal = (
  reasonCode: string,
  message: string,
  alternatives: string[],
  nextSteps: string,
): RouteIntakePolicyDecision => ({
  ok: false,
  refusal: {
    reasonCode,
    message,
    alternatives,
    nextSteps,
  },
});

const resolveScheduleMode = (value: unknown): RouteScheduleMode => {
  const normalized = normalizeNonEmpty(value).toLowerCase();
  if (normalized === 'pickup') {
    return 'pickup';
  }

  return 'delivery';
};

const buildCapacitySlots = (start: Date): string[] => {
  const first = new Date(start);
  const second = new Date(start);
  second.setUTCHours(second.getUTCHours() + 2);

  return [first.toISOString(), second.toISOString()];
};

const enforceDeliveryInsertionPolicy = (
  requestedWindowStart: Date,
  requestedWindowEnd: Date,
): RouteIntakePolicyDecision | null => {
  const durationMinutes = (requestedWindowEnd.getTime() - requestedWindowStart.getTime()) / (60 * 1000);
  const startHour = requestedWindowStart.getUTCHours();
  const endHour = requestedWindowEnd.getUTCHours();

  const withinInsertionHours = startHour >= 9 && endHour <= 18;
  const withinDurationLimits = durationMinutes >= 60 && durationMinutes <= 180;

  if (withinInsertionHours && withinDurationLimits) {
    return null;
  }

  return refusal(
    'ROUTESHYFT_DELIVERY_INSERTION_CONSTRAINT',
    'Requested delivery window violates pickup-first insertion constraints.',
    [
      'Switch to pickup window between 09:00 and 18:00 UTC',
      'Reduce delivery window duration to 60-180 minutes',
      'Offer next available pickup slot and reattempt scheduling',
    ],
    'Ask the requester to choose one of the offered pickup alternatives.',
  );
};

export const evaluateSharedIntakePolicy = (
  payload: RouteIntakePayload,
): RouteIntakePolicyDecision => {
  const tenantId = normalizeNonEmpty(payload.tenantId);
  if (!tenantId) {
    return refusal(
      'ROUTESHYFT_TENANT_ID_REQUIRED',
      'tenantId is required.',
      ['Confirm active tenant context before retrying intake.'],
      'Reload tenant context and retry submission.',
    );
  }

  const orgUnitId = normalizeNonEmpty(payload.orgUnitId);
  if (!orgUnitId) {
    return refusal(
      'ROUTESHYFT_ORG_UNIT_ID_REQUIRED',
      'orgUnitId is required.',
      ['Select the active org unit before submitting intake.'],
      'Set active org-unit context and retry.',
    );
  }

  const requestedAtUtc = normalizeNonEmpty(payload.requestedAtUtc);
  const requestedWindowStartUtc = normalizeNonEmpty(payload.requestedWindowStartUtc);
  const requestedWindowEndUtc = normalizeNonEmpty(payload.requestedWindowEndUtc);

  const requestedAt = parseUtcDate(requestedAtUtc);
  const requestedWindowStart = parseUtcDate(requestedWindowStartUtc);
  const requestedWindowEnd = parseUtcDate(requestedWindowEndUtc);

  if (!requestedAt || !requestedWindowStart || !requestedWindowEnd) {
    return refusal(
      'ROUTESHYFT_INTAKE_UTC_REQUIRED',
      'requestedAtUtc, requestedWindowStartUtc, and requestedWindowEndUtc must be valid UTC timestamps.',
      ['Submit ISO-8601 timestamps ending in Z (UTC).'],
      'Correct timestamp format and retry.',
    );
  }

  if (requestedWindowEnd.getTime() <= requestedWindowStart.getTime()) {
    return refusal(
      'ROUTESHYFT_INTAKE_WINDOW_INVALID',
      'requestedWindowEndUtc must be after requestedWindowStartUtc.',
      ['Adjust requestedWindowEndUtc to be later than start window.'],
      'Update scheduling window and retry.',
    );
  }

  if (payload.forceRefusal) {
    return refusal(
      'ROUTESHYFT_CAPACITY_UNAVAILABLE',
      'Capacity is unavailable for the requested intake window.',
      [
        'Offer next-day pickup window',
        'Offer nearest open org-unit availability',
        'Convert to waitlist and trigger callback',
      ],
      'Present alternatives to requester and resubmit with selected option.',
    );
  }

  const scheduleMode = resolveScheduleMode(payload.scheduleMode);
  if (scheduleMode === 'delivery') {
    const deliveryPolicyResult = enforceDeliveryInsertionPolicy(requestedWindowStart, requestedWindowEnd);
    if (deliveryPolicyResult) {
      return deliveryPolicyResult;
    }
  }

  return {
    ok: true,
    normalized: {
      tenantId,
      orgUnitId,
      requestedAtUtc: requestedAt.toISOString(),
      requestedWindowStartUtc: requestedWindowStart.toISOString(),
      requestedWindowEndUtc: requestedWindowEnd.toISOString(),
      channel: normalizeNonEmpty(payload.channel),
      notes: normalizeNonEmpty(payload.notes),
      scheduleMode,
    },
    availableSlots: buildCapacitySlots(requestedWindowStart),
  };
};
