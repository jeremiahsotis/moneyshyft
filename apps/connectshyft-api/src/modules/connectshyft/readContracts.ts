import type { Knex } from 'knex';
import type { ConnectShyftThreadSubjectImpact } from '@shyft/contracts';
import {
  type SubjectContext,
  validateSubjectContext,
} from '../../../../../libs/contracts/src/subject-context';
import {
  connectShyftCallServiceAsync,
  ConnectShyftPersistenceUnavailableError,
} from './calls';
import { peopleCoreServiceAsync } from '../peoplecore/service';

export type ConnectShyftInboxBucket = 'inbox' | 'mine';
export type ConnectShyftThreadState = 'UNCLAIMED' | 'CLAIMED' | 'CLOSED';
export type ConnectShyftThreadAction = 'Call' | 'Text' | 'Claim' | 'Close' | 'Send Message' | 'Take Over';
export type ConnectShyftThreadIdentityState = 'confirmed' | 'provisional';

export type ConnectShyftThreadDisplayRecord = {
  title: string;
  preview: string;
  urgencyLabel: string;
  stateLabel: string;
  inboundContext: string;
  outboundContext: string;
  neighborContext: string;
  conferenceContext: string;
  claimContext: string;
  voicemailLabel: string;
};

export type ConnectShyftThreadTelephonyRecord = {
  callIndicator: boolean;
  callLabel: string | null;
  voicemailIndicator: boolean;
  voicemailLabel: string | null;
};

export type ConnectShyftThreadSummaryRecord = {
  threadId: string;
  neighborId: string | null;
  neighborDeleted: boolean;
  neighbor_deleted: boolean;
  neighborDeletedAtUtc: string | null;
  neighbor_deleted_at_utc: string | null;
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
  callIndicator?: boolean;
  callLabel?: string | null;
  voicemailIndicator: boolean;
  voicemailLabel: string | null;
  summary: string;
  display?: ConnectShyftThreadDisplayRecord;
};

export type ConnectShyftThreadDetailRecord = ConnectShyftThreadSummaryRecord & {
  personId: string | null;
  identityState: ConnectShyftThreadIdentityState | null;
  subjectImpact: ConnectShyftThreadSubjectImpact | null;
  subjectContext: SubjectContext;
  actions: readonly ConnectShyftThreadAction[];
  lifecycle: {
    reopenedByInbound: boolean;
  };
  telephony?: ConnectShyftThreadTelephonyRecord;
};

export type ConnectShyftThreadTimelineMetadata = {
  threadId: string;
  neighborDeleted: boolean;
  neighborDeletedAtUtc: string | null;
};

type ConnectShyftThreadSeed = {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  neighborId?: string | null;
  personId?: string | null;
  personStatus?: string | null;
  state: ConnectShyftThreadState;
  bucket: ConnectShyftInboxBucket;
  claimedByUserId: string | null;
  escalationStage: number;
  isNewUnread: boolean;
  lastActivityAtUtc: string;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
  preferredOutboundLabel: string;
  callIndicator?: boolean;
  voicemailIndicator: boolean;
  summary: string;
};

type ConnectShyftThreadDbRow = {
  thread_id: string;
  neighbor_id?: string | null;
  person_id?: string | null;
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

type ConnectShyftNeighborLifecycleDbRow = {
  id: string;
  is_deleted?: boolean | number | string | null;
  deleted_at_utc?: string | Date | null;
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

const CONNECTSHYFT_THREAD_ACTIONS: Record<
  ConnectShyftThreadState,
  readonly ConnectShyftThreadAction[]
> = {
  UNCLAIMED: ['Call', 'Text', 'Claim'],
  CLAIMED: ['Call', 'Text', 'Close'],
  CLOSED: ['Call', 'Send Message'],
};
const LEGACY_CS_NUMBER_PATTERN = /^cs-number(?:-[a-z0-9]+)*-(\d+)$/i;

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
const CONNECTSHYFT_G1_SCOPE = {
  tenantId: 'tenant-connectshyft-g1',
  orgUnitId: 'org-connectshyft-g1-east',
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

const CONNECTSHYFT_THREAD_SEED_DATA: readonly ConnectShyftThreadSeed[] = [
  {
    tenantId: CONNECTSHYFT_DEFAULT_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_DEFAULT_SCOPE.orgUnitId,
    threadId: '2686f12a-b7dc-4ab2-8de2-70b05684198b',
    state: 'CLAIMED',
    bucket: 'inbox',
    claimedByUserId: 'user-connectshyft-c3-other-operator',
    escalationStage: 3,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-24T19:30:00.000Z',
    lastInboundCsNumberId: '+12605550181',
    preferredOutboundCsNumberId: '+12605550181',
    preferredOutboundLabel: 'Primary East Dispatch',
    voicemailIndicator: false,
    summary: 'Operator follow-up required',
  },
  {
    tenantId: CONNECTSHYFT_DEFAULT_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_DEFAULT_SCOPE.orgUnitId,
    threadId: '90ca1c73-be82-48c6-8ba0-504e872ad211',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 2,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-24T19:20:00.000Z',
    lastInboundCsNumberId: '+12605550182',
    preferredOutboundCsNumberId: '+12605550182',
    preferredOutboundLabel: 'Overflow Dispatch',
    voicemailIndicator: false,
    summary: 'Pending escalation review',
  },
  {
    tenantId: CONNECTSHYFT_DEFAULT_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_DEFAULT_SCOPE.orgUnitId,
    threadId: '05a64891-ba69-4385-8bb9-140f01e0d243',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 2,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-24T19:19:00.000Z',
    lastInboundCsNumberId: '+12605550186',
    preferredOutboundCsNumberId: '+12605550186',
    preferredOutboundLabel: 'Overflow Dispatch',
    voicemailIndicator: false,
    summary: 'Secondary triage queue',
  },
  {
    tenantId: CONNECTSHYFT_DEFAULT_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_DEFAULT_SCOPE.orgUnitId,
    threadId: '47e2e20d-f3bc-4c0d-87a6-d3f0b0cbe69e',
    state: 'CLOSED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-24T19:10:00.000Z',
    lastInboundCsNumberId: '+12605550183',
    preferredOutboundCsNumberId: '+12605550183',
    preferredOutboundLabel: 'Closed-case follow-up',
    voicemailIndicator: false,
    summary: 'Waiting for outbound follow-up',
  },
  {
    tenantId: CONNECTSHYFT_DEFAULT_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_DEFAULT_SCOPE.orgUnitId,
    threadId: '212a5375-c931-48fb-84c0-0eb4f1e3282b',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 0,
    isNewUnread: true,
    lastActivityAtUtc: '2026-02-24T19:00:00.000Z',
    lastInboundCsNumberId: '+12605550185',
    preferredOutboundCsNumberId: '+12605550185',
    preferredOutboundLabel: 'General Queue',
    voicemailIndicator: false,
    summary: 'New unread message',
  },
  {
    tenantId: CONNECTSHYFT_DEFAULT_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_DEFAULT_SCOPE.orgUnitId,
    threadId: '7ce62a91-60dd-4869-8816-d782f26b85d1',
    state: 'CLAIMED',
    bucket: 'mine',
    claimedByUserId: 'user-connectshyft-c3-operator',
    escalationStage: 0,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-24T18:50:00.000Z',
    lastInboundCsNumberId: '+12605550184',
    preferredOutboundCsNumberId: '+12605550184',
    preferredOutboundLabel: 'Assigned Operator Line',
    voicemailIndicator: true,
    summary: 'Voicemail received on claimed thread',
  },
  {
    tenantId: CONNECTSHYFT_C4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_C4_SCOPE.orgUnitId,
    threadId: '483a4c51-e677-422a-8bc6-faeea89c6dcf',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 2,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-25T13:20:00.000Z',
    lastInboundCsNumberId: '+12605550198',
    preferredOutboundCsNumberId: '+12605550198',
    preferredOutboundLabel: 'C4 Intake Queue',
    voicemailIndicator: false,
    summary: 'Unclaimed intake ready for assignment',
  },
  {
    tenantId: CONNECTSHYFT_C4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_C4_SCOPE.orgUnitId,
    threadId: '6fb01cbc-069d-485a-86f7-ee72359543b9',
    state: 'CLAIMED',
    bucket: 'inbox',
    claimedByUserId: 'user-connectshyft-c4-other-operator',
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-25T13:10:00.000Z',
    lastInboundCsNumberId: '+12605550198',
    preferredOutboundCsNumberId: '+12605550198',
    preferredOutboundLabel: 'C4 Assigned Queue',
    voicemailIndicator: false,
    summary: 'Claimed thread eligible for takeover/close',
  },
  {
    tenantId: CONNECTSHYFT_C4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_C4_SCOPE.orgUnitId,
    threadId: '2f6bbd34-49c7-4400-8982-889c996ab87b',
    state: 'CLOSED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-25T13:00:00.000Z',
    lastInboundCsNumberId: '+12605550198',
    preferredOutboundCsNumberId: '+12605550198',
    preferredOutboundLabel: 'C4 Closed Follow-up',
    voicemailIndicator: false,
    summary: 'Closed thread awaiting explicit outbound reopen',
  },
  {
    tenantId: CONNECTSHYFT_D4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_D4_SCOPE.orgUnitId,
    threadId: '4332bb8e-940f-4927-8320-a8d3f3093d72',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 2,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-27T14:20:00.000Z',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    preferredOutboundLabel: 'D4 Intake Queue',
    voicemailIndicator: false,
    summary: 'Unclaimed thread awaiting policy-safe outbound action',
  },
  {
    tenantId: CONNECTSHYFT_D4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_D4_SCOPE.orgUnitId,
    threadId: '0b3060e8-d0e1-4366-8655-8c7ec44cf0ee',
    state: 'CLAIMED',
    bucket: 'inbox',
    claimedByUserId: 'user-connectshyft-d4-other-operator',
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-27T14:10:00.000Z',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    preferredOutboundLabel: 'D4 Assigned Queue',
    voicemailIndicator: false,
    summary: 'Claimed thread with explicit close controls',
  },
  {
    tenantId: CONNECTSHYFT_D4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_D4_SCOPE.orgUnitId,
    threadId: '20ab942f-27c6-4ae5-8af2-06b727c36b2a',
    state: 'CLOSED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-27T14:00:00.000Z',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    preferredOutboundLabel: 'D4 Closed Follow-up',
    voicemailIndicator: false,
    summary: 'Closed thread requiring explicit reopen feedback',
  },
  {
    tenantId: CONNECTSHYFT_D4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_D4_SCOPE.orgUnitId,
    threadId: '06a77807-6575-4c63-8824-38a89f9dae12',
    state: 'CLOSED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 0,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-27T13:55:00.000Z',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    preferredOutboundLabel: 'D4 Closed Preference Guardrail Queue',
    voicemailIndicator: false,
    summary: 'Closed thread with prefers_texting=NO override contract',
  },
  {
    tenantId: CONNECTSHYFT_D4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_D4_SCOPE.orgUnitId,
    threadId: '59b44eb4-c8e7-4cd1-8a22-bbeceb871dd7',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-27T13:50:00.000Z',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
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
    lastInboundCsNumberId: '+12605550171',
    preferredOutboundCsNumberId: '+12605550171',
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
    lastInboundCsNumberId: '+12605550172',
    preferredOutboundCsNumberId: '+12605550172',
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
    lastInboundCsNumberId: '+12605550173',
    preferredOutboundCsNumberId: '+12605550173',
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
    lastInboundCsNumberId: '+12605550174',
    preferredOutboundCsNumberId: '+12605550174',
    preferredOutboundLabel: 'Conference Assigned Operator Line',
    voicemailIndicator: true,
    summary: 'Voicemail retained on claimed operator thread',
  },
  {
    tenantId: CONNECTSHYFT_UX_R3_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R3_SCOPE.orgUnitId,
    threadId: 'c5d1de83-5a0e-45e0-8f25-eba1bd21a985',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 2,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-26T14:20:00.000Z',
    lastInboundCsNumberId: '+12605550175',
    preferredOutboundCsNumberId: '+12605550175',
    preferredOutboundLabel: 'UX R3 Intake Queue',
    voicemailIndicator: true,
    summary: 'Voicemail received from inbound caller',
  },
  {
    tenantId: CONNECTSHYFT_UX_R3_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R3_SCOPE.orgUnitId,
    threadId: 'b58069cc-1ab6-4ada-8a95-c468780a45a3',
    state: 'CLAIMED',
    bucket: 'mine',
    claimedByUserId: 'user-connectshyft-ux-r3-operator',
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-26T14:10:00.000Z',
    lastInboundCsNumberId: '+12605550176',
    preferredOutboundCsNumberId: '+12605550176',
    preferredOutboundLabel: 'UX R3 Assigned Operator Line',
    voicemailIndicator: true,
    summary: 'Claimed voicemail remains with assigned owner',
  },
  {
    tenantId: CONNECTSHYFT_UX_R3_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R3_SCOPE.orgUnitId,
    threadId: 'cba65a18-a1bc-45c3-838d-72f80135d6af',
    state: 'CLOSED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-02-26T14:00:00.000Z',
    lastInboundCsNumberId: '+12605550177',
    preferredOutboundCsNumberId: '+12605550177',
    preferredOutboundLabel: 'UX R3 Closed Follow-up Queue',
    voicemailIndicator: false,
    summary: 'Closed thread locked against inbound auto-reopen',
  },
  {
    tenantId: CONNECTSHYFT_G1_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_G1_SCOPE.orgUnitId,
    threadId: '04333bc3-018d-4fd3-84da-5d39a8767d30',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 2,
    isNewUnread: true,
    lastActivityAtUtc: '2026-03-03T13:15:00.000Z',
    lastInboundCsNumberId: '+12605550194',
    preferredOutboundCsNumberId: '+12605550194',
    preferredOutboundLabel: 'G1 Outreach',
    voicemailIndicator: false,
    summary: 'Neighbor follow-up waiting in the shared inbox.',
  },
  {
    tenantId: CONNECTSHYFT_G1_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_G1_SCOPE.orgUnitId,
    threadId: '1e6b1c89-40ad-4a47-8e0a-784db5b0c9d8',
    state: 'CLAIMED',
    bucket: 'inbox',
    claimedByUserId: 'user-connectshyft-g1-other-operator',
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-03-03T12:30:00.000Z',
    lastInboundCsNumberId: '+12605550194',
    preferredOutboundCsNumberId: '+12605550194',
    preferredOutboundLabel: 'G1 Claimed Follow-up',
    voicemailIndicator: false,
    summary: 'Claimed conversation kept out of the current operator mine queue.',
  },
  {
    tenantId: CONNECTSHYFT_G1_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_G1_SCOPE.orgUnitId,
    threadId: 'd78671f5-edc5-42af-86e0-97342ccc3968',
    state: 'CLOSED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 0,
    isNewUnread: false,
    lastActivityAtUtc: '2026-03-02T18:05:00.000Z',
    lastInboundCsNumberId: '+12605550194',
    preferredOutboundCsNumberId: '+12605550194',
    preferredOutboundLabel: 'G1 Closed Follow-up',
    voicemailIndicator: false,
    summary: 'Closed conversation preserved for reusable card and detail primitives.',
  },
  {
    tenantId: CONNECTSHYFT_G1_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_G1_SCOPE.orgUnitId,
    threadId: 'f5b54c4b-95a6-4201-8d2a-fa373d79e905',
    state: 'CLAIMED',
    bucket: 'mine',
    claimedByUserId: 'user-connectshyft-g1-operator',
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-03-03T14:05:00.000Z',
    lastInboundCsNumberId: '+12605550194',
    preferredOutboundCsNumberId: '+12605550194',
    preferredOutboundLabel: 'G1 Voicemail Follow-up',
    voicemailIndicator: true,
    summary: 'Voicemail waiting for the assigned operator follow-up.',
  },
  {
    tenantId: CONNECTSHYFT_UX_R4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R4_SCOPE.orgUnitId,
    threadId: '1641c3dd-4d4c-4997-8b72-ae4876649b37',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 2,
    isNewUnread: false,
    lastActivityAtUtc: '2026-03-02T14:20:00.000Z',
    lastInboundCsNumberId: '+12605550196',
    preferredOutboundCsNumberId: '+12605550196',
    preferredOutboundLabel: 'UX R4 Intake Queue',
    voicemailIndicator: false,
    summary: 'Unclaimed thread with explicit outbound guardrail actions',
  },
  {
    tenantId: CONNECTSHYFT_UX_R4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R4_SCOPE.orgUnitId,
    threadId: '69c239d2-8f02-4202-8cec-a7f0de61cbf7',
    state: 'CLAIMED',
    bucket: 'inbox',
    claimedByUserId: 'user-connectshyft-ux-r4-other-operator',
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-03-02T14:10:00.000Z',
    lastInboundCsNumberId: '+12605550196',
    preferredOutboundCsNumberId: '+12605550196',
    preferredOutboundLabel: 'UX R4 Assigned Follow-up',
    voicemailIndicator: false,
    summary: 'Claimed thread with deterministic outbound controls',
  },
  {
    tenantId: CONNECTSHYFT_UX_R4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R4_SCOPE.orgUnitId,
    threadId: 'aedcda71-42b7-4857-8a0a-70013e01d4cd',
    state: 'CLOSED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 0,
    isNewUnread: false,
    lastActivityAtUtc: '2026-03-02T14:00:00.000Z',
    lastInboundCsNumberId: '+12605550196',
    preferredOutboundCsNumberId: '+12605550196',
    preferredOutboundLabel: 'UX R4 Closed Follow-up',
    voicemailIndicator: false,
    summary: 'Closed thread requiring explicit same-thread reopen',
  },
  {
    tenantId: CONNECTSHYFT_UX_R4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R4_SCOPE.orgUnitId,
    threadId: 'f5b54c4b-95a6-4201-8d2a-fa373d79e905',
    state: 'CLAIMED',
    bucket: 'mine',
    claimedByUserId: 'user-connectshyft-ux-r4-operator',
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-03-02T14:05:00.000Z',
    lastInboundCsNumberId: '+12605550196',
    preferredOutboundCsNumberId: '+12605550196',
    preferredOutboundLabel: 'UX R4 Voicemail Follow-up',
    voicemailIndicator: true,
    summary: 'Voicemail waiting for operator follow-up',
  },
  {
    tenantId: CONNECTSHYFT_UX_R4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R4_SCOPE.orgUnitId,
    threadId: '21f2866f-37ff-42da-80fc-0b5d2c3bc09d',
    state: 'UNCLAIMED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 1,
    isNewUnread: false,
    lastActivityAtUtc: '2026-03-02T13:55:00.000Z',
    lastInboundCsNumberId: '+12605550196',
    preferredOutboundCsNumberId: '+12605550196',
    preferredOutboundLabel: 'UX R4 Preference Guardrail Queue',
    voicemailIndicator: false,
    summary: 'Prefers texting NO requires explicit override before dispatch',
  },
  {
    tenantId: CONNECTSHYFT_UX_R4_SCOPE.tenantId,
    orgUnitId: CONNECTSHYFT_UX_R4_SCOPE.orgUnitId,
    threadId: 'e37b00e0-228f-43c0-8c70-b3d0a5bfad40',
    state: 'CLOSED',
    bucket: 'inbox',
    claimedByUserId: null,
    escalationStage: 0,
    isNewUnread: false,
    lastActivityAtUtc: '2026-03-02T13:50:00.000Z',
    lastInboundCsNumberId: '+12605550196',
    preferredOutboundCsNumberId: '+12605550196',
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

const resolveCallLabel = (input: {
  callIndicator: boolean;
}): string | null => {
  return input.callIndicator ? 'Call activity' : null;
};

const buildThreadTelephonyRecord = (input: {
  callIndicator: boolean;
  callLabel: string | null;
  voicemailIndicator: boolean;
  voicemailLabel: string | null;
}): ConnectShyftThreadTelephonyRecord => ({
  callIndicator: input.callIndicator,
  callLabel: input.callLabel,
  voicemailIndicator: input.voicemailIndicator,
  voicemailLabel: input.voicemailLabel,
});

const resolveThreadStateLabel = (state: ConnectShyftThreadState): string => {
  if (state === 'UNCLAIMED') {
    return 'Unclaimed';
  }

  if (state === 'CLAIMED') {
    return 'Claimed';
  }

  return 'Closed';
};

const normalizeThreadSenderAlignmentForReadContracts = (value: unknown): string => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return '';
  }

  if (normalized.startsWith('+')) {
    return normalized;
  }

  const legacyMatch = LEGACY_CS_NUMBER_PATTERN.exec(normalized);
  if (!legacyMatch) {
    return normalized;
  }

  const suffix = legacyMatch[1].slice(-4).padStart(4, '0');
  return `+1260555${suffix}`;
};

const buildThreadDisplayRecord = (input: {
  state: ConnectShyftThreadState;
  summary: string;
  urgencyLabel: string;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId?: string;
  preferredOutboundLabel: string;
  voicemailLabel: string | null;
}): ConnectShyftThreadDisplayRecord => {
  const normalizedSummary = normalizeString(input.summary) || 'Conversation in progress.';
  const lastInboundProviderNumber = normalizeThreadSenderAlignmentForReadContracts(
    input.lastInboundCsNumberId,
  );
  const preferredOutboundProviderNumber = normalizeThreadSenderAlignmentForReadContracts(
    input.preferredOutboundCsNumberId,
  );
  const outboundContext = normalizeString(input.preferredOutboundLabel)
    || (preferredOutboundProviderNumber
      ? 'Mapped outbound number configured'
      : 'Outbound number unavailable');
  const inboundContext = lastInboundProviderNumber
    ? 'Mapped inbound number configured'
    : 'Inbound number unavailable';

  return {
    title: normalizedSummary,
    preview: `Latest update: ${normalizedSummary}`,
    urgencyLabel: input.urgencyLabel || 'New conversation',
    stateLabel: resolveThreadStateLabel(input.state),
    inboundContext,
    outboundContext,
    neighborContext: `Neighbor context: ${normalizedSummary}`,
    conferenceContext: `Conference context: ${outboundContext}`,
    claimContext: input.state === 'UNCLAIMED'
      ? 'Claim context: Unclaimed conversation'
      : input.state === 'CLAIMED'
        ? 'Claim context: Claimed conversation'
        : 'Claim context: Closed conversation',
    voicemailLabel: input.voicemailLabel || '',
  };
};

const buildThreadSubjectContext = (input: {
  orgUnitId: string;
  threadId: string;
  personId: string | null;
  identityState: ConnectShyftThreadIdentityState | null;
}): SubjectContext => {
  const subject: SubjectContext = input.personId
    ? input.identityState === 'provisional'
      ? {
        orgUnitId: input.orgUnitId,
        provisionalPersonId: input.personId,
        identityState: 'provisional',
        threadId: input.threadId,
      }
      : {
        orgUnitId: input.orgUnitId,
        personId: input.personId,
        identityState: 'confirmed',
        threadId: input.threadId,
      }
    : {
      orgUnitId: input.orgUnitId,
      threadId: input.threadId,
    };

  validateSubjectContext(subject);
  return subject;
};

const buildThreadIdentityProjection = (input: {
  orgUnitId: string;
  threadId: string;
  personId?: string | null;
  personStatus?: string | null;
}): {
  personId: string | null;
  identityState: ConnectShyftThreadIdentityState | null;
  subjectImpact: ConnectShyftThreadSubjectImpact | null;
  subjectContext: SubjectContext;
} => {
  const personId = normalizeOptionalString(input.personId);
  const identityState: ConnectShyftThreadIdentityState | null = !personId
    ? null
    : input.personStatus === 'active_provisional'
      ? 'provisional'
      : 'confirmed';

  return {
    personId,
    identityState,
    subjectImpact: null,
    subjectContext: buildThreadSubjectContext({
      orgUnitId: input.orgUnitId,
      threadId: input.threadId,
      personId,
      identityState,
    }),
  };
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
  const callIndicator = seed.callIndicator === true;
  const callLabel = resolveCallLabel({
    callIndicator,
  });
  const voicemailLabel = resolveVoicemailLabel({
    voicemailIndicator: seed.voicemailIndicator,
    state: seed.state,
  });
  const lastInboundCsNumberId = normalizeThreadSenderAlignmentForReadContracts(
    seed.lastInboundCsNumberId,
  );
  const preferredOutboundCsNumberId = normalizeThreadSenderAlignmentForReadContracts(
    seed.preferredOutboundCsNumberId,
  );
  return {
    threadId: seed.threadId,
    neighborId: normalizeString(seed.neighborId) || null,
    neighborDeleted: false,
    neighbor_deleted: false,
    neighborDeletedAtUtc: null,
    neighbor_deleted_at_utc: null,
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
    lastInboundCsNumberId,
    last_inbound_cs_number_id: lastInboundCsNumberId,
    preferredOutboundCsNumberId,
    preferred_outbound_cs_number_id: preferredOutboundCsNumberId,
    preferredOutboundContext: {
      csNumberId: preferredOutboundCsNumberId,
      label: seed.preferredOutboundLabel,
    },
    preferred_outbound_context: {
      cs_number_id: preferredOutboundCsNumberId,
      label: seed.preferredOutboundLabel,
    },
    callIndicator,
    callLabel,
    voicemailIndicator: seed.voicemailIndicator,
    voicemailLabel,
    summary: seed.summary,
    display: buildThreadDisplayRecord({
      state: seed.state,
      summary: seed.summary,
      urgencyLabel,
      lastInboundCsNumberId,
      preferredOutboundCsNumberId,
      preferredOutboundLabel: seed.preferredOutboundLabel,
      voicemailLabel,
    }),
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
    ...buildThreadIdentityProjection({
      orgUnitId: summary.orgUnitId,
      threadId: summary.threadId,
      personId: matchedSeed.personId,
      personStatus: matchedSeed.personStatus,
    }),
    actions: resolveConnectShyftThreadActions(summary.state, {
      requestedRole: input.requestedRole,
    }),
    lifecycle: {
      reopenedByInbound: false,
    },
    telephony: buildThreadTelephonyRecord({
      callIndicator: summary.callIndicator === true,
      callLabel: summary.callLabel || null,
      voicemailIndicator: summary.voicemailIndicator,
      voicemailLabel: summary.voicemailLabel,
    }),
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
    'neighbor_id',
    'person_id',
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

const resolveNeighborLifecycleById = async (
  db: Knex,
  scope: {
    tenantId: string;
    neighborIds: string[];
  },
): Promise<Map<string, { isDeleted: boolean; deletedAtUtc: string | null }> | null> => {
  if (scope.neighborIds.length === 0) {
    return new Map();
  }

  try {
    const rows = await db
      .withSchema(CONNECTSHYFT_SCHEMA)
      .table('cs_neighbors')
      .where('tenant_id', scope.tenantId)
      .whereIn('id', scope.neighborIds)
      .select<ConnectShyftNeighborLifecycleDbRow[]>([
        'id',
        'is_deleted',
        'deleted_at_utc',
      ]);

    return rows.reduce((lookup, row) => {
      lookup.set(normalizeString(row.id), {
        isDeleted: normalizeBoolean(row.is_deleted),
        deletedAtUtc: row.deleted_at_utc ? normalizeUtcTimestamp(row.deleted_at_utc) : null,
      });
      return lookup;
    }, new Map<string, { isDeleted: boolean; deletedAtUtc: string | null }>());
  } catch (_error) {
    return null;
  }
};

const mapDbRowToSummary = (
  row: ConnectShyftThreadDbRow,
  bucket: ConnectShyftInboxBucket,
  neighborLifecycle?: {
    isDeleted: boolean;
    deletedAtUtc: string | null;
  } | null,
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
  const normalizedPreferredOutboundCsNumberId = normalizeThreadSenderAlignmentForReadContracts(
    preferredOutboundCsNumberId,
  );
  const normalizedLastInboundCsNumberId = normalizeThreadSenderAlignmentForReadContracts(
    row.last_inbound_cs_number_id,
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
  const voicemailLabel = resolveVoicemailLabel({
    voicemailIndicator,
    state,
  });
  const callIndicator = false;
  const callLabel = resolveCallLabel({
    callIndicator,
  });

  return {
    threadId,
    neighborId: normalizeOptionalString(row.neighbor_id),
    neighborDeleted: neighborLifecycle?.isDeleted === true,
    neighbor_deleted: neighborLifecycle?.isDeleted === true,
    neighborDeletedAtUtc: neighborLifecycle?.deletedAtUtc || null,
    neighbor_deleted_at_utc: neighborLifecycle?.deletedAtUtc || null,
    tenantId,
    orgUnitId,
    state,
    claimedByUserId: normalizeOptionalString(row.claimed_by_user_id),
    claimed_by_user_id: normalizeOptionalString(row.claimed_by_user_id),
    bucket,
    escalationStage,
    isNewUnread,
    priorityRank,
    urgencyLabel: resolveConnectShyftUrgencyLabel(escalationStage),
    lastActivityAtUtc: normalizeUtcTimestamp(row.last_activity_at_utc),
    lastInboundCsNumberId: normalizedLastInboundCsNumberId,
    last_inbound_cs_number_id: normalizedLastInboundCsNumberId,
    preferredOutboundCsNumberId: normalizedPreferredOutboundCsNumberId,
    preferred_outbound_cs_number_id: normalizedPreferredOutboundCsNumberId,
    preferredOutboundContext: {
      csNumberId: normalizedPreferredOutboundCsNumberId,
      label: preferredOutboundLabel,
    },
    preferred_outbound_context: {
      cs_number_id: normalizedPreferredOutboundCsNumberId,
      label: preferredOutboundLabel,
    },
    callIndicator,
    callLabel,
    voicemailIndicator,
    voicemailLabel,
    summary: normalizeString(row.summary ?? row.preview ?? row.last_message_preview),
    display: buildThreadDisplayRecord({
      state,
      summary: normalizeString(row.summary ?? row.preview ?? row.last_message_preview),
      urgencyLabel: resolveConnectShyftUrgencyLabel(escalationStage),
      lastInboundCsNumberId: normalizedLastInboundCsNumberId,
      preferredOutboundCsNumberId: normalizedPreferredOutboundCsNumberId,
      preferredOutboundLabel,
      voicemailLabel,
    }),
  };
};

const enrichSummaryWithCallIndicators = async (
  summary: ConnectShyftThreadSummaryRecord,
): Promise<ConnectShyftThreadSummaryRecord> => {
  try {
    const calls = await connectShyftCallServiceAsync.listThreadCalls({
      tenantId: summary.tenantId,
      orgUnitId: summary.orgUnitId,
      threadId: summary.threadId,
    });
    const callIndicator = calls.length > 0;

    return {
      ...summary,
      callIndicator,
      callLabel: resolveCallLabel({
        callIndicator,
      }),
    };
  } catch (error) {
    if (error instanceof ConnectShyftPersistenceUnavailableError) {
      return summary;
    }

    throw error;
  }
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

  const neighborLifecycle = await resolveNeighborLifecycleById(scope.db, {
    tenantId: scope.tenantId,
    neighborIds: Array.from(new Set(filteredRows
      .map((row) => normalizeOptionalString(row.neighbor_id))
      .filter((neighborId): neighborId is string => Boolean(neighborId)))),
  });

  const mapped = filteredRows
    .map((row) => mapDbRowToSummary(
      row,
      scope.bucket,
      neighborLifecycle?.get(normalizeOptionalString(row.neighbor_id) || '') || null,
    ))
    .filter((row): row is ConnectShyftThreadSummaryRecord => row !== null);

  const enriched = await Promise.all(
    mapped
      .filter((row) => row.neighborDeleted !== true)
      .map((row) => enrichSummaryWithCallIndicators(row)),
  );

  return sortConnectShyftThreadSummaries(enriched);
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

export const resolveConnectShyftThreadTimelineMetadata = (
  thread: Pick<
    ConnectShyftThreadSummaryRecord | ConnectShyftThreadDetailRecord,
    'threadId' | 'neighborDeleted' | 'neighborDeletedAtUtc'
  >,
): ConnectShyftThreadTimelineMetadata => ({
  threadId: normalizeString(thread.threadId),
  neighborDeleted: thread.neighborDeleted === true,
  neighborDeletedAtUtc: normalizeOptionalString(thread.neighborDeletedAtUtc),
});

export const resolveConnectShyftThreadDetailContractAsync = async (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  actorUserId?: string | null;
  requestedRole?: string | null;
  includeDeleted?: boolean;
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

  const neighborLifecycle = await resolveNeighborLifecycleById(input.db, {
    tenantId: input.tenantId,
    neighborIds: Array.from(new Set(
      [normalizeOptionalString(row.neighbor_id)].filter((neighborId): neighborId is string => Boolean(neighborId)),
    )),
  });
  const baseSummary = mapDbRowToSummary(
    row,
    resolveBucketFromDbRow(row, input.actorUserId),
    neighborLifecycle?.get(normalizeOptionalString(row.neighbor_id) || '') || null,
  );
  if (!baseSummary) {
    return null;
  }
  if (baseSummary.neighborDeleted && input.includeDeleted !== true) {
    return null;
  }

  const summary = await enrichSummaryWithCallIndicators(baseSummary);

  let threadPersonStatus: string | null = null;
  const threadPersonId = normalizeOptionalString(row.person_id);
  if (threadPersonId) {
    try {
      threadPersonStatus = (await peopleCoreServiceAsync.getPerson({
        tenantId: input.tenantId,
        personId: threadPersonId,
      }))?.status ?? null;
    } catch (_error) {
      threadPersonStatus = null;
    }
  }

  return {
    ...summary,
    ...buildThreadIdentityProjection({
      orgUnitId: summary.orgUnitId,
      threadId: summary.threadId,
      personId: threadPersonId,
      personStatus: threadPersonStatus,
    }),
    actions: resolveConnectShyftThreadActions(summary.state, {
      requestedRole: input.requestedRole,
    }),
    lifecycle: {
      reopenedByInbound: false,
    },
    telephony: buildThreadTelephonyRecord({
      callIndicator: summary.callIndicator === true,
      callLabel: summary.callLabel || null,
      voicemailIndicator: summary.voicemailIndicator,
      voicemailLabel: summary.voicemailLabel,
    }),
  };
};
