import {
  CONNECTSHYFT_DESIGN_TOKENS,
  CONNECTSHYFT_READABILITY_CONTRACT,
  CONNECTSHYFT_REQUIRED_CSS_VARIABLES,
  CONNECTSHYFT_RESPONSIVE_BREAKPOINTS,
  CONNECTSHYFT_TOKEN_GROUPS,
} from '@/components/connectshyft/connectShyftTokens';

export type ConnectShyftFeedbackTaxonomy = 'success' | 'refusal' | 'error';

export type ConnectShyftFeedback = {
  taxonomy: ConnectShyftFeedbackTaxonomy;
  message: string;
  announcement: string;
};

export type ConnectShyftCanonicalThreadState = 'UNCLAIMED' | 'CLAIMED' | 'CLOSED';

type ConnectShyftActionContract = {
  label: string;
  ariaLabel: string;
  testId: string;
};

export const CONNECTSHYFT_ACCESSIBILITY_LOCKS = {
  minBodyTextPx: CONNECTSHYFT_READABILITY_CONTRACT.minBodyTextPx,
  minTapTargetPx: CONNECTSHYFT_READABILITY_CONTRACT.minTapTargetPx,
} as const;

export {
  CONNECTSHYFT_DESIGN_TOKENS,
  CONNECTSHYFT_READABILITY_CONTRACT,
  CONNECTSHYFT_REQUIRED_CSS_VARIABLES,
  CONNECTSHYFT_RESPONSIVE_BREAKPOINTS,
  CONNECTSHYFT_TOKEN_GROUPS,
};

export const CONNECTSHYFT_FOCUS_RING_CLASS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2';

export const CONNECTSHYFT_FORBIDDEN_COPY_TOKENS = [
  'rbac',
  'uuid',
  'org_unit',
  'tenant_id',
  'role_id',
  'threadid',
  'thread_id',
  'priorityrank',
  'priority_rank',
  'routingmetadata',
  'routing_metadata',
  'last_inbound_cs_number_id',
  'preferred_outbound_cs_number_id',
  'cs_number_id',
] as const;

const CONNECTSHYFT_CANONICAL_STATE_ACTIONS: Record<
  ConnectShyftCanonicalThreadState,
  readonly string[]
> = {
  UNCLAIMED: ['Call', 'Text', 'Claim'],
  CLAIMED: ['Call', 'Text', 'Close'],
  CLOSED: ['Call', 'Send Message'],
};

export const CONNECTSHYFT_DEFAULT_SMS_OVERRIDE_REASONS = [
  'safety-follow-up',
  'care-plan-exception',
  'documented-consent',
  'critical-service-update',
] as const;

const CONNECTSHYFT_UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const isCanonicalThreadState = (value: unknown): value is ConnectShyftCanonicalThreadState => {
  return value === 'UNCLAIMED' || value === 'CLAIMED' || value === 'CLOSED';
};

const FEEDBACK_PREFIX: Record<ConnectShyftFeedbackTaxonomy, string> = {
  success: 'Success',
  refusal: 'Refusal',
  error: 'Error',
};

const CONNECTSHYFT_THREAD_ACTION_CONTRACTS: Record<string, ConnectShyftActionContract> = {
  Call: {
    label: 'Call',
    ariaLabel: 'Call neighbor',
    testId: 'connectshyft-call-thread-action',
  },
  Text: {
    label: 'Text',
    ariaLabel: 'Send text message',
    testId: 'connectshyft-send-text-thread-action',
  },
  'Send Message': {
    label: 'Send Message',
    ariaLabel: 'Send message',
    testId: 'connectshyft-send-message-thread-action',
  },
  Claim: {
    label: 'Claim',
    ariaLabel: 'Claim thread',
    testId: 'connectshyft-claim-thread-action',
  },
  'Take Over': {
    label: 'Take Over',
    ariaLabel: 'Take over thread ownership',
    testId: 'connectshyft-take-over-thread-action',
  },
  Close: {
    label: 'Close',
    ariaLabel: 'Close thread',
    testId: 'connectshyft-close-thread-action',
  },
};

export const CONNECTSHYFT_INBOX_ACTION_COPY = {
  openConversation: {
    label: 'Open Conversation',
    ariaLabel: 'Open a conversation',
    testId: 'connectshyft-open-conversation-action',
  },
  addNeighbor: {
    label: 'Add Neighbor',
    ariaLabel: 'Add a neighbor',
    testId: 'connectshyft-add-neighbor-action',
  },
  composeMessage: {
    label: 'Send Message',
    ariaLabel: 'Send a message',
    testId: 'connectshyft-compose-message-action',
  },
  makeCall: {
    label: 'Make Call',
    ariaLabel: 'Make a call',
    testId: 'connectshyft-make-call-action',
  },
} as const;

const normalizeMessage = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
};

const containsForbiddenOperatorCopy = (value: string): boolean => {
  const lowered = value.toLowerCase();
  if (CONNECTSHYFT_UUID_PATTERN.test(lowered)) {
    return true;
  }

  return CONNECTSHYFT_FORBIDDEN_COPY_TOKENS.some((token) => lowered.includes(token));
};

export const sanitizeConnectShyftOperatorCopy = (
  rawMessage: unknown,
  fallbackMessage: string,
): string => {
  const fallback = normalizeMessage(fallbackMessage) || 'Unable to complete this request.';
  const normalized = normalizeMessage(rawMessage);
  if (!normalized) {
    return fallback;
  }

  if (containsForbiddenOperatorCopy(normalized)) {
    return fallback;
  }

  return normalized;
};

export const createConnectShyftFeedback = (
  taxonomy: ConnectShyftFeedbackTaxonomy,
  rawMessage: unknown,
  fallbackMessage: string,
): ConnectShyftFeedback => {
  const safeMessage = sanitizeConnectShyftOperatorCopy(rawMessage, fallbackMessage);
  const prefix = FEEDBACK_PREFIX[taxonomy];

  return {
    taxonomy,
    message: `${prefix}: ${safeMessage}`,
    announcement: `${prefix} feedback. ${safeMessage}`,
  };
};

export const resolveConnectShyftThreadActionContract = (
  rawAction: string,
): ConnectShyftActionContract => {
  const action = rawAction.trim();
  const mapped = CONNECTSHYFT_THREAD_ACTION_CONTRACTS[action];
  if (mapped) {
    return mapped;
  }

  const slug = action.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return {
    label: action || 'Action',
    ariaLabel: action || 'Thread action',
    testId: slug
      ? `connectshyft-thread-action-${slug}`
      : 'connectshyft-thread-action-custom',
  };
};

export const resolveCanonicalStateActions = (
  state: unknown,
): readonly string[] => {
  if (!isCanonicalThreadState(state)) {
    return [];
  }

  return CONNECTSHYFT_CANONICAL_STATE_ACTIONS[state];
};

export const resolveSafeVisibleThreadActions = (input: {
  state: unknown;
  rawActions: readonly string[];
}): string[] => {
  const canonicalActions = resolveCanonicalStateActions(input.state);
  if (!canonicalActions.length) {
    return [];
  }

  const normalizedRawActions = input.rawActions
    .map((action) => action.trim())
    .filter((action) => action.length > 0);
  const rawActionSet = new Set(normalizedRawActions);

  if (input.state === 'CLAIMED' && rawActionSet.has('Take Over')) {
    return ['Call', 'Take Over', 'Text', 'Close'];
  }

  return [...canonicalActions];
};
