export type ConnectShyftFeedbackTaxonomy = 'success' | 'refusal' | 'error';

export type ConnectShyftFeedback = {
  taxonomy: ConnectShyftFeedbackTaxonomy;
  message: string;
  announcement: string;
};

type ConnectShyftActionContract = {
  label: string;
  ariaLabel: string;
  testId: string;
};

export const CONNECTSHYFT_ACCESSIBILITY_LOCKS = {
  minBodyTextPx: 16,
  minTapTargetPx: 44,
} as const;

export const CONNECTSHYFT_FOCUS_RING_CLASS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2';

export const CONNECTSHYFT_FORBIDDEN_COPY_TOKENS = [
  'rbac',
  'uuid',
  'org_unit',
  'tenant_id',
  'role_id',
] as const;

const CONNECTSHYFT_UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

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
  claimThread: {
    label: 'Claim Thread',
    ariaLabel: 'Claim a thread',
    testId: 'connectshyft-claim-thread-action',
  },
  takeoverThread: {
    label: 'Take Over Thread',
    ariaLabel: 'Take over a thread',
    testId: 'connectshyft-take-over-thread-action',
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
