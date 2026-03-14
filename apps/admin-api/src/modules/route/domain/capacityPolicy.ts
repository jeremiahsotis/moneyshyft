export type DonorCapacityInput = {
  requestedWindowStartUtc: string;
  requestedWindowEndUtc: string;
  itemCount: number;
  forceRefusal: boolean;
};

export type CapacityCommitment = {
  slotStartUtc: string;
  slotEndUtc: string;
};

export type DonorCapacitySlot = {
  slotStartUtc: string;
  slotEndUtc: string;
  remainingCapacity: number;
};

export type CapacityAlternative = {
  type: 'slot' | 'dropoff' | 'contact';
  label: string;
  windowStartUtc?: string;
  windowEndUtc?: string;
};

export type CapacityAccepted = {
  ok: true;
  code: 'MONEYSHYFT_DONOR_INTAKE_SLOTS_AVAILABLE';
  slots: DonorCapacitySlot[];
  nextSteps: string[];
};

export type CapacityRefused = {
  ok: false;
  code: 'MONEYSHYFT_DONOR_INTAKE_REFUSED_CAPACITY';
  refusalReason: string;
  alternatives: CapacityAlternative[];
  nextSteps: string[];
};

export type CapacityOutcome = CapacityAccepted | CapacityRefused;

const SLOT_INTERVAL_MINUTES = 30;
const MAX_CAPACITY_PER_SLOT = 2;
const MAX_RETURNED_SLOTS = 3;

const toDate = (value: string): Date => new Date(value);

const toIso = (value: Date): string => value.toISOString();

const addMinutes = (value: Date, minutes: number): Date =>
  new Date(value.getTime() + minutes * 60_000);

const addDays = (value: Date, days: number): Date =>
  new Date(value.getTime() + days * 24 * 60 * 60_000);

const buildWindowAlternatives = (
  requestedWindowStartUtc: string,
  requestedWindowEndUtc: string,
): CapacityAlternative[] => {
  const start = toDate(requestedWindowStartUtc);
  const end = toDate(requestedWindowEndUtc);
  const durationMs = Math.max(end.getTime() - start.getTime(), SLOT_INTERVAL_MINUTES * 60_000);

  const nextDayStart = addDays(start, 1);
  const nextDayEnd = new Date(nextDayStart.getTime() + durationMs);

  const secondDayStart = addDays(start, 2);
  const secondDayEnd = new Date(secondDayStart.getTime() + durationMs);

  return [
    {
      type: 'slot',
      label: 'Next-day pickup window',
      windowStartUtc: toIso(nextDayStart),
      windowEndUtc: toIso(nextDayEnd),
    },
    {
      type: 'slot',
      label: 'Second-day pickup window',
      windowStartUtc: toIso(secondDayStart),
      windowEndUtc: toIso(secondDayEnd),
    },
    {
      type: 'dropoff',
      label: 'Drop off at nearest partner site',
    },
    {
      type: 'contact',
      label: 'Call dispatch for assisted scheduling',
    },
  ];
};

const overlaps = (
  leftStartUtc: string,
  leftEndUtc: string,
  rightStartUtc: string,
  rightEndUtc: string,
): boolean => {
  const leftStart = toDate(leftStartUtc).getTime();
  const leftEnd = toDate(leftEndUtc).getTime();
  const rightStart = toDate(rightStartUtc).getTime();
  const rightEnd = toDate(rightEndUtc).getTime();
  return leftStart < rightEnd && rightStart < leftEnd;
};

const countCommitmentsForSlot = (
  commitments: CapacityCommitment[],
  slotStartUtc: string,
  slotEndUtc: string,
): number => commitments.filter((commitment) => (
  overlaps(slotStartUtc, slotEndUtc, commitment.slotStartUtc, commitment.slotEndUtc)
)).length;

const buildCandidateSlots = (
  requestedWindowStartUtc: string,
  requestedWindowEndUtc: string,
): Array<{ slotStartUtc: string; slotEndUtc: string }> => {
  const start = toDate(requestedWindowStartUtc);
  const end = toDate(requestedWindowEndUtc);
  const slots: Array<{ slotStartUtc: string; slotEndUtc: string }> = [];

  let cursor = start;
  while (addMinutes(cursor, SLOT_INTERVAL_MINUTES).getTime() <= end.getTime()) {
    const slotStart = cursor;
    const slotEnd = addMinutes(slotStart, SLOT_INTERVAL_MINUTES);
    slots.push({
      slotStartUtc: toIso(slotStart),
      slotEndUtc: toIso(slotEnd),
    });
    cursor = slotEnd;
  }

  return slots;
};

export const evaluateDonorIntakeCapacity = (
  input: DonorCapacityInput,
  existingCommitments: CapacityCommitment[],
): CapacityOutcome => {
  if (input.forceRefusal || input.itemCount > 6) {
    return {
      ok: false,
      code: 'MONEYSHYFT_DONOR_INTAKE_REFUSED_CAPACITY',
      refusalReason: input.forceRefusal
        ? 'Capacity check was explicitly refused by dispatch policy override.'
        : 'Item load exceeds deterministic intake capacity threshold.',
      alternatives: buildWindowAlternatives(input.requestedWindowStartUtc, input.requestedWindowEndUtc),
      nextSteps: [
        'Choose one of the alternative windows.',
        'If timing is urgent, call dispatch for assisted intake.',
      ],
    };
  }

  const availableSlots = buildCandidateSlots(input.requestedWindowStartUtc, input.requestedWindowEndUtc)
    .map((slot) => {
      const used = countCommitmentsForSlot(existingCommitments, slot.slotStartUtc, slot.slotEndUtc);
      const remainingCapacity = Math.max(MAX_CAPACITY_PER_SLOT - used, 0);
      return {
        ...slot,
        remainingCapacity,
      };
    })
    .filter((slot) => slot.remainingCapacity > 0)
    .sort((left, right) => left.slotStartUtc.localeCompare(right.slotStartUtc))
    .slice(0, MAX_RETURNED_SLOTS);

  if (availableSlots.length === 0) {
    return {
      ok: false,
      code: 'MONEYSHYFT_DONOR_INTAKE_REFUSED_CAPACITY',
      refusalReason: 'No pickup capacity remains in the requested window.',
      alternatives: buildWindowAlternatives(input.requestedWindowStartUtc, input.requestedWindowEndUtc),
      nextSteps: [
        'Choose one of the alternative windows.',
        'Try again later for newly opened capacity.',
      ],
    };
  }

  return {
    ok: true,
    code: 'MONEYSHYFT_DONOR_INTAKE_SLOTS_AVAILABLE',
    slots: availableSlots,
    nextSteps: [
      'Pick one of the returned slots to confirm pickup.',
      'Keep donated items accessible for the selected window.',
    ],
  };
};
