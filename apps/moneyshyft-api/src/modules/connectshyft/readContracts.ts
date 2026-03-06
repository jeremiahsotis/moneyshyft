import type { Knex } from 'knex';

export type ConnectShyftInboxBucket = 'inbox' | 'mine';
export type ConnectShyftThreadState = 'UNCLAIMED' | 'CLAIMED' | 'CLOSED';
export type ConnectShyftThreadAction = 'Call' | 'Text' | 'Claim' | 'Close' | 'Send Message' | 'Take Over';

export type ConnectShyftThreadDisplayRecord = {
  title: string;
  preview: string;
  urgencyLabel: string;
  stateLabel: string;
  inboundContext: string;
  outboundContext: string;
  neighborContext: string;
  conferenceContext: string;
  voicemailLabel: string;
};

export type ConnectShyftThreadSummaryRecord = {
  threadId: string;
  tenantId: string;
  orgUnitId: string;
  state: ConnectShyftThreadState;
  claimedByUserId: string | null;
  claimed_by_user_id: string | null;
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
  voicemailLabel: string | null;
  summary: string;
  display: ConnectShyftThreadDisplayRecord;
};

export type ConnectShyftThreadDetailRecord = ConnectShyftThreadSummaryRecord & {
  actions: readonly ConnectShyftThreadAction[];
  lifecycle: {
    reopenedByInbound: boolean;
  };
};

type ConnectShyftThreadSeed = {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  state: ConnectShyftThreadState;
  bucket: ConnectShyftInboxBucket;
  claimedByUserId: string | null;
  escalationStage: number;
  isNewUnread: boolean;
  lastActivityAtUtc: string;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
  preferredOutboundLabel: string;
  voicemailIndicator: boolean;
  summary: string;
  preview?: string;
};

type ConnectShyftThreadDbRow = {
  thread_id: string;
  tenant_id: string;
  org_unit_id: string;
  state: string;
  claimed_by_user_id?: string | null;
  escalation_stage?: number | string | null;
  is_new_unread?: boolean | number | string | null;
  new_unread?: boolean | number | string | null;
  last_activity_at_utc: string | Date;
  last_inbound_cs_number_id?: string | null;
  preferred_outbound_cs_number_id?: string | null;
  preferred_outbound_label?: string | null;
  outbound_label?: string | null;
  voicemail_waiting?: boolean | number | string | null;
  voicemail_indicator?: boolean | number | string | null;
  unread_voicemail_count?: number | string | null;
  unread_voicemail_count_mine?: number | string | null;
  summary?: string | null;
  preview?: string | null;
  last_message_preview?: string | null;
};

type ConnectShyftDbSelectableColumns = {
  select: string[];
  threadIdColumn: string;
};

const CONNECTSHYFT_URGENCY_LABELS = {
  stage0: '',
  stage1: 'Needs attention soon',
  stage2Plus: 'Needs urgent attention',
} as const;

const CONNECTSHYFT_FORBIDDEN_COPY_TOKENS = [
  'threadid',
  'thread_id',
  'priorityrank',
  'priority_rank',
  'routingmetadata',
  'routing_metadata',
  'tenantid',
  'tenant_id',
  'orgunitid',
  'org_unit_id',
  'last_inbound_cs_number_id',
  'preferred_outbound_cs_number_id',
  'cs_number_id',
] as const;

const CONNECTSHYFT_UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const CONNECTSHYFT_THREAD_ACTIONS: Record<
  ConnectShyftThreadState,
  readonly ConnectShyftThreadAction[]
> = {
  UNCLAIMED: ['Call', 'Text', 'Claim'],
  CLAIMED: ['Call', 'Text', 'Close'],
  CLOSED: ['Call', 'Send Message'],
};

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const CONNECTSHYFT_THREADS_TABLE = 'cs_threads';
let cachedDbSelectableColumns: ConnectShyftDbSelectableColumns | null = null;
let cachedDbSelectableColumnsPromise: Promise<ConnectShyftDbSelectableColumns | null> | null = null;
const CONNECTSHYFT_DEFAULT_SCOPE = {
  tenantId: 'tenant-connectshyft-c3',
  orgUnitId: 'org-connectshyft-c3-east',
} as const;
const CONNECTSHYFT_C4_SCOPE = {
  tenantId: 'tenant-connectshyft-c4',
  orgUnitId: 'org-connectshyft-c4-east',
} as const;
const CONNECTSHYFT_D4_SCOPE = {
  tenantId: 'tenant-connectshyft-d4',
  orgUnitId: 'org-connectshyft-d4-east',
} as const;
const CONNECTSHYFT_UX_R1_SCOPE = {
  tenantId: 'tenant-connectshyft-ux-r1',
  orgUnitId: 'org-connectshyft-ux-r1-east',
} as const;
const CONNECTSHYFT_UX_R3_SCOPE = {
  tenantId: 'tenant-connectshyft-ux-r3',
  orgUnitId: 'org-connectshyft-ux-r3-east',
} as const;
const CONNECTSHYFT_UX_R4_SCOPE = {
  tenantId: 'tenant-connectshyft-ux-r4',
  orgUnitId: 'org-connectshyft-ux-r4-east',
} as const;
const CONNECTSHYFT_G1_SCOPE = {
  tenantId: 'tenant-connectshyft-g1',
  orgUnitId: 'org-connectshyft-g1-east',
} as const;

const CONNECTSHYFT_THREAD_SEED_DATA: readonly ConnectShyftThreadSeed[] = [
  {
    tenantId: CONNECTSHYFT_DEFAULT_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_DEFAULT_SCOPE.orgUnitId,
    threadId: 'thread-c3-claimed-1002',
    state: 'CLAIMED',
    bucket: 'inbox',
    claimedByUserId: 'user-connectshyft-c3-other-operator',
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
    tenantId: CONNECTSHYFT_DEFAULT_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_DEFAULT_SCOPE.orgUnitId,
    threadId: 'thread-c3-unclaimed-1001',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
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
    tenantId: CONNECTSHYFT_DEFAULT_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_DEFAULT_SCOPE.orgUnitId,
    threadId: 'thread-c3-unclaimed-1006',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
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
    tenantId: CONNECTSHYFT_DEFAULT_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_DEFAULT_SCOPE.orgUnitId,
    threadId: 'thread-c3-closed-1003',
    state: 'CLOSED',
    bucket: 'inbox',
    claimedByUserId: null,
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
    tenantId: CONNECTSHYFT_DEFAULT_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_DEFAULT_SCOPE.orgUnitId,
    threadId: 'thread-c3-new-unread-1005',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
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
    tenantId: CONNECTSHYFT_DEFAULT_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_DEFAULT_SCOPE.orgUnitId,
    threadId: 'thread-c3-claimed-voicemail-1004',
    state: 'CLAIMED',
    bucket: 'mine',
    claimedByUserId: 'user-connectshyft-c3-operator',
    escalationStage: 0,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-24T18:50:00.000Z',
    lastInboundCsNumberId: 'cs-number-104',
    preferredOutboundCsNumberId: 'cs-number-204',
    preferredOutboundLabel: 'Assigned Operator Line',
    voicemailIndicator: true,
    summary: 'Voicemail received on claimed thread',
  },
  {
    tenantId: CONNECTSHYFT_G1_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_G1_SCOPE.orgUnitId,
    threadId: 'thread-g1-unclaimed-1001',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 2,
    isNewUnread: false,
    lastActivityAtUtc: '2026-03-05T13:20:00.000Z',
    lastInboundCsNumberId: 'cs-number-g1-401',
    preferredOutboundCsNumberId: 'cs-number-g1-501',
    preferredOutboundLabel: 'G1 Intake Queue',
    voicemailIndicator: false,
    summary: 'Volunteer requested follow-up assistance',
  },
  {
    tenantId: CONNECTSHYFT_G1_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_G1_SCOPE.orgUnitId,
    threadId: 'thread-g1-claimed-1002',
    state: 'CLAIMED',
    bucket: 'inbox',
    claimedByUserId: 'user-connectshyft-g1-other-operator',
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-03-05T13:10:00.000Z',
    lastInboundCsNumberId: 'cs-number-g1-402',
    preferredOutboundCsNumberId: 'cs-number-g1-502',
    preferredOutboundLabel: 'G1 Assigned Queue',
    voicemailIndicator: false,
    summary: 'Claimed conversation ready for handoff review',
  },
  {
    tenantId: CONNECTSHYFT_G1_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_G1_SCOPE.orgUnitId,
    threadId: 'thread-g1-closed-1003',
    state: 'CLOSED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 0,
    isNewUnread: false,
    lastActivityAtUtc: '2026-03-05T13:00:00.000Z',
    lastInboundCsNumberId: 'cs-number-g1-403',
    preferredOutboundCsNumberId: 'cs-number-g1-503',
    preferredOutboundLabel: 'G1 Closed Follow-up',
    voicemailIndicator: false,
    summary: 'Closed conversation with documented resolution',
  },
  {
    tenantId: CONNECTSHYFT_G1_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_G1_SCOPE.orgUnitId,
    threadId: 'thread-g1-voicemail-1004',
    state: 'CLAIMED',
    bucket: 'mine',
    claimedByUserId: 'user-connectshyft-g1-operator',
    escalationStage: 0,
    isNewUnread: false,
    lastActivityAtUtc: '2026-03-05T12:50:00.000Z',
    lastInboundCsNumberId: 'cs-number-g1-404',
    preferredOutboundCsNumberId: 'cs-number-g1-504',
    preferredOutboundLabel: 'G1 Assigned Operator Line',
    voicemailIndicator: true,
    summary: 'Voicemail waiting for operator follow-up',
  },
  {
    tenantId: CONNECTSHYFT_C4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_C4_SCOPE.orgUnitId,
    threadId: 'thread-c4-unclaimed-1001',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 2,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-25T13:20:00.000Z',
    lastInboundCsNumberId: 'cs-number-401',
    preferredOutboundCsNumberId: 'cs-number-501',
    preferredOutboundLabel: 'C4 Intake Queue',
    voicemailIndicator: false,
    summary: 'Unclaimed intake ready for assignment',
  },
  {
    tenantId: CONNECTSHYFT_C4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_C4_SCOPE.orgUnitId,
    threadId: 'thread-c4-claimed-1002',
    state: 'CLAIMED',
    bucket: 'inbox',
    claimedByUserId: 'user-connectshyft-c4-other-operator',
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-25T13:10:00.000Z',
    lastInboundCsNumberId: 'cs-number-402',
    preferredOutboundCsNumberId: 'cs-number-502',
    preferredOutboundLabel: 'C4 Assigned Queue',
    voicemailIndicator: false,
    summary: 'Claimed thread eligible for takeover/close',
  },
  {
    tenantId: CONNECTSHYFT_C4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_C4_SCOPE.orgUnitId,
    threadId: 'thread-c4-closed-1003',
    state: 'CLOSED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-25T13:00:00.000Z',
    lastInboundCsNumberId: 'cs-number-403',
    preferredOutboundCsNumberId: 'cs-number-503',
    preferredOutboundLabel: 'C4 Closed Follow-up',
    voicemailIndicator: false,
    summary: 'Closed thread awaiting explicit outbound reopen',
  },
  {
    tenantId: CONNECTSHYFT_D4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_D4_SCOPE.orgUnitId,
    threadId: 'thread-d4-unclaimed-1001',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 2,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-27T14:20:00.000Z',
    lastInboundCsNumberId: 'cs-number-d4-401',
    preferredOutboundCsNumberId: 'cs-number-d4-501',
    preferredOutboundLabel: 'D4 Intake Queue',
    voicemailIndicator: false,
    summary: 'Unclaimed thread awaiting policy-safe outbound action',
  },
  {
    tenantId: CONNECTSHYFT_D4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_D4_SCOPE.orgUnitId,
    threadId: 'thread-d4-claimed-1002',
    state: 'CLAIMED',
    bucket: 'inbox',
    claimedByUserId: 'user-connectshyft-d4-other-operator',
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-27T14:10:00.000Z',
    lastInboundCsNumberId: 'cs-number-d4-402',
    preferredOutboundCsNumberId: 'cs-number-d4-502',
    preferredOutboundLabel: 'D4 Assigned Queue',
    voicemailIndicator: false,
    summary: 'Claimed thread with explicit close controls',
  },
  {
    tenantId: CONNECTSHYFT_D4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_D4_SCOPE.orgUnitId,
    threadId: 'thread-d4-closed-1003',
    state: 'CLOSED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-27T14:00:00.000Z',
    lastInboundCsNumberId: 'cs-number-d4-403',
    preferredOutboundCsNumberId: 'cs-number-d4-503',
    preferredOutboundLabel: 'D4 Closed Follow-up',
    voicemailIndicator: false,
    summary: 'Closed thread requiring explicit reopen feedback',
  },
  {
    tenantId: CONNECTSHYFT_D4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_D4_SCOPE.orgUnitId,
    threadId: 'thread-d4-closed-prefers-no-1005',
    state: 'CLOSED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 0,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-27T13:55:00.000Z',
    lastInboundCsNumberId: 'cs-number-d4-405',
    preferredOutboundCsNumberId: 'cs-number-d4-505',
    preferredOutboundLabel: 'D4 Closed Preference Guardrail Queue',
    voicemailIndicator: false,
    summary: 'Closed thread with prefers_texting=NO override contract',
  },
  {
    tenantId: CONNECTSHYFT_D4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_D4_SCOPE.orgUnitId,
    threadId: 'thread-d4-unclaimed-prefers-no-1004',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-27T13:50:00.000Z',
    lastInboundCsNumberId: 'cs-number-d4-404',
    preferredOutboundCsNumberId: 'cs-number-d4-504',
    preferredOutboundLabel: 'D4 Preference Guardrail Queue',
    voicemailIndicator: false,
    summary: 'Prefers texting NO requires override path',
  },
  {
    tenantId: CONNECTSHYFT_UX_R1_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R1_SCOPE.orgUnitId,
    threadId: 'thread-ux-r1-unclaimed-1001',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 2,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-25T14:20:00.000Z',
    lastInboundCsNumberId: 'cs-number-ux-r1-401',
    preferredOutboundCsNumberId: 'cs-number-ux-r1-501',
    preferredOutboundLabel: 'Conference East Response',
    voicemailIndicator: false,
    summary: 'Neighbor requested urgent callback',
  },
  {
    tenantId: CONNECTSHYFT_UX_R1_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R1_SCOPE.orgUnitId,
    threadId: 'thread-ux-r1-claimed-1002',
    state: 'CLAIMED',
    bucket: 'inbox',
    claimedByUserId: 'user-connectshyft-ux-r1-other-operator',
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-25T14:10:00.000Z',
    lastInboundCsNumberId: 'cs-number-ux-r1-402',
    preferredOutboundCsNumberId: 'cs-number-ux-r1-502',
    preferredOutboundLabel: 'Conference Follow-up Line',
    voicemailIndicator: false,
    summary: 'Claimed thread with active follow-up',
  },
  {
    tenantId: CONNECTSHYFT_UX_R1_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R1_SCOPE.orgUnitId,
    threadId: 'thread-ux-r1-closed-1003',
    state: 'CLOSED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-25T14:00:00.000Z',
    lastInboundCsNumberId: 'cs-number-ux-r1-403',
    preferredOutboundCsNumberId: 'cs-number-ux-r1-503',
    preferredOutboundLabel: 'Conference Closure Queue',
    voicemailIndicator: false,
    summary: 'Closed thread pending outbound confirmation',
  },
  {
    tenantId: CONNECTSHYFT_UX_R1_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R1_SCOPE.orgUnitId,
    threadId: 'thread-ux-r1-claimed-voicemail-1004',
    state: 'CLAIMED',
    bucket: 'mine',
    claimedByUserId: 'user-connectshyft-ux-r1-operator',
    escalationStage: 0,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-25T13:50:00.000Z',
    lastInboundCsNumberId: 'cs-number-ux-r1-404',
    preferredOutboundCsNumberId: 'cs-number-ux-r1-504',
    preferredOutboundLabel: 'Conference Assigned Operator Line',
    voicemailIndicator: true,
    summary: 'Voicemail retained on claimed operator thread',
  },
  {
    tenantId: CONNECTSHYFT_UX_R3_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R3_SCOPE.orgUnitId,
    threadId: 'thread-ux-r3-unclaimed-voicemail-1001',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 2,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-26T14:20:00.000Z',
    lastInboundCsNumberId: 'cs-number-ux-r3-401',
    preferredOutboundCsNumberId: 'cs-number-ux-r3-501',
    preferredOutboundLabel: 'UX R3 Intake Queue',
    voicemailIndicator: true,
    summary: 'Voicemail received from inbound caller',
  },
  {
    tenantId: CONNECTSHYFT_UX_R3_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R3_SCOPE.orgUnitId,
    threadId: 'thread-ux-r3-claimed-voicemail-1002',
    state: 'CLAIMED',
    bucket: 'mine',
    claimedByUserId: 'user-connectshyft-ux-r3-operator',
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-26T14:10:00.000Z',
    lastInboundCsNumberId: 'cs-number-ux-r3-402',
    preferredOutboundCsNumberId: 'cs-number-ux-r3-502',
    preferredOutboundLabel: 'UX R3 Assigned Operator Line',
    voicemailIndicator: true,
    summary: 'Claimed voicemail remains with assigned owner',
  },
  {
    tenantId: CONNECTSHYFT_UX_R3_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R3_SCOPE.orgUnitId,
    threadId: 'thread-ux-r3-closed-voice-1003',
    state: 'CLOSED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-26T14:00:00.000Z',
    lastInboundCsNumberId: 'cs-number-ux-r3-403',
    preferredOutboundCsNumberId: 'cs-number-ux-r3-503',
    preferredOutboundLabel: 'UX R3 Closed Follow-up Queue',
    voicemailIndicator: false,
    summary: 'Closed thread locked against inbound auto-reopen',
  },
  {
    tenantId: CONNECTSHYFT_UX_R4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R4_SCOPE.orgUnitId,
    threadId: 'thread-ux-r4-unclaimed-1001',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 2,
    isNewUnread: false,
    lastActivityAtUtc: '2026-03-02T14:20:00.000Z',
    lastInboundCsNumberId: 'cs-number-ux-r4-401',
    preferredOutboundCsNumberId: 'cs-number-ux-r4-501',
    preferredOutboundLabel: 'UX R4 Intake Queue',
    voicemailIndicator: false,
    summary: 'Unclaimed thread with explicit outbound guardrail actions',
  },
  {
    tenantId: CONNECTSHYFT_UX_R4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R4_SCOPE.orgUnitId,
    threadId: 'thread-ux-r4-claimed-1002',
    state: 'CLAIMED',
    bucket: 'inbox',
    claimedByUserId: 'user-connectshyft-ux-r4-other-operator',
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-03-02T14:10:00.000Z',
    lastInboundCsNumberId: 'cs-number-ux-r4-402',
    preferredOutboundCsNumberId: 'cs-number-ux-r4-502',
    preferredOutboundLabel: 'UX R4 Assigned Follow-up',
    voicemailIndicator: false,
    summary: 'Claimed thread with deterministic outbound controls',
  },
  {
    tenantId: CONNECTSHYFT_UX_R4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R4_SCOPE.orgUnitId,
    threadId: 'thread-ux-r4-closed-1003',
    state: 'CLOSED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 0,
    isNewUnread: false,
    lastActivityAtUtc: '2026-03-02T14:00:00.000Z',
    lastInboundCsNumberId: 'cs-number-ux-r4-403',
    preferredOutboundCsNumberId: 'cs-number-ux-r4-503',
    preferredOutboundLabel: 'UX R4 Closed Follow-up',
    voicemailIndicator: false,
    summary: 'Closed thread requiring explicit same-thread reopen',
  },
  {
    tenantId: CONNECTSHYFT_UX_R4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R4_SCOPE.orgUnitId,
    threadId: 'thread-ux-r4-unclaimed-prefers-no-1004',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-03-02T13:55:00.000Z',
    lastInboundCsNumberId: 'cs-number-ux-r4-404',
    preferredOutboundCsNumberId: 'cs-number-ux-r4-504',
    preferredOutboundLabel: 'UX R4 Preference Guardrail Queue',
    voicemailIndicator: false,
    summary: 'Prefers texting NO requires explicit override before dispatch',
  },
  {
    tenantId: CONNECTSHYFT_UX_R4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R4_SCOPE.orgUnitId,
    threadId: 'thread-ux-r4-closed-prefers-no-1005',
    state: 'CLOSED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 0,
    isNewUnread: false,
    lastActivityAtUtc: '2026-03-02T13:50:00.000Z',
    lastInboundCsNumberId: 'cs-number-ux-r4-405',
    preferredOutboundCsNumberId: 'cs-number-ux-r4-505',
    preferredOutboundLabel: 'UX R4 Closed Preference Queue',
    voicemailIndicator: false,
    summary: 'Closed prefers_texting NO thread with guarded reopen-and-override flow',
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
  _options: {
    requestedRole?: string | null;
  } = {},
): readonly ConnectShyftThreadAction[] => {
  return CONNECTSHYFT_THREAD_ACTIONS[state];
};

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

const normalizeString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const normalizeOptionalString = (value: unknown): string | null => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
};

const normalizeFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const normalizeBoolean = (value: unknown): boolean => {
  if (value === true) {
    return true;
  }

  if (typeof value === 'number') {
    return value > 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }

  return false;
};

const normalizeUtcTimestamp = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : '1970-01-01T00:00:00.000Z';
};

const normalizeThreadState = (
  value: unknown,
): ConnectShyftThreadState | null => {
  const normalized = normalizeString(value).toUpperCase();
  if (normalized === 'UNCLAIMED' || normalized === 'CLAIMED' || normalized === 'CLOSED') {
    return normalized;
  }

  return null;
};

const containsForbiddenOperatorCopy = (value: string): boolean => {
  const lowered = value.toLowerCase();
  if (CONNECTSHYFT_UUID_PATTERN.test(lowered)) {
    return true;
  }

  if (/\bpriority\s*\d+\b/i.test(lowered)) {
    return true;
  }

  return CONNECTSHYFT_FORBIDDEN_COPY_TOKENS.some((token) => lowered.includes(token));
};

const sanitizeConnectShyftOperatorCopy = (
  rawMessage: unknown,
  fallbackMessage: string,
): string => {
  const fallback = normalizeString(fallbackMessage) || 'Conversation in progress.';
  const normalized = normalizeString(rawMessage);
  if (!normalized) {
    return fallback;
  }

  if (containsForbiddenOperatorCopy(normalized)) {
    return fallback;
  }

  return normalized;
};

const resolveSummaryFallback = (input: {
  state: ConnectShyftThreadState;
  voicemailIndicator: boolean;
}): string => {
  if (input.voicemailIndicator) {
    return input.state === 'UNCLAIMED'
      ? 'Voicemail received and awaiting review.'
      : 'Voicemail waiting for operator follow-up.';
  }

  if (input.state === 'UNCLAIMED') {
    return 'Conversation in progress.';
  }

  if (input.state === 'CLAIMED') {
    return 'Claimed conversation in progress.';
  }

  return 'Closed conversation with documented outcome.';
};

const resolvePreviewFallback = (input: {
  state: ConnectShyftThreadState;
  voicemailIndicator: boolean;
}): string => {
  if (input.voicemailIndicator) {
    return input.state === 'UNCLAIMED'
      ? 'Voicemail was received and is ready for review.'
      : 'Latest voicemail details are ready for review.';
  }

  if (input.state === 'UNCLAIMED') {
    return 'Latest incoming message is ready for review.';
  }

  if (input.state === 'CLAIMED') {
    return 'Continue this claimed conversation.';
  }

  return 'Review the most recent closed-thread update.';
};

const resolveDisplayStateLabel = (state: ConnectShyftThreadState): string => {
  if (state === 'UNCLAIMED') {
    return 'Unclaimed';
  }

  if (state === 'CLAIMED') {
    return 'Claimed';
  }

  return 'Closed';
};

const buildDisplayProjection = (input: {
  summary: string;
  preview: string;
  state: ConnectShyftThreadState;
  urgencyLabel: string;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
  preferredOutboundLabel: string;
  voicemailIndicator: boolean;
  voicemailLabel: string | null;
}): ConnectShyftThreadDisplayRecord => {
  const safeSummary = sanitizeConnectShyftOperatorCopy(
    input.summary,
    resolveSummaryFallback({
      state: input.state,
      voicemailIndicator: input.voicemailIndicator,
    }),
  );
  const previewFallback = resolvePreviewFallback({
    state: input.state,
    voicemailIndicator: input.voicemailIndicator,
  });
  const safePreviewCandidate = sanitizeConnectShyftOperatorCopy(
    input.preview,
    previewFallback,
  );
  const safePreview = safePreviewCandidate === safeSummary
    ? previewFallback
    : safePreviewCandidate;
  const displayUrgencyLabel = sanitizeConnectShyftOperatorCopy(
    input.urgencyLabel,
    input.state === 'UNCLAIMED' ? 'New conversation' : 'Active follow-up',
  );
  const inboundContext = input.lastInboundCsNumberId
    ? 'cs-number inbound line configured'
    : 'Inbound line unavailable';
  const outboundContext = input.preferredOutboundLabel
    ? sanitizeConnectShyftOperatorCopy(
      input.preferredOutboundLabel,
      'cs-number outbound line configured',
    )
    : input.preferredOutboundCsNumberId
      ? 'cs-number outbound line configured'
      : 'Outbound line unavailable';
  const safeVoicemailLabel = input.voicemailIndicator
    ? sanitizeConnectShyftOperatorCopy(
      input.voicemailLabel,
      input.state === 'UNCLAIMED' ? 'Voicemail received' : 'Voicemail waiting for review',
    )
    : '';

  return {
    title: safeSummary,
    preview: safePreview,
    urgencyLabel: displayUrgencyLabel,
    stateLabel: resolveDisplayStateLabel(input.state),
    inboundContext,
    outboundContext,
    neighborContext: `Neighbor context: ${safeSummary}`,
    conferenceContext: `Conference context: ${outboundContext}`,
    voicemailLabel: safeVoicemailLabel,
  };
};

const resolveVoicemailLabel = (input: {
  voicemailIndicator: boolean;
  state: ConnectShyftThreadState;
}): string | null => {
  if (!input.voicemailIndicator) {
    return null;
  }

  if (input.state === 'UNCLAIMED') {
    return 'Voicemail received';
  }

  return 'Voicemail';
};

const hasSeedScope = (scope: {
  tenantId: string;
  orgUnitId: string;
}): boolean => {
  return CONNECTSHYFT_THREAD_SEED_DATA.some((seed) => (
    seed.tenantId === scope.tenantId
    && seed.orgUnitId === scope.orgUnitId
  ));
};

const toSummaryRecord = (
  seed: ConnectShyftThreadSeed,
  bucket: ConnectShyftInboxBucket,
): ConnectShyftThreadSummaryRecord => {
  const priorityRank = resolveConnectShyftPriorityRank({
    escalationStage: seed.escalationStage,
    isNewUnread: seed.isNewUnread,
  });

  const urgencyLabel = resolveConnectShyftUrgencyLabel(seed.escalationStage);
  const rawVoicemailLabel = resolveVoicemailLabel({
    voicemailIndicator: seed.voicemailIndicator,
    state: seed.state,
  });
  const summary = sanitizeConnectShyftOperatorCopy(
    seed.summary,
    resolveSummaryFallback({
      state: seed.state,
      voicemailIndicator: seed.voicemailIndicator,
    }),
  );
  const preview = sanitizeConnectShyftOperatorCopy(
    seed.preview || seed.summary,
    resolvePreviewFallback({
      state: seed.state,
      voicemailIndicator: seed.voicemailIndicator,
    }),
  );
  const voicemailLabel = seed.voicemailIndicator
    ? sanitizeConnectShyftOperatorCopy(rawVoicemailLabel, 'Voicemail waiting for review')
    : null;
  const display = buildDisplayProjection({
    summary,
    preview,
    state: seed.state,
    urgencyLabel,
    lastInboundCsNumberId: seed.lastInboundCsNumberId,
    preferredOutboundCsNumberId: seed.preferredOutboundCsNumberId,
    preferredOutboundLabel: seed.preferredOutboundLabel,
    voicemailIndicator: seed.voicemailIndicator,
    voicemailLabel,
  });

  return {
    threadId: seed.threadId,
    tenantId: seed.tenantId,
    orgUnitId: seed.orgUnitId,
    state: seed.state,
    claimedByUserId: seed.claimedByUserId,
    claimed_by_user_id: seed.claimedByUserId,
    bucket,
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
    voicemailLabel,
    summary,
    display,
  };
};

const resolveSeedPerspectiveBucket = (
  seed: Pick<ConnectShyftThreadSeed, 'state' | 'claimedByUserId'>,
  actorUserId?: string | null,
): ConnectShyftInboxBucket => {
  if (
    seed.state === 'CLAIMED'
    && actorUserId
    && seed.claimedByUserId === actorUserId
  ) {
    return 'mine';
  }

  return 'inbox';
};

const resolveSeedBucketMatch = (
  seed: ConnectShyftThreadSeed,
  bucket: ConnectShyftInboxBucket,
  actorUserId?: string | null,
): boolean => {
  return resolveSeedPerspectiveBucket(seed, actorUserId) === bucket;
};

const resolveAllSeedThreadSummaries = (scope: {
  tenantId: string;
  orgUnitId: string;
  bucket: ConnectShyftInboxBucket;
  actorUserId?: string | null;
}): ConnectShyftThreadSummaryRecord[] => {
  return CONNECTSHYFT_THREAD_SEED_DATA
    .filter((seed) =>
      seed.tenantId === scope.tenantId
      && seed.orgUnitId === scope.orgUnitId
      && resolveSeedBucketMatch(seed, scope.bucket, scope.actorUserId))
    .map((seed) => toSummaryRecord(seed, resolveSeedPerspectiveBucket(seed, scope.actorUserId)));
};

export const resolveConnectShyftInboxContract = (scope: {
  tenantId: string;
  orgUnitId: string;
  bucket: ConnectShyftInboxBucket;
  actorUserId?: string | null;
}): ConnectShyftThreadSummaryRecord[] => {
  const items = resolveAllSeedThreadSummaries(scope);
  return sortConnectShyftThreadSummaries(items);
};

export const resolveConnectShyftThreadDetailContract = (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  actorUserId?: string | null;
  requestedRole?: string | null;
}): ConnectShyftThreadDetailRecord | null => {
  const normalizedThreadId = input.threadId.trim();
  if (!normalizedThreadId) {
    return null;
  }

  const matchedSeed = CONNECTSHYFT_THREAD_SEED_DATA.find((seed) => (
    seed.tenantId === input.tenantId
    && seed.orgUnitId === input.orgUnitId
    && seed.threadId === normalizedThreadId
  ));

  if (!matchedSeed) {
    return null;
  }

  const summary = toSummaryRecord(
    matchedSeed,
    resolveSeedPerspectiveBucket(matchedSeed, input.actorUserId),
  );

  return {
    ...summary,
    actions: resolveConnectShyftThreadActions(summary.state, {
      requestedRole: input.requestedRole,
    }),
    lifecycle: {
      reopenedByInbound: false,
    },
  };
};

const resolveThreadColumnInfo = async (
  db: Knex,
): Promise<Record<string, Knex.ColumnInfo> | null> => {
  try {
    return await db
      .withSchema(CONNECTSHYFT_SCHEMA)
      .table(CONNECTSHYFT_THREADS_TABLE)
      .columnInfo();
  } catch (_error) {
    return null;
  }
};

const hasColumn = (
  columnInfo: Record<string, Knex.ColumnInfo>,
  columnName: string,
): boolean => Object.prototype.hasOwnProperty.call(columnInfo, columnName);

const resolveExistingColumn = (
  columnInfo: Record<string, Knex.ColumnInfo>,
  candidateColumns: readonly string[],
): string | null => {
  const matched = candidateColumns.find((candidate) => hasColumn(columnInfo, candidate));
  return matched || null;
};

const resolveDbSelectableColumns = (
  columnInfo: Record<string, Knex.ColumnInfo>,
): ConnectShyftDbSelectableColumns | null => {
  const threadIdColumn = resolveExistingColumn(columnInfo, ['id', 'thread_id']);
  const lastActivityColumn = resolveExistingColumn(columnInfo, [
    'last_activity_at_utc',
    'last_activity_at',
    'updated_at_utc',
    'updated_at',
    'created_at_utc',
    'created_at',
  ]);

  if (
    !threadIdColumn
    || !lastActivityColumn
    || !hasColumn(columnInfo, 'tenant_id')
    || !hasColumn(columnInfo, 'org_unit_id')
    || !hasColumn(columnInfo, 'state')
  ) {
    return null;
  }

  const selectedColumns: string[] = [
    `${threadIdColumn} as thread_id`,
    'tenant_id',
    'org_unit_id',
    'state',
    `${lastActivityColumn} as last_activity_at_utc`,
  ];

  const optionalColumns = [
    'claimed_by_user_id',
    'escalation_stage',
    'is_new_unread',
    'new_unread',
    'last_inbound_cs_number_id',
    'preferred_outbound_cs_number_id',
    'preferred_outbound_label',
    'outbound_label',
    'voicemail_waiting',
    'voicemail_indicator',
    'unread_voicemail_count',
    'unread_voicemail_count_mine',
    'summary',
    'preview',
    'last_message_preview',
  ];

  optionalColumns.forEach((optionalColumn) => {
    if (hasColumn(columnInfo, optionalColumn)) {
      selectedColumns.push(optionalColumn);
    }
  });

  return {
    select: selectedColumns,
    threadIdColumn,
  };
};

const resolveCachedDbSelectableColumns = async (
  db: Knex,
): Promise<ConnectShyftDbSelectableColumns | null> => {
  if (cachedDbSelectableColumns) {
    return cachedDbSelectableColumns;
  }

  if (cachedDbSelectableColumnsPromise) {
    return cachedDbSelectableColumnsPromise;
  }

  cachedDbSelectableColumnsPromise = (async () => {
    const columnInfo = await resolveThreadColumnInfo(db);
    if (!columnInfo) {
      return null;
    }

    const selectableColumns = resolveDbSelectableColumns(columnInfo);
    if (selectableColumns) {
      cachedDbSelectableColumns = selectableColumns;
    }

    return selectableColumns;
  })();

  try {
    return await cachedDbSelectableColumnsPromise;
  } finally {
    cachedDbSelectableColumnsPromise = null;
  }
};

const resolveDbThreadRows = async (
  db: Knex,
  scope: {
    tenantId: string;
    orgUnitId: string;
    threadId?: string | null;
  },
): Promise<ConnectShyftThreadDbRow[] | null> => {
  const selectableColumns = await resolveCachedDbSelectableColumns(db);
  if (!selectableColumns) {
    return null;
  }

  try {
    const query = db
      .withSchema(CONNECTSHYFT_SCHEMA)
      .table(CONNECTSHYFT_THREADS_TABLE)
      .where('tenant_id', scope.tenantId)
      .andWhere('org_unit_id', scope.orgUnitId);

    if (scope.threadId) {
      query.andWhere(selectableColumns.threadIdColumn, scope.threadId);
    }

    const rows = await query
      .select(selectableColumns.select);

    return rows as ConnectShyftThreadDbRow[];
  } catch (_error) {
    return null;
  }
};

const mapDbRowToSummary = (
  row: ConnectShyftThreadDbRow,
  bucket: ConnectShyftInboxBucket,
): ConnectShyftThreadSummaryRecord | null => {
  const state = normalizeThreadState(row.state);
  if (!state) {
    return null;
  }

  const threadId = normalizeString(row.thread_id);
  const tenantId = normalizeString(row.tenant_id);
  const orgUnitId = normalizeString(row.org_unit_id);
  if (!threadId || !tenantId || !orgUnitId) {
    return null;
  }

  const escalationStage = normalizeFiniteNumber(row.escalation_stage, 0);
  const isNewUnread = normalizeBoolean(row.is_new_unread ?? row.new_unread);
  const priorityRank = resolveConnectShyftPriorityRank({
    escalationStage,
    isNewUnread,
  });

  const preferredOutboundCsNumberId = normalizeString(
    row.preferred_outbound_cs_number_id,
  );
  const preferredOutboundLabel = normalizeString(
    row.preferred_outbound_label ?? row.outbound_label,
  );
  const unreadVoicemailCount = normalizeFiniteNumber(row.unread_voicemail_count, 0);
  const unreadVoicemailCountMine = normalizeFiniteNumber(row.unread_voicemail_count_mine, 0);

  const voicemailIndicator = normalizeBoolean(row.voicemail_indicator)
    || normalizeBoolean(row.voicemail_waiting)
    || unreadVoicemailCount > 0
    || unreadVoicemailCountMine > 0;
  const rawVoicemailLabel = resolveVoicemailLabel({
    voicemailIndicator,
    state,
  });
  const urgencyLabel = resolveConnectShyftUrgencyLabel(escalationStage);
  const rawSummary = normalizeString(row.summary);
  const rawPreview = normalizeString(row.preview ?? row.last_message_preview);
  const summary = sanitizeConnectShyftOperatorCopy(
    rawSummary || rawPreview,
    resolveSummaryFallback({
      state,
      voicemailIndicator,
    }),
  );
  const preview = sanitizeConnectShyftOperatorCopy(
    rawPreview || rawSummary,
    resolvePreviewFallback({
      state,
      voicemailIndicator,
    }),
  );
  const voicemailLabel = voicemailIndicator
    ? sanitizeConnectShyftOperatorCopy(rawVoicemailLabel, 'Voicemail waiting for review')
    : null;
  const display = buildDisplayProjection({
    summary,
    preview,
    state,
    urgencyLabel,
    lastInboundCsNumberId: normalizeString(row.last_inbound_cs_number_id),
    preferredOutboundCsNumberId,
    preferredOutboundLabel,
    voicemailIndicator,
    voicemailLabel,
  });

  return {
    threadId,
    tenantId,
    orgUnitId,
    state,
    claimedByUserId: normalizeOptionalString(row.claimed_by_user_id),
    claimed_by_user_id: normalizeOptionalString(row.claimed_by_user_id),
    bucket,
    escalationStage,
    isNewUnread,
    priorityRank,
    urgencyLabel,
    lastActivityAtUtc: normalizeUtcTimestamp(row.last_activity_at_utc),
    lastInboundCsNumberId: normalizeString(row.last_inbound_cs_number_id),
    last_inbound_cs_number_id: normalizeString(row.last_inbound_cs_number_id),
    preferredOutboundCsNumberId,
    preferred_outbound_cs_number_id: preferredOutboundCsNumberId,
    preferredOutboundContext: {
      csNumberId: preferredOutboundCsNumberId,
      label: preferredOutboundLabel,
    },
    preferred_outbound_context: {
      cs_number_id: preferredOutboundCsNumberId,
      label: preferredOutboundLabel,
    },
    voicemailIndicator,
    voicemailLabel,
    summary,
    display,
  };
};

const filterRowsForBucket = (
  rows: readonly ConnectShyftThreadDbRow[],
  scope: {
    bucket: ConnectShyftInboxBucket;
    actorUserId?: string | null;
  },
): ConnectShyftThreadDbRow[] => {
  return rows.filter((row) => {
    const state = normalizeThreadState(row.state);
    if (!state) {
      return false;
    }

    const claimedByUserId = normalizeOptionalString(row.claimed_by_user_id);

    if (scope.bucket === 'mine') {
      if (state !== 'CLAIMED') {
        return false;
      }

      if (scope.actorUserId) {
        return claimedByUserId === scope.actorUserId;
      }

      return true;
    }

    if (scope.actorUserId && state === 'CLAIMED' && claimedByUserId === scope.actorUserId) {
      return false;
    }

    return true;
  });
};

export const resolveConnectShyftInboxContractAsync = async (scope: {
  tenantId: string;
  orgUnitId: string;
  bucket: ConnectShyftInboxBucket;
  actorUserId?: string | null;
  db: Knex;
}): Promise<ConnectShyftThreadSummaryRecord[]> => {
  const rows = await resolveDbThreadRows(scope.db, {
    tenantId: scope.tenantId,
    orgUnitId: scope.orgUnitId,
  });

  if (!rows) {
    return resolveConnectShyftInboxContract({
      tenantId: scope.tenantId,
      orgUnitId: scope.orgUnitId,
      bucket: scope.bucket,
      actorUserId: scope.actorUserId,
    });
  }

  if (rows.length === 0 && hasSeedScope(scope)) {
    return resolveConnectShyftInboxContract({
      tenantId: scope.tenantId,
      orgUnitId: scope.orgUnitId,
      bucket: scope.bucket,
      actorUserId: scope.actorUserId,
    });
  }

  const filteredRows = filterRowsForBucket(rows, {
    bucket: scope.bucket,
    actorUserId: scope.actorUserId,
  });

  const mapped = filteredRows
    .map((row) => mapDbRowToSummary(row, scope.bucket))
    .filter((row): row is ConnectShyftThreadSummaryRecord => row !== null);

  if (mapped.length === 0 && hasSeedScope(scope)) {
    return resolveConnectShyftInboxContract({
      tenantId: scope.tenantId,
      orgUnitId: scope.orgUnitId,
      bucket: scope.bucket,
      actorUserId: scope.actorUserId,
    });
  }

  return sortConnectShyftThreadSummaries(mapped);
};

const resolveBucketFromDbRow = (
  row: ConnectShyftThreadDbRow,
  actorUserId?: string | null,
): ConnectShyftInboxBucket => {
  const state = normalizeThreadState(row.state);
  if (state === 'CLAIMED' && actorUserId) {
    const claimedByUserId = normalizeOptionalString(row.claimed_by_user_id);
    if (claimedByUserId === actorUserId) {
      return 'mine';
    }
  }

  return 'inbox';
};

export const resolveConnectShyftThreadDetailContractAsync = async (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  actorUserId?: string | null;
  requestedRole?: string | null;
  db: Knex;
}): Promise<ConnectShyftThreadDetailRecord | null> => {
  const normalizedThreadId = input.threadId.trim();
  if (!normalizedThreadId) {
    return null;
  }

  const rows = await resolveDbThreadRows(input.db, {
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    threadId: normalizedThreadId,
  });

  if (!rows) {
    return resolveConnectShyftThreadDetailContract({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      threadId: normalizedThreadId,
      actorUserId: input.actorUserId,
      requestedRole: input.requestedRole,
    });
  }

  const row = rows.find(
    (candidate) => normalizeString(candidate.thread_id) === normalizedThreadId,
  );
  if (!row) {
    if (hasSeedScope(input)) {
      return resolveConnectShyftThreadDetailContract({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        threadId: normalizedThreadId,
        actorUserId: input.actorUserId,
        requestedRole: input.requestedRole,
      });
    }

    return null;
  }

  const summary = mapDbRowToSummary(
    row,
    resolveBucketFromDbRow(row, input.actorUserId),
  );
  if (!summary) {
    return null;
  }

  return {
    ...summary,
    actions: resolveConnectShyftThreadActions(summary.state, {
      requestedRole: input.requestedRole,
    }),
    lifecycle: {
      reopenedByInbound: false,
    },
  };
};
