export const ROUTE_DAY_PARTS = ['morning', 'afternoon'] as const;

export type RouteDayPart = typeof ROUTE_DAY_PARTS[number];

export const ROUTE_REFUSAL_REASON_CODES = [
  'CAPACITY_FULL',
  'DAY_PART_NOT_AVAILABLE',
  'BLACKOUT',
  'NOT_ELIGIBLE_ZIP',
  'REQUEST_VALIDATION_FAILED',
  'EXECUTION_WINDOW_MISSED',
  'RESOURCE_UNAVAILABLE',
  'SAFETY_POLICY_BLOCK',
] as const;

export type RouteRefusalReasonCode = typeof ROUTE_REFUSAL_REASON_CODES[number];

export type RouteRefusalStage = 'intake' | 'execution';

export type RouteRescheduleAlternative = {
  type: 'RESCHEDULE_WINDOW';
  dateLocal: string;
  dayPart: RouteDayPart;
  status?: 'open' | 'tight' | 'full';
};

export type RoutePartnerReferralAlternative = {
  type: 'PARTNER_REFERRAL';
  partnerName: string;
  contactPhone?: string;
  contactUrl?: string;
};

export type RouteCallbackPathAlternative = {
  type: 'CALLBACK_PATH';
  queue: string;
  expectedWithinHours: number;
};

export type RouteStructuredAlternative =
  | RouteRescheduleAlternative
  | RoutePartnerReferralAlternative
  | RouteCallbackPathAlternative;

export type RouteRefusalValidationError = {
  field: string;
  message: string;
};

export type RouteRefusalPayload = {
  reasonCode: RouteRefusalReasonCode;
  reasonMessage: string;
  alternatives: RouteStructuredAlternative[];
};

type RouteRefusalPayloadInput = {
  stage: RouteRefusalStage;
  reasonCode: unknown;
  reasonMessage: unknown;
  alternatives: unknown;
};

export type RouteRefusalValidationResult =
  | {
    ok: true;
    value: RouteRefusalPayload;
  }
  | {
    ok: false;
    errors: RouteRefusalValidationError[];
  };

const INTAKE_REASON_CODES = new Set<RouteRefusalReasonCode>([
  'CAPACITY_FULL',
  'DAY_PART_NOT_AVAILABLE',
  'BLACKOUT',
  'NOT_ELIGIBLE_ZIP',
  'REQUEST_VALIDATION_FAILED',
]);

const EXECUTION_REASON_CODES = new Set<RouteRefusalReasonCode>([
  'CAPACITY_FULL',
  'EXECUTION_WINDOW_MISSED',
  'RESOURCE_UNAVAILABLE',
  'SAFETY_POLICY_BLOCK',
]);

const ISO_DATE_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const isRouteDayPart = (value: unknown): value is RouteDayPart => {
  return value === 'morning' || value === 'afternoon';
};

export const isRouteRefusalReasonCode = (value: unknown): value is RouteRefusalReasonCode => {
  return typeof value === 'string' && (ROUTE_REFUSAL_REASON_CODES as readonly string[]).includes(value);
};

const validateReasonCodeForStage = (
  stage: RouteRefusalStage,
  reasonCode: RouteRefusalReasonCode,
): boolean => {
  if (stage === 'intake') {
    return INTAKE_REASON_CODES.has(reasonCode);
  }
  return EXECUTION_REASON_CODES.has(reasonCode);
};

const parseRescheduleAlternative = (
  value: Record<string, unknown>,
  index: number,
  errors: RouteRefusalValidationError[],
): RouteRescheduleAlternative | null => {
  const dateLocal = normalizeString(value.dateLocal);
  const dayPart = value.dayPart;
  const status = normalizeString(value.status);

  if (!ISO_DATE_LOCAL_PATTERN.test(dateLocal)) {
    errors.push({
      field: `alternatives[${index}].dateLocal`,
      message: 'dateLocal must use YYYY-MM-DD format',
    });
  }

  if (!isRouteDayPart(dayPart)) {
    errors.push({
      field: `alternatives[${index}].dayPart`,
      message: 'dayPart must be morning or afternoon',
    });
  }

  if (
    status.length > 0
    && status !== 'open'
    && status !== 'tight'
    && status !== 'full'
  ) {
    errors.push({
      field: `alternatives[${index}].status`,
      message: 'status must be open, tight, or full when provided',
    });
  }

  if (errors.length > 0) {
    return null;
  }

  return {
    type: 'RESCHEDULE_WINDOW',
    dateLocal,
    dayPart: dayPart as RouteDayPart,
    ...(status.length > 0 ? { status: status as 'open' | 'tight' | 'full' } : {}),
  };
};

const parsePartnerReferralAlternative = (
  value: Record<string, unknown>,
  index: number,
  errors: RouteRefusalValidationError[],
): RoutePartnerReferralAlternative | null => {
  const partnerName = normalizeString(value.partnerName);
  const contactPhone = normalizeString(value.contactPhone);
  const contactUrl = normalizeString(value.contactUrl);

  if (!partnerName) {
    errors.push({
      field: `alternatives[${index}].partnerName`,
      message: 'partnerName is required for partner referrals',
    });
  }

  if (!contactPhone && !contactUrl) {
    errors.push({
      field: `alternatives[${index}]`,
      message: 'partner referrals require contactPhone or contactUrl',
    });
  }

  if (errors.length > 0) {
    return null;
  }

  return {
    type: 'PARTNER_REFERRAL',
    partnerName,
    ...(contactPhone ? { contactPhone } : {}),
    ...(contactUrl ? { contactUrl } : {}),
  };
};

const parseCallbackAlternative = (
  value: Record<string, unknown>,
  index: number,
  errors: RouteRefusalValidationError[],
): RouteCallbackPathAlternative | null => {
  const queue = normalizeString(value.queue);
  const expectedWithinHours = value.expectedWithinHours;

  if (!queue) {
    errors.push({
      field: `alternatives[${index}].queue`,
      message: 'queue is required for callback alternatives',
    });
  }

  if (!Number.isInteger(expectedWithinHours) || Number(expectedWithinHours) <= 0) {
    errors.push({
      field: `alternatives[${index}].expectedWithinHours`,
      message: 'expectedWithinHours must be a positive integer',
    });
  }

  if (errors.length > 0) {
    return null;
  }

  return {
    type: 'CALLBACK_PATH',
    queue,
    expectedWithinHours: Number(expectedWithinHours),
  };
};

const parseAlternative = (
  alternative: unknown,
  index: number,
): { value: RouteStructuredAlternative | null; errors: RouteRefusalValidationError[] } => {
  const errors: RouteRefusalValidationError[] = [];

  if (!alternative || typeof alternative !== 'object') {
    errors.push({
      field: `alternatives[${index}]`,
      message: 'Each alternative must be a structured object',
    });
    return { value: null, errors };
  }

  const value = alternative as Record<string, unknown>;
  const type = normalizeString(value.type);

  if (type === 'RESCHEDULE_WINDOW') {
    return { value: parseRescheduleAlternative(value, index, errors), errors };
  }

  if (type === 'PARTNER_REFERRAL') {
    return { value: parsePartnerReferralAlternative(value, index, errors), errors };
  }

  if (type === 'CALLBACK_PATH') {
    return { value: parseCallbackAlternative(value, index, errors), errors };
  }

  errors.push({
    field: `alternatives[${index}].type`,
    message: 'type must be RESCHEDULE_WINDOW, PARTNER_REFERRAL, or CALLBACK_PATH',
  });
  return { value: null, errors };
};

export const validateRouteRefusalPayload = (
  input: RouteRefusalPayloadInput,
): RouteRefusalValidationResult => {
  const errors: RouteRefusalValidationError[] = [];

  if (!isRouteRefusalReasonCode(input.reasonCode)) {
    errors.push({
      field: 'reasonCode',
      message: 'reasonCode must be a canonical Route refusal code',
    });
  }

  const reasonMessage = normalizeString(input.reasonMessage);
  if (!reasonMessage) {
    errors.push({
      field: 'reasonMessage',
      message: 'reasonMessage is required',
    });
  }

  if (!Array.isArray(input.alternatives) || input.alternatives.length === 0) {
    errors.push({
      field: 'alternatives',
      message: 'At least one structured alternative is required',
    });
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  const reasonCode = input.reasonCode as RouteRefusalReasonCode;
  if (!validateReasonCodeForStage(input.stage, reasonCode)) {
    return {
      ok: false,
      errors: [
        {
          field: 'reasonCode',
          message: `reasonCode ${reasonCode} is not valid for ${input.stage} refusal stage`,
        },
      ],
    };
  }

  const alternatives: RouteStructuredAlternative[] = [];
  const structuredAlternatives = input.alternatives as unknown[];
  structuredAlternatives.forEach((alternative: unknown, index: number) => {
    const parsed = parseAlternative(alternative, index);
    errors.push(...parsed.errors);
    if (parsed.value) {
      alternatives.push(parsed.value);
    }
  });

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    value: {
      reasonCode,
      reasonMessage,
      alternatives,
    },
  };
};
