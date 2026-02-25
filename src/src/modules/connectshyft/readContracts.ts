export type ConnectShyftInboxBucket = 'inbox' | 'mine';
export type ConnectShyftThreadState = 'UNCLAIMED' | 'CLAIMED' | 'CLOSED';
export type ConnectShyftThreadAction = 'Call' | 'Text' | 'Claim' | 'Close' | 'Send Message';

export type ConnectShyftThreadSummaryRecord = {
  threadId: string;
  tenantId: string;
  orgUnitId: string;
  state: ConnectShyftThreadState;
  bucket: ConnectShyftInboxBucket;
  escalationStage: number;
  isNewUnread: boolean;
  priorityRank: number;
  urgencyLabel: string;
  lastActivityAtUtc: string;
  lastInboundCsNumberId: string;
  last_inbound_cs_number_id: string;
  preferredOutboundCsNumberId: string;
  preferred_outbound_cs_number_id: string;
  preferredOutboundContext: {
    csNumberId: string;
    label: string;
  };
  preferred_outbound_context: {
    cs_number_id: string;
    label: string;
  };
  voicemailIndicator: boolean;
  summary: string;
};

export type ConnectShyftThreadDetailRecord = ConnectShyftThreadSummaryRecord & {
  actions: readonly ConnectShyftThreadAction[];
};

type ConnectShyftThreadSeed = {
  threadId: string;
  state: ConnectShyftThreadState;
  bucket: ConnectShyftInboxBucket;
  escalationStage: number;
  isNewUnread: boolean;
  lastActivityAtUtc: string;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
  preferredOutboundLabel: string;
  voicemailIndicator: boolean;
  summary: string;
};

const CONNECTSHYFT_URGENCY_LABELS = {
  stage0: '',
  stage1: 'Needs attention soon',
  stage2Plus: 'Needs urgent attention',
} as const;

const CONNECTSHYFT_THREAD_ACTIONS: Record<
  ConnectShyftThreadState,
  readonly ConnectShyftThreadAction[]
> = {
  UNCLAIMED: ['Call', 'Text', 'Claim'],
  CLAIMED: ['Call', 'Text', 'Close'],
  CLOSED: ['Call', 'Send Message'],
};

const CONNECTSHYFT_THREAD_SEED_DATA: readonly ConnectShyftThreadSeed[] = [
  {
    threadId: 'thread-c3-claimed-1002',
    state: 'CLAIMED',
    bucket: 'inbox',
    escalationStage: 3,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-24T19:30:00.000Z',
    lastInboundCsNumberId: 'cs-number-101',
    preferredOutboundCsNumberId: 'cs-number-201',
    preferredOutboundLabel: 'Primary East Dispatch',
    voicemailIndicator: false,
    summary: 'Operator follow-up required',
  },
  {
    threadId: 'thread-c3-unclaimed-1001',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    escalationStage: 2,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-24T19:20:00.000Z',
    lastInboundCsNumberId: 'cs-number-102',
    preferredOutboundCsNumberId: 'cs-number-202',
    preferredOutboundLabel: 'Overflow Dispatch',
    voicemailIndicator: false,
    summary: 'Pending escalation review',
  },
  {
    threadId: 'thread-c3-unclaimed-1006',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    escalationStage: 2,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-24T19:20:00.000Z',
    lastInboundCsNumberId: 'cs-number-106',
    preferredOutboundCsNumberId: 'cs-number-206',
    preferredOutboundLabel: 'Overflow Dispatch',
    voicemailIndicator: false,
    summary: 'Secondary triage queue',
  },
  {
    threadId: 'thread-c3-closed-1003',
    state: 'CLOSED',
    bucket: 'inbox',
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-24T19:10:00.000Z',
    lastInboundCsNumberId: 'cs-number-103',
    preferredOutboundCsNumberId: 'cs-number-203',
    preferredOutboundLabel: 'Closed-case follow-up',
    voicemailIndicator: false,
    summary: 'Waiting for outbound follow-up',
  },
  {
    threadId: 'thread-c3-new-unread-1005',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    escalationStage: 0,
    isNewUnread: true,
    lastActivityAtUtc: '2026-02-24T19:00:00.000Z',
    lastInboundCsNumberId: 'cs-number-105',
    preferredOutboundCsNumberId: 'cs-number-205',
    preferredOutboundLabel: 'General Queue',
    voicemailIndicator: false,
    summary: 'New unread message',
  },
  {
    threadId: 'thread-c3-claimed-voicemail-1004',
    state: 'CLAIMED',
    bucket: 'mine',
    escalationStage: 0,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-24T18:50:00.000Z',
    lastInboundCsNumberId: 'cs-number-104',
    preferredOutboundCsNumberId: 'cs-number-204',
    preferredOutboundLabel: 'Assigned Operator Line',
    voicemailIndicator: true,
    summary: 'Voicemail received on claimed thread',
  },
];

export const parseConnectShyftInboxBucket = (
  value: unknown,
): ConnectShyftInboxBucket | null => {
  if (Array.isArray(value)) {
    return value.length > 0 ? parseConnectShyftInboxBucket(value[0]) : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'inbox' || normalized === 'mine') {
    return normalized;
  }

  return null;
};

export const resolveConnectShyftPriorityRank = (input: {
  escalationStage: number;
  isNewUnread: boolean;
}): number => {
  if (input.escalationStage >= 3) {
    return 1;
  }

  if (input.escalationStage === 2) {
    return 2;
  }

  if (input.escalationStage === 1) {
    return 3;
  }

  if (input.isNewUnread) {
    return 4;
  }

  return 5;
};

export const resolveConnectShyftUrgencyLabel = (
  escalationStage: number,
): string => {
  if (escalationStage <= 0) {
    return CONNECTSHYFT_URGENCY_LABELS.stage0;
  }

  if (escalationStage === 1) {
    return CONNECTSHYFT_URGENCY_LABELS.stage1;
  }

  return CONNECTSHYFT_URGENCY_LABELS.stage2Plus;
};

export const resolveConnectShyftThreadActions = (
  state: ConnectShyftThreadState,
): readonly ConnectShyftThreadAction[] => CONNECTSHYFT_THREAD_ACTIONS[state];

export const sortConnectShyftThreadSummaries = (
  items: readonly ConnectShyftThreadSummaryRecord[],
): ConnectShyftThreadSummaryRecord[] => {
  return [...items].sort((a, b) => {
    if (a.priorityRank !== b.priorityRank) {
      return a.priorityRank - b.priorityRank;
    }

    const activityDelta =
      new Date(b.lastActivityAtUtc).getTime() - new Date(a.lastActivityAtUtc).getTime();
    if (activityDelta !== 0) {
      return activityDelta;
    }

    return a.threadId.localeCompare(b.threadId);
  });
};

const toSummaryRecord = (
  seed: ConnectShyftThreadSeed,
  scope: { tenantId: string; orgUnitId: string },
): ConnectShyftThreadSummaryRecord => {
  const priorityRank = resolveConnectShyftPriorityRank({
    escalationStage: seed.escalationStage,
    isNewUnread: seed.isNewUnread,
  });

  const urgencyLabel = resolveConnectShyftUrgencyLabel(seed.escalationStage);
  return {
    threadId: seed.threadId,
    tenantId: scope.tenantId,
    orgUnitId: scope.orgUnitId,
    state: seed.state,
    bucket: seed.bucket,
    escalationStage: seed.escalationStage,
    isNewUnread: seed.isNewUnread,
    priorityRank,
    urgencyLabel,
    lastActivityAtUtc: seed.lastActivityAtUtc,
    lastInboundCsNumberId: seed.lastInboundCsNumberId,
    last_inbound_cs_number_id: seed.lastInboundCsNumberId,
    preferredOutboundCsNumberId: seed.preferredOutboundCsNumberId,
    preferred_outbound_cs_number_id: seed.preferredOutboundCsNumberId,
    preferredOutboundContext: {
      csNumberId: seed.preferredOutboundCsNumberId,
      label: seed.preferredOutboundLabel,
    },
    preferred_outbound_context: {
      cs_number_id: seed.preferredOutboundCsNumberId,
      label: seed.preferredOutboundLabel,
    },
    voicemailIndicator: seed.voicemailIndicator,
    summary: seed.summary,
  };
};

const resolveAllThreadSummaries = (scope: {
  tenantId: string;
  orgUnitId: string;
}): ConnectShyftThreadSummaryRecord[] => {
  return CONNECTSHYFT_THREAD_SEED_DATA.map((seed) => toSummaryRecord(seed, scope));
};

export const resolveConnectShyftInboxContract = (scope: {
  tenantId: string;
  orgUnitId: string;
  bucket: ConnectShyftInboxBucket;
}): ConnectShyftThreadSummaryRecord[] => {
  const filtered = resolveAllThreadSummaries(scope).filter(
    (record) => record.bucket === scope.bucket,
  );
  return sortConnectShyftThreadSummaries(filtered);
};

export const resolveConnectShyftThreadDetailContract = (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
}): ConnectShyftThreadDetailRecord | null => {
  const normalizedThreadId = input.threadId.trim();
  if (!normalizedThreadId) {
    return null;
  }

  const summary = resolveAllThreadSummaries(input).find(
    (candidate) => candidate.threadId === normalizedThreadId,
  );

  if (!summary) {
    return null;
  }

  return {
    ...summary,
    actions: resolveConnectShyftThreadActions(summary.state),
  };
};
