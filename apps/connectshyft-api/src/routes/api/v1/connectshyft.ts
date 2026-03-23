import { createHash, randomUUID } from 'node:crypto';
import { Request, Response, Router } from 'express';
import type { Knex } from 'knex';
import type {
  PersonProvisionalCreatedEvent,
  ResolverReviewCreatedEvent,
  SubjectContext,
} from '@shyft/contracts';
import {
  buildTelephonyDispatchReplayKey,
  evaluateRetryPolicy,
  isTelephonyProviderFailure,
  validatePhoneForChannel,
} from '../../../../../../domains/communication';
import { refusal, success } from '../../../platform/envelopes/response';
import { CAPABILITIES, hasCapability } from '../../../platform/rbac/capabilities';
import {
  evaluateConnectShyftCapability,
  isConnectShyftTestOverrideEnabled,
  mergeConnectShyftFlagsWithEntitlement,
  resolveConnectShyftFeatureFlags,
  type ConnectShyftCapability,
  type ConnectShyftFeatureFlags,
} from '../../../modules/connectshyft/featureFlags';
import {
  deleteConnectNeighbor,
  getConnectAvailability,
  getConnectNeighborDetail,
  getConnectNeighbors,
  getConnectContext,
  getConnectEscalationConfig,
  getConnectEscalationRecipients,
  getConnectInbox,
  getConnectNumberMappings,
  getConnectOperatorCallbackNumber,
  getConnectSettingsNavigation,
  getConnectTelephonyReadiness,
  getConnectThreadDetail,
  getConnectThreadTimeline,
  getConnectWebhookReceiptMetrics,
  postConnectNeighborCreate,
  postConnectNeighborIdentityMatch,
  postConnectNeighborMerge,
  postConnectNumberMapping,
  postConnectThreadClaim,
  postConnectThreadCall,
  postConnectThreadClose,
  postConnectThreadMessage,
  postConnectThreadTakeover,
  postConnectWebhookReceiptCleanup,
  postConnectWebhookInbound,
  postConnectWebhookSms,
  putConnectNeighbor,
  putConnectEscalationConfig,
  putConnectNumberMapping,
  putConnectOperatorCallbackNumber,
} from '../../../modules/connectshyft/handlers';
import {
  resolveConnectShyftOrgUnitContext,
  type ResolvedConnectShyftContext,
} from '../../../modules/connectshyft/contextAccess';
import {
  registerConnectShyftThreadOutboundCoreExecutor,
  type ConnectShyftThreadOutboundCoreExecutionInput,
} from '../../../modules/connectshyft/http/threadOutboundContext';
import {
  registerConnectShyftInboundWebhookCoreExecutor,
  type ConnectShyftInboundWebhookCoreExecutionInput,
  type ConnectShyftResolvedWebhookCorrelation,
} from '../../../modules/connectshyft/http/inboundWebhookContext';
import {
  connectShyftNumberMappingServiceAsync,
} from '../../../modules/connectshyft/numberMappings';
import {
  resolveOperatorDestination,
  type ConnectShyftOperatorDestinationResolution,
} from '../../../modules/connectshyft/operatorDestinationResolver';
import {
  AsyncConnectShyftNeighborService,
  KnexConnectShyftNeighborStore,
  applyInboundSmsTextingPreference,
  connectShyftNeighborServiceAsync,
  createNeighborFromInbound,
  resolveActiveNeighborForInbound,
  type ConnectShyftNeighborPhone,
} from '../../../modules/connectshyft/neighbors';
import {
  ConnectShyftEscalationConfigService,
  KnexConnectShyftEscalationConfigStore,
} from '../../../modules/connectshyft/escalationConfig';
import {
  AsyncConnectShyftThreadService,
  KnexConnectShyftThreadStore,
  connectShyftThreadServiceAsync,
  type ConnectShyftEscalationTransition,
  type ConnectShyftThread,
  type ConnectShyftLifecycleAction,
  type ConnectShyftThreadState,
} from '../../../modules/connectshyft/threads';
import {
  resolveSenderNumber,
  type ResolveSenderNumberRefusal,
} from '../../../modules/connectshyft/senderNumberResolver';
import {
  connectShyftSmsPreferenceOverrideServiceAsync,
  ConnectShyftSmsOverridePersistenceUnavailableError,
  type ConnectShyftPersistedSmsOverride,
  type ConnectShyftResolvedSmsPreference,
  type ConnectShyftValidatedSmsOverride,
} from '../../../modules/connectshyft/smsPreferenceOverrides';
import {
  ConnectShyftProviderDispatchPolicyError,
  resolveConnectShyftProviderAdapter,
  resolveConnectShyftRequestedProviderKey,
  type ConnectShyftOutboundCallDispatchPolicy,
  type ConnectShyftProviderDispatchResult,
} from '../../../modules/connectshyft/providerRegistry';
import { executePlatformMutation } from '../../../platform/mutations/executePlatformMutation';
import {
  createKnexOrgUnitAccessStore,
  validateOrgUnitScopedAccess,
} from '../../../platform/tenancy/orgUnitAccess';
import {
  evaluateActorTenantModuleEntitlement,
  type PlatformAdminActorContext,
} from '../../../platform/tenantModuleEntitlements';
import logger from '../../../utils/logger';
import {
  resolveConnectShyftThreadActions,
  resolveConnectShyftThreadDetailContract,
  resolveConnectShyftThreadDetailContractAsync,
  resolveConnectShyftThreadTimelineMetadata,
  type ConnectShyftThreadDetailRecord,
} from '../../../modules/connectshyft/readContracts';
import {
  CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
  buildConnectShyftInboundSmsCanonicalPayload,
  extractConnectShyftInboundSmsNeighborId,
  mapConnectShyftInboundSmsWebhookToDomainEvent,
  resolveConnectShyftInboundSmsSenderPhone,
} from '../../../modules/connectshyft/inboundSms';
import {
  persistConnectShyftThreadIdentityEventAsync,
} from '../../../modules/connectshyft/threadIdentityEvents';
import {
  CONNECTSHYFT_INBOUND_VOICE_FALLBACK_EVENT_NAME,
  CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME,
  CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_ATTACHED_EVENT_NAME,
  CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_QUEUE_NAME,
  CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_REQUESTED_EVENT_NAME,
  buildConnectShyftInboundVoiceCanonicalPayload,
  buildConnectShyftOutboundVoicemailArtifact,
  buildConnectShyftVoicemailTranscriptionAttachedCanonicalPayload,
  buildConnectShyftVoicemailTranscriptionRequest,
  extractConnectShyftVoicemailTranscriptionCallbackPayload,
  extractConnectShyftInboundVoiceNeighborId,
  isConnectShyftVoicemailTranscriptionCallbackEventType,
  mapConnectShyftInboundVoiceWebhookToDomainEvent,
  resolveConnectShyftInboundVoiceRouting,
} from '../../../modules/connectshyft/inboundVoice';
import {
  listConnectShyftCanonicalEvents,
  recordConnectShyftCanonicalEvent,
  type ConnectShyftCanonicalEventRecord,
} from '../../../modules/connectshyft/canonicalEvents';
import {
  CONNECTSHYFT_OUTBOUND_SMS_APPENDED_EVENT_NAME,
  getThreadTimeline,
  normalizeConnectShyftThreadTimelineLimit,
} from '../../../modules/connectshyft/threadTimeline';
import { serializeConnectShyftThreadTimelineResponse } from '../../../modules/connectshyft/threadTimelineDto';
import {
  beginConnectShyftWebhookReceiptProcessing,
  markConnectShyftWebhookReceiptProcessingResult,
  recordConnectShyftProviderIdentifierMapping,
  resolveConnectShyftProviderCorrelationByIdentifiers,
} from '../../../modules/connectshyft/providerCorrelationMappings';
import {
  findConnectShyftBridgeSessionByProviderCallControlIdAsync,
  handleConnectShyftBridgeWebhookEvent,
  loadConnectShyftBridgeAggregateBySessionId,
  loadConnectShyftBridgeAggregateByThreadId,
  setConnectShyftBridgeLegProviderCallControlIdAsync,
  startConnectShyftBridgeSession,
  updateConnectShyftBridgeSessionVoicemailFallbackAsync,
  type ConnectShyftBridgeSessionAggregate,
} from '../../../modules/connectshyft/bridgeSessions';
import {
  beginConnectShyftCommunicationIdempotency,
  completeConnectShyftCommunicationIdempotency,
  parseConnectShyftIdempotencyResponseSnapshot,
  resetConnectShyftCommunicationReliabilityStateForTests,
} from '../../../modules/connectshyft/communicationReliability';
import {
  appendConnectShyftCommunicationAuditEntry,
  resetConnectShyftCommunicationAuditLogForTests,
} from '../../../modules/connectshyft/communicationAuditLog';
import {
  listIdentityAmbiguityEvents,
  markIdentityAmbiguityEventReviewed,
} from '../../../modules/connectshyft/ambiguityEvents';
import {
  resolveInboundContactPointIdentityAsync,
  type ResolveInboundContactPointIdentityResult,
} from '../../../modules/peoplecore/contactPointIdentityResolution';
import { peopleCoreServiceAsync } from '../../../modules/peoplecore/service';
import { isStrictUtcIsoTimestamp } from '../../../platform/time/timezoneService';
import connectShyftOpsRouter from './connectshyft/ops.routes';

const router = Router();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONNECTSHYFT_NEIGHBOR_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TEST_USER_ID_HEADER = 'x-test-connectshyft-user-id';
const CONNECTSHYFT_SYSTEM_ACTOR_USER_ID = '00000000-0000-4000-8000-000000000001';
const IDENTITY_MATCH_AMBIGUOUS_CODE = 'IDENTITY_MATCH_AMBIGUOUS';
const CONNECTSHYFT_INBOX_P95_BUDGET_MS = 750;
const CONNECTSHYFT_INBOX_P99_BUDGET_MS = 1500;
const DEFAULT_ESCALATION_BASELINE_HOURS = 24;
const MIN_ESCALATION_BASELINE_HOURS = 1;
const MAX_ESCALATION_BASELINE_HOURS = 24;
const MAX_ESCALATION_STAGE = 3;
const DEFAULT_SCHEDULER_LIMIT = 50;
const MAX_SCHEDULER_LIMIT = 250;
const HOUR_MS = 60 * 60 * 1000;
const CONNECTSHYFT_LIFECYCLE_EVENT_NAMES = {
  claimed: 'connectshyft.thread.claimed',
  takenOver: 'connectshyft.thread.taken_over',
  closed: 'connectshyft.thread.closed',
  reopenedByUser: 'connectshyft.thread_reopened_by_user',
  inboundSmsAppended: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
  inboundVoiceVoicemail: CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME,
  inboundVoiceFallback: CONNECTSHYFT_INBOUND_VOICE_FALLBACK_EVENT_NAME,
  voicemailTranscriptionRequested: CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_REQUESTED_EVENT_NAME,
  voicemailTranscriptionAttached: CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_ATTACHED_EVENT_NAME,
} as const;
const CONNECTSHYFT_OUTBOUND_EVENT_NAMES = {
  callDispatched: 'connectshyft.thread.outbound_call_dispatched',
  messageDispatched: 'connectshyft.thread.outbound_message_dispatched',
} as const;
const CONNECTSHYFT_CANONICAL_EVENT_TYPES = {
  callAttemptStarted: 'CallAttemptStarted',
  messageQueued: 'MessageQueued',
  callConnected: 'CallConnected',
  messageDelivered: 'MessageDelivered',
} as const;
const CONNECTSHYFT_CANONICAL_EVENTS_DEFAULT_LIMIT = 50;
const CONNECTSHYFT_CANONICAL_EVENTS_MAX_LIMIT = 200;
const CONNECTSHYFT_IDENTITY_AMBIGUITIES_DEFAULT_LIMIT = 50;
const CONNECTSHYFT_IDENTITY_AMBIGUITIES_MAX_LIMIT = 200;
const CONNECTSHYFT_OUTBOUND_CALL_POLICY = {
  transport: 'bridge',
  autoRetry: false,
  redialPolicy: 'manual_only',
  phases: ['initiated', 'ringing', 'connected', 'completed'],
} as const;
const CONNECTSHYFT_OUTBOUND_CALL_AUTO_CLAIM_POLICY = {
  trigger: 'CONNECTED',
  appliesToState: 'UNCLAIMED',
  nextState: 'CLAIMED',
} as const;
const CONNECTSHYFT_OUTBOUND_CALL_ALLOWED_TRANSPORT = CONNECTSHYFT_OUTBOUND_CALL_POLICY.transport;
const CONNECTSHYFT_OUTBOUND_CALL_ALLOWED_REDIAL_POLICY = CONNECTSHYFT_OUTBOUND_CALL_POLICY.redialPolicy;
const CONNECTSHYFT_CONNECTED_CALL_EVENT_TYPES = new Set(['voice.connected', 'call.connected', 'callconnected']);
const CONNECTSHYFT_ESCALATION_NOTIFICATION_EVENT_PREFIXES = [
  'connectshyft.thread.escalation.',
  'connectshyft.escalation.',
] as const;
const CONNECTSHYFT_LEGACY_ROLE_ALIASES: Record<string, string> = {
  admin: 'TENANT_ADMIN',
  member: 'ORGUNIT_MEMBER',
};

type ConnectShyftOutboundAction = 'call' | 'message';
type ConnectShyftNeighborMergeFailureStage = 'before-commit' | 'after-dependent-repoint';
type ConnectShyftSyntheticThreadDescriptor = {
  tenantId: string;
  orgUnitId: string;
  state: ConnectShyftThreadState;
  claimedByUserId: string | null;
  escalationStage: number;
  nextEvaluationAtUtc: string | null;
  neighborId: string;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
  summary: string;
};

const CONNECTSHYFT_SYNTHETIC_LIFECYCLE_THREADS: Record<string, ConnectShyftSyntheticThreadDescriptor> = {
  '483a4c51-e677-422a-8bc6-faeea89c6dcf': {
    tenantId: 'tenant-connectshyft-c4',
    orgUnitId: 'org-connectshyft-c4-east',
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 2,
    nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
    neighborId: 'neighbor-connectshyft-c4-1001',
    lastInboundCsNumberId: '+12605550198',
    preferredOutboundCsNumberId: '+12605550198',
    summary: 'Unclaimed intake ready for assignment',
  },
  '6fb01cbc-069d-485a-86f7-ee72359543b9': {
    tenantId: 'tenant-connectshyft-c4',
    orgUnitId: 'org-connectshyft-c4-east',
    state: 'CLAIMED',
    claimedByUserId: 'user-connectshyft-c4-other-operator',
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-c4-1002',
    lastInboundCsNumberId: '+12605550198',
    preferredOutboundCsNumberId: '+12605550198',
    summary: 'Claimed thread eligible for takeover/close',
  },
  '2f6bbd34-49c7-4400-8982-889c996ab87b': {
    tenantId: 'tenant-connectshyft-c4',
    orgUnitId: 'org-connectshyft-c4-east',
    state: 'CLOSED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-c4-1003',
    lastInboundCsNumberId: '+12605550198',
    preferredOutboundCsNumberId: '+12605550198',
    summary: 'Closed thread awaiting explicit outbound reopen',
  },
  '4332bb8e-940f-4927-8320-a8d3f3093d72': {
    tenantId: 'tenant-connectshyft-d4',
    orgUnitId: 'org-connectshyft-d4-east',
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 2,
    nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
    neighborId: 'neighbor-connectshyft-d4-1001',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    summary: 'Unclaimed intake ready for policy-safe outbound action',
  },
  '0b3060e8-d0e1-4366-8655-8c7ec44cf0ee': {
    tenantId: 'tenant-connectshyft-d4',
    orgUnitId: 'org-connectshyft-d4-east',
    state: 'CLAIMED',
    claimedByUserId: 'user-connectshyft-d4-other-operator',
    escalationStage: 1,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-d4-1002',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    summary: 'Claimed thread eligible for close action',
  },
  '20ab942f-27c6-4ae5-8af2-06b727c36b2a': {
    tenantId: 'tenant-connectshyft-d4',
    orgUnitId: 'org-connectshyft-d4-east',
    state: 'CLOSED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-d4-1003',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    summary: 'Closed thread awaiting explicit same-thread reopen',
  },
  '06a77807-6575-4c63-8824-38a89f9dae12': {
    tenantId: 'tenant-connectshyft-d4',
    orgUnitId: 'org-connectshyft-d4-east',
    state: 'CLOSED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-d4-pref-no-1005',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    summary: 'Closed thread with prefers_texting=NO policy.',
  },
  '59b44eb4-c8e7-4cd1-8a22-bbeceb871dd7': {
    tenantId: 'tenant-connectshyft-d4',
    orgUnitId: 'org-connectshyft-d4-east',
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 1,
    nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
    neighborId: 'neighbor-connectshyft-d4-pref-no-1004',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    summary: 'Unclaimed thread with prefers_texting=NO policy.',
  },
  '1641c3dd-4d4c-4997-8b72-ae4876649b37': {
    tenantId: 'tenant-connectshyft-ux-r4',
    orgUnitId: 'org-connectshyft-ux-r4-east',
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 2,
    nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
    neighborId: 'neighbor-connectshyft-ux-r4-1001',
    lastInboundCsNumberId: '+12605550196',
    preferredOutboundCsNumberId: '+12605550196',
    summary: 'Unclaimed thread with explicit outbound guardrail controls.',
  },
  '69c239d2-8f02-4202-8cec-a7f0de61cbf7': {
    tenantId: 'tenant-connectshyft-ux-r4',
    orgUnitId: 'org-connectshyft-ux-r4-east',
    state: 'CLAIMED',
    claimedByUserId: 'user-connectshyft-ux-r4-other-operator',
    escalationStage: 1,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-ux-r4-1002',
    lastInboundCsNumberId: '+12605550196',
    preferredOutboundCsNumberId: '+12605550196',
    summary: 'Claimed thread with deterministic policy-safe outbound controls.',
  },
  'aedcda71-42b7-4857-8a0a-70013e01d4cd': {
    tenantId: 'tenant-connectshyft-ux-r4',
    orgUnitId: 'org-connectshyft-ux-r4-east',
    state: 'CLOSED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-ux-r4-1003',
    lastInboundCsNumberId: '+12605550196',
    preferredOutboundCsNumberId: '+12605550196',
    summary: 'Closed thread requiring explicit same-thread reopen before outbound.',
  },
  '21f2866f-37ff-42da-80fc-0b5d2c3bc09d': {
    tenantId: 'tenant-connectshyft-ux-r4',
    orgUnitId: 'org-connectshyft-ux-r4-east',
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 1,
    nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
    neighborId: 'neighbor-connectshyft-ux-r4-pref-no-1004',
    lastInboundCsNumberId: '+12605550196',
    preferredOutboundCsNumberId: '+12605550196',
    summary: 'Unclaimed thread with prefers_texting=NO policy.',
  },
  'e37b00e0-228f-43c0-8c70-b3d0a5bfad40': {
    tenantId: 'tenant-connectshyft-ux-r4',
    orgUnitId: 'org-connectshyft-ux-r4-east',
    state: 'CLOSED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-ux-r4-pref-no-1005',
    lastInboundCsNumberId: '+12605550196',
    preferredOutboundCsNumberId: '+12605550196',
    summary: 'Closed thread with prefers_texting=NO policy.',
  },
  'thread-c5-unclaimed-1001': {
    tenantId: 'tenant-connectshyft-c5',
    orgUnitId: 'org-connectshyft-c5-east',
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
    neighborId: 'neighbor-connectshyft-c5-1001',
    lastInboundCsNumberId: '+12605550179',
    preferredOutboundCsNumberId: '+12605550179',
    summary: 'Unclaimed thread pending deterministic escalation evaluation',
  },
  'cc9bb30e-4b36-4419-8563-819432f4ba14': {
    tenantId: 'tenant-connectshyft-c4',
    orgUnitId: 'org-connectshyft-c4-east',
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 1,
    nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
    neighborId: 'neighbor-connectshyft-c4-pref-no-1004',
    lastInboundCsNumberId: '+12605550198',
    preferredOutboundCsNumberId: '+12605550198',
    summary: 'Unclaimed thread with prefers_texting=NO policy.',
  },
  '935eed99-c710-49e8-838d-ab25d02ca821': {
    tenantId: 'tenant-connectshyft-c4',
    orgUnitId: 'org-connectshyft-c4-east',
    state: 'CLOSED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-c4-pref-no-1005',
    lastInboundCsNumberId: '+12605550198',
    preferredOutboundCsNumberId: '+12605550198',
    summary: 'Closed thread with prefers_texting=NO policy.',
  },
  'thread-f1-unclaimed-1001': {
    tenantId: 'tenant-connectshyft-f1',
    orgUnitId: 'org-connectshyft-f1-east',
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
    neighborId: 'neighbor-connectshyft-f1-1001',
    lastInboundCsNumberId: '+12605550191',
    preferredOutboundCsNumberId: '+12605550191',
    summary: 'F1 unclaimed thread for provider adapter registry contracts.',
  },
  'thread-f1-claimed-1002': {
    tenantId: 'tenant-connectshyft-f1',
    orgUnitId: 'org-connectshyft-f1-east',
    state: 'CLAIMED',
    claimedByUserId: 'user-connectshyft-f1-other-operator',
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-f1-1002',
    lastInboundCsNumberId: '+12605550191',
    preferredOutboundCsNumberId: '+12605550191',
    summary: 'F1 claimed thread for provider disabled refusal validation.',
  },
  'thread-f1-closed-1003': {
    tenantId: 'tenant-connectshyft-f1',
    orgUnitId: 'org-connectshyft-f1-east',
    state: 'CLOSED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-f1-1003',
    lastInboundCsNumberId: '+12605550191',
    preferredOutboundCsNumberId: '+12605550191',
    summary: 'F1 closed thread for same-thread reopen provider dispatch validation.',
  },
  'thread-f2-unclaimed-1001': {
    tenantId: 'tenant-connectshyft-f2',
    orgUnitId: 'org-connectshyft-f2-east',
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 1,
    nextEvaluationAtUtc: '2026-03-01T00:00:00.000Z',
    neighborId: 'neighbor-connectshyft-f2-1001',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    summary: 'F2 unclaimed thread for canonical event model contracts.',
  },
  'thread-f2-claimed-1002': {
    tenantId: 'tenant-connectshyft-f2',
    orgUnitId: 'org-connectshyft-f2-east',
    state: 'CLAIMED',
    claimedByUserId: 'user-connectshyft-f2-other-operator',
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-f2-1002',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    summary: 'F2 claimed thread for canonical timeline validation.',
  },
  'thread-f2-closed-1003': {
    tenantId: 'tenant-connectshyft-f2',
    orgUnitId: 'org-connectshyft-f2-east',
    state: 'CLOSED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: null,
    neighborId: 'neighbor-connectshyft-f2-1003',
    lastInboundCsNumberId: '+12605550192',
    preferredOutboundCsNumberId: '+12605550192',
    summary: 'F2 closed thread for canonical timeline validation.',
  },
};
const CONNECTSHYFT_DYNAMIC_C5_THREAD_PREFIX = 'thread-c5-unclaimed-';
const CONNECTSHYFT_DYNAMIC_C5_THREAD_TEMPLATE_ID = 'thread-c5-unclaimed-1001';
const CONNECTSHYFT_COMMUNICATION_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const CONNECTSHYFT_WEBHOOK_RETRY_MAX_ATTEMPTS = 3;
const CONNECTSHYFT_WEBHOOK_RETRY_BASE_DELAY_MS = 60 * 1000;
const CONNECTSHYFT_WEBHOOK_RETRY_MAX_DELAY_MS = 15 * 60 * 1000;
const CONNECTSHYFT_NEIGHBOR_RING_TIMEOUT_MS = 30 * 1000;
const connectShyftNeighborRingTimeoutExecutionLedger = new Set<string>();

const loadPlatformDb = (): Knex => {
  const knexModule = require('../../../config/knex') as { default: Knex };
  return knexModule.default;
};

export const resetConnectShyftOutboundDispatchReplayLedgerForTests = (): void => {
  resetConnectShyftCommunicationReliabilityStateForTests();
  resetConnectShyftCommunicationAuditLogForTests();
  connectShyftNeighborRingTimeoutExecutionLedger.clear();
};

const connectShyftEscalationConfigService = new ConnectShyftEscalationConfigService(
  new KnexConnectShyftEscalationConfigStore(loadPlatformDb),
);
const connectShyftSmsPreferenceOverrideService = connectShyftSmsPreferenceOverrideServiceAsync;

const actorFromRequest = (req: Request): PlatformAdminActorContext => ({
  userId: req.user?.userId || null,
  baseRole: req.user?.role || null,
  headerRoles: [],
  activeTenantId: req.user?.activeTenantId || null,
});

const normalizeNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const resolveTenantIdFromRequest = async (req: Request): Promise<string | null> => {
  const directTenantCandidates = [
    req.user?.activeTenantId || null,
    req.user?.householdId || null,
    req.tenantContext?.tenantId || null,
    req.tenantId || null,
  ]
    .map((value) => normalizeNonEmptyString(value))
    .filter((value): value is string => value !== null)
    .filter((value) => UUID_PATTERN.test(value));

  if (directTenantCandidates.length > 0) {
    return directTenantCandidates[0];
  }

  const actorUserId = normalizeNonEmptyString(req.user?.userId || null);
  if (!actorUserId || !UUID_PATTERN.test(actorUserId)) {
    return null;
  }

  const membershipRows = await loadPlatformDb()
    .withSchema('platform')
    .table('tenant_memberships')
    .where('user_id', actorUserId)
    .select('tenant_id')
    .orderBy('tenant_id', 'asc')
    .limit(2);

  const membershipTenantIds = Array.from(
    new Set(
      membershipRows
        .map((row) => normalizeNonEmptyString((row as { tenant_id?: unknown }).tenant_id))
        .filter((value): value is string => value !== null && UUID_PATTERN.test(value)),
    ),
  );

  if (membershipTenantIds.length === 1) {
    return membershipTenantIds[0];
  }

  return null;
};

const resolveConnectShyftFallbackOrgUnitId = async (
  req: Request,
): Promise<string | null> => {
  if (req.tenantContext?.orgUnitId || req.orgUnitId || req.user?.activeOrgUnitId) {
    return null;
  }

  const actorUserId = req.user?.userId || null;
  const tenantId = await resolveTenantIdFromRequest(req);
  if (!actorUserId || !tenantId || !UUID_PATTERN.test(tenantId)) {
    return null;
  }

  const db = loadPlatformDb();

  const directMembershipRows = await db
    .withSchema('platform')
    .table('org_unit_memberships as om')
    .join('org_units as ou', 'ou.id', 'om.org_unit_id')
    .where('om.user_id', actorUserId)
    .andWhere('ou.tenant_id', tenantId)
    .select('om.org_unit_id as orgUnitId')
    .orderBy('om.org_unit_id', 'asc');

  const directMembershipOrgUnitIds = Array.from(
    new Set(
      directMembershipRows
        .map((row) => normalizeNonEmptyString((row as { orgUnitId?: unknown }).orgUnitId))
        .filter((value): value is string => value !== null),
    ),
  );

  if (directMembershipOrgUnitIds.length === 1) {
    return directMembershipOrgUnitIds[0];
  }

  if (directMembershipOrgUnitIds.length > 1) {
    return null;
  }

  const requestedRole = resolveConnectShyftRequestedRole(req);
  const isTenantPrivileged = hasCapability([requestedRole], CAPABILITIES.TENANT_READ_ALL);
  if (!isTenantPrivileged) {
    return null;
  }

  const tenantOrgUnitRows = await db
    .withSchema('platform')
    .table('org_units')
    .where('tenant_id', tenantId)
    .select('id')
    .orderBy('id', 'asc')
    .limit(2);

  if (tenantOrgUnitRows.length !== 1) {
    return null;
  }

  return normalizeNonEmptyString((tenantOrgUnitRows[0] as { id?: unknown }).id);
};

const resolveConnectShyftEnabledByOrgUnitOverride = async (
  req: Request,
  tenantId: string,
): Promise<boolean> => {
  if (!UUID_PATTERN.test(tenantId)) {
    return false;
  }

  const directOrgUnitCandidates = [
    req.tenantContext?.orgUnitId || null,
    req.orgUnitId || null,
    req.user?.activeOrgUnitId || null,
  ]
    .map((value) => normalizeNonEmptyString(value))
    .filter((value): value is string => value !== null && UUID_PATTERN.test(value));

  const actorUserId = normalizeNonEmptyString(req.user?.userId || null);
  const membershipOrgUnitIds = actorUserId && UUID_PATTERN.test(actorUserId)
    ? (
      await loadPlatformDb()
        .withSchema('platform')
        .table('org_unit_memberships as om')
        .join('org_units as ou', 'ou.id', 'om.org_unit_id')
        .where('om.user_id', actorUserId)
        .andWhere('ou.tenant_id', tenantId)
        .select('om.org_unit_id as orgUnitId')
        .orderBy('om.org_unit_id', 'asc')
    )
      .map((row) => normalizeNonEmptyString((row as { orgUnitId?: unknown }).orgUnitId))
      .filter((value): value is string => value !== null && UUID_PATTERN.test(value))
    : [];

  const scopedOrgUnitIds = Array.from(new Set([...directOrgUnitCandidates, ...membershipOrgUnitIds]));
  if (scopedOrgUnitIds.length === 0) {
    return false;
  }

  const enabledOverride = await loadPlatformDb()
    .withSchema('platform')
    .table('org_unit_module_overrides')
    .where('tenant_id', tenantId)
    .andWhere('module_key', 'connectshyft')
    .whereIn('org_unit_id', scopedOrgUnitIds)
    .andWhere('enabled', true)
    .first(['id']);

  return Boolean(enabledOverride);
};

const TEST_TENANT_OVERRIDE_HEADER = 'x-test-connectshyft-tenant-id';

const shouldBypassTestHarnessEntitlementLookup = (req: Request, tenantId: string): boolean => {
  if (!isConnectShyftTestOverrideEnabled()) {
    return false;
  }

  if (!UUID_PATTERN.test(tenantId)) {
    return true;
  }

  const testTenantOverride = req.header(TEST_TENANT_OVERRIDE_HEADER);
  return typeof testTenantOverride === 'string' && testTenantOverride.trim().length > 0;
};

const resolveEntitlementAwareConnectShyftFlags = async (
  req: Request,
): Promise<{ flags: ConnectShyftFeatureFlags; entitlementDecision: Awaited<ReturnType<typeof evaluateActorTenantModuleEntitlement>> | null }> => {
  const resolvedFlags = resolveConnectShyftFeatureFlags(req);
  const tenantId = await resolveTenantIdFromRequest(req);
  if (!tenantId) {
    return {
      flags: resolvedFlags,
      entitlementDecision: null,
    };
  }

  if (shouldBypassTestHarnessEntitlementLookup(req, tenantId)) {
    return {
      flags: resolvedFlags,
      entitlementDecision: null,
    };
  }

  const entitlementDecision = await evaluateActorTenantModuleEntitlement(
    loadPlatformDb(),
    actorFromRequest(req),
    tenantId,
    'connectshyft',
  );
  const orgUnitScopedEnablement = await resolveConnectShyftEnabledByOrgUnitOverride(req, tenantId);
  const moduleEnabled = entitlementDecision.enabled || orgUnitScopedEnablement;

  return {
    flags: mergeConnectShyftFlagsWithEntitlement(resolvedFlags, {
      moduleEnabled,
    }),
    entitlementDecision,
  };
};

const enforceCapability = async (
  req: Request,
  res: Response,
  capability: ConnectShyftCapability,
): Promise<ConnectShyftFeatureFlags | null> => {
  const { flags, entitlementDecision } = await resolveEntitlementAwareConnectShyftFlags(req);
  const evaluation = evaluateConnectShyftCapability(flags, capability);
  if (evaluation.ok) {
    return flags;
  }

  const moduleDeniedByEntitlement =
    evaluation.code === 'CONNECTSHYFT_MODULE_DISABLED'
    && entitlementDecision
    && !entitlementDecision.enabled;

  refusal(res, {
    code: moduleDeniedByEntitlement ? entitlementDecision.refusalCode : evaluation.code,
    message: moduleDeniedByEntitlement ? entitlementDecision.message : evaluation.message,
    refusalType: evaluation.refusalType,
    httpStatus: 200,
    data: moduleDeniedByEntitlement
      ? {
        moduleKey: entitlementDecision.moduleKey,
        tenantId: entitlementDecision.tenantId,
        reason: entitlementDecision.reason,
      }
      : undefined,
  });
  return null;
};

const enforceOrgUnitContext = async (
  req: Request,
  res: Response,
  attemptedOrgUnitId?: string | null,
) => {
  const fallbackOrgUnitId = await resolveConnectShyftFallbackOrgUnitId(req);
  if (fallbackOrgUnitId) {
    req.orgUnitId = fallbackOrgUnitId;
    req.tenantContext = {
      tenantId: req.tenantContext?.tenantId || req.tenantId || req.user?.activeTenantId || 'public',
      orgUnitId: fallbackOrgUnitId,
      scopeMode: 'ORG_UNIT',
      source: req.tenantContext?.source || 'auth',
    };
  }

  const decision = await resolveConnectShyftOrgUnitContext(req, {
    attemptedOrgUnitId,
    resolveOrgUnitAccess: async ({ tenantId, orgUnitId, userId, baseRoles }) =>
      validateOrgUnitScopedAccess(
        createKnexOrgUnitAccessStore(loadPlatformDb()),
        {
          tenantId,
          orgUnitId,
          userId,
          baseRoles,
        },
      ),
  });

  if (decision.ok) {
    return decision.context;
  }

  refusal(res, {
    code: decision.code,
    message: decision.message,
    refusalType: decision.refusalType,
    httpStatus: decision.httpStatus,
  });
  return null;
};

const resolveConnectShyftRequestedRole = (req: Request): string | null => {
  const normalizeConnectShyftRequestedRole = (inputRole: unknown): string | null => {
    if (typeof inputRole !== 'string' || inputRole.trim().length === 0) {
      return null;
    }

    const normalizedBaseRole = inputRole.trim();
    const legacyAlias = CONNECTSHYFT_LEGACY_ROLE_ALIASES[normalizedBaseRole.toLowerCase()];
    if (legacyAlias) {
      return legacyAlias;
    }

    return normalizedBaseRole;
  };

  if (isConnectShyftTestOverrideEnabled()) {
    const testOverrideRole = req.header('x-test-connectshyft-role');
    const resolvedOverrideRole = normalizeConnectShyftRequestedRole(testOverrideRole);
    if (resolvedOverrideRole) {
      return resolvedOverrideRole;
    }
  }

  return normalizeConnectShyftRequestedRole(req.user?.role);
};

const resolveConnectShyftRequestedActorUserId = (req: Request): string | null => {
  if (isConnectShyftTestOverrideEnabled()) {
    const testOverrideUserId = req.header(TEST_USER_ID_HEADER);
    if (typeof testOverrideUserId === 'string') {
      const normalizedOverrideUserId = testOverrideUserId.trim();
      return normalizedOverrideUserId.length > 0 ? normalizedOverrideUserId : null;
    }
  }

  if (typeof req.user?.userId === 'string') {
    const normalizedActorUserId = req.user.userId.trim();
    return normalizedActorUserId.length > 0 ? normalizedActorUserId : null;
  }

  return null;
};

const normalizeLifecycleString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const buildProviderNeutralBridgeSessionState = (aggregate: {
  session: {
    id: string;
    status: string;
    failureCode?: string | null;
    failureMessage?: string | null;
  };
  operatorLeg: {
    id: string;
    status: string;
    failureCode?: string | null;
    failureMessage?: string | null;
  };
  neighborLeg: {
    id: string;
    status: string;
    failureCode?: string | null;
    failureMessage?: string | null;
  };
}): ConnectShyftBridgeSessionStateContract => ({
  bridgeSessionId: aggregate.session.id,
  status: aggregate.session.status,
  sessionState: aggregate.session.status,
  failureCode: normalizeLifecycleString(aggregate.session.failureCode) || null,
  failureMessage: normalizeLifecycleString(aggregate.session.failureMessage) || null,
  operatorLegState: aggregate.operatorLeg.status,
  neighborLegState: aggregate.neighborLeg.status,
  operatorLeg: {
    legId: aggregate.operatorLeg.id,
    status: aggregate.operatorLeg.status,
    failureCode: normalizeLifecycleString(aggregate.operatorLeg.failureCode) || null,
    failureMessage: normalizeLifecycleString(aggregate.operatorLeg.failureMessage) || null,
  },
  neighborLeg: {
    legId: aggregate.neighborLeg.id,
    status: aggregate.neighborLeg.status,
    failureCode: normalizeLifecycleString(aggregate.neighborLeg.failureCode) || null,
    failureMessage: normalizeLifecycleString(aggregate.neighborLeg.failureMessage) || null,
  },
});

type ConnectShyftBridgeCorrelationMapping = {
  deterministic: true;
  operatorLegMapping: 'created' | 'duplicate' | 'ignored' | 'error';
  neighborLegMapping: 'created' | 'duplicate' | 'ignored' | 'error';
  error: {
    code: 'CONNECTSHYFT_PROVIDER_CORRELATION_PERSISTENCE_UNAVAILABLE';
    message: string;
  } | null;
};

type ConnectShyftBridgeSessionStateContract = {
  bridgeSessionId: string;
  status: string;
  sessionState: string;
  failureCode: string | null;
  failureMessage: string | null;
  operatorLegState: string;
  neighborLegState: string;
  operatorLeg: {
    legId: string;
    status: string;
    failureCode: string | null;
    failureMessage: string | null;
  };
  neighborLeg: {
    legId: string;
    status: string;
    failureCode: string | null;
    failureMessage: string | null;
  };
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const resolveBridgeSessionVoicemailFallbackState = (aggregate: {
  session: unknown;
} | null): {
  voicemailFallbackStartedAtUtc: string | null;
  voicemailArtifactId: string | null;
  voicemailRecordingStatus: string | null;
} => {
  const sessionRecord = asRecord(aggregate?.session);

  return {
    voicemailFallbackStartedAtUtc: normalizeLifecycleString(sessionRecord?.voicemailFallbackStartedAtUtc) || null,
    voicemailArtifactId: normalizeLifecycleString(sessionRecord?.voicemailArtifactId) || null,
    voicemailRecordingStatus: normalizeLifecycleString(sessionRecord?.voicemailRecordingStatus) || null,
  };
};

const normalizeRoutingSlug = (value: string): string => {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'unknown';
};

const resolveExistingActiveThreadIdForScope = async (input: {
  tenantId: string;
  orgUnitId: string;
  neighborId: string;
}): Promise<string | null> => {
  if (!input.neighborId) {
    return null;
  }

  try {
    const row = await loadPlatformDb()
      .withSchema('connectshyft')
      .table('cs_threads')
      .where({
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        neighbor_id: input.neighborId,
      })
      .whereNot('state', 'CLOSED')
      .orderBy('created_at_utc', 'asc')
      .orderBy('id', 'asc')
      .first<{ id: string }>(['id']);

    return normalizeLifecycleString(row?.id) || null;
  } catch (_error) {
    return null;
  }
};

const resolveInboundAlignedProviderNumber = async (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string | null;
  providerNumberE164: string | null;
  loadThread?: () => Promise<ConnectShyftThread | null>;
}): Promise<
  | {
    ok: true;
    providerNumberE164: string;
  }
  | {
    ok: false;
    code: 'CONNECTSHYFT_SMS_SENDER_REQUIRED' | 'CONNECTSHYFT_SMS_SENDER_AMBIGUOUS';
    message: string;
    reason:
      | 'sender_alignment_missing'
      | 'sender_mapping_missing'
      | 'sender_mapping_ambiguous'
      | 'sender_scope_mismatch';
  }
> => {
  const candidateProviderNumberE164 = normalizeLifecycleString(input.providerNumberE164 || null) || null;

  if (candidateProviderNumberE164) {
    const mapping = await connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber({
      tenantId: input.tenantId,
      twilioNumberE164: candidateProviderNumberE164,
    });

    if (mapping.status === 'found' && mapping.mapping.orgUnitId === input.orgUnitId) {
      return {
        ok: true,
        providerNumberE164: mapping.mapping.twilioNumberE164,
      };
    }

    if (mapping.status === 'ambiguous') {
      return {
        ok: false,
        code: 'CONNECTSHYFT_SMS_SENDER_AMBIGUOUS',
        message: 'Inbound SMS sender number is ambiguous across scoped provider mappings.',
        reason: 'sender_mapping_ambiguous',
      };
    }

    return {
      ok: false,
      code: 'CONNECTSHYFT_SMS_SENDER_REQUIRED',
      message: mapping.status === 'found'
        ? 'Inbound SMS sender number resolved outside the active orgUnit scope.'
        : 'Inbound SMS sender number does not map to an active scoped provider number.',
      reason: mapping.status === 'found'
        ? 'sender_scope_mismatch'
        : 'sender_mapping_missing',
    };
  }

  const threadId = normalizeLifecycleString(input.threadId || null);
  if (!threadId) {
    return {
      ok: false,
      code: 'CONNECTSHYFT_SMS_SENDER_REQUIRED',
      message: 'Inbound SMS alignment requires a mapped provider number.',
      reason: 'sender_alignment_missing',
    };
  }

  const resolution = await resolveSenderNumber({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    threadId,
    channel: 'sms',
  }, input.loadThread
    ? {
      loadThread: async () => input.loadThread ? input.loadThread() : null,
    }
    : undefined);

  if (!resolution.ok) {
    return {
      ok: false,
      code: resolution.reason === 'sender_mapping_ambiguous'
        ? 'CONNECTSHYFT_SMS_SENDER_AMBIGUOUS'
        : 'CONNECTSHYFT_SMS_SENDER_REQUIRED',
      message: resolution.message,
      reason:
        resolution.reason === 'sender_mapping_ambiguous'
          ? 'sender_mapping_ambiguous'
          : resolution.reason === 'sender_scope_mismatch'
            ? 'sender_scope_mismatch'
            : resolution.reason === 'sender_mapping_missing'
              ? 'sender_mapping_missing'
              : 'sender_alignment_missing',
    };
  }

  return {
    ok: true,
    providerNumberE164: resolution.providerNumberE164,
  };
};

const verifyConnectedCallLineage = async (input: {
  correlation: Extract<ConnectShyftResolvedWebhookCorrelation, { ok: true }>;
  providerName: string;
}): Promise<boolean> => {
  const providerLegId = normalizeLifecycleString(input.correlation.providerLegId);
  if (!providerLegId) {
    return false;
  }

  const lookup = await resolveConnectShyftProviderCorrelationByIdentifiers({
    providerName: input.providerName,
    providerLegId,
    tenantId: input.correlation.tenantId,
    db: loadPlatformDb(),
  });
  if (!lookup.ok) {
    return false;
  }

  return (
    lookup.correlation.tenantId === input.correlation.tenantId
    && lookup.correlation.orgUnitId === input.correlation.orgUnitId
    && lookup.correlation.threadId === input.correlation.threadId
  );
};

const nowIsoUtc = (): string => new Date().toISOString();

const persistConnectShyftBridgeLegProviderCallControlIdIfPresentAsync = async (
  input: {
    bridgeSessionId: string;
    tenantId: string;
    orgUnitId: string;
    legRole: 'operator' | 'neighbor';
    providerCallControlId: string | null | undefined;
  },
): Promise<void> => {
  const providerCallControlId = normalizeLifecycleString(input.providerCallControlId);
  if (!providerCallControlId) {
    return;
  }

  await setConnectShyftBridgeLegProviderCallControlIdAsync({
    bridgeSessionId: input.bridgeSessionId,
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    legRole: input.legRole,
    providerCallControlId,
  });
};

const persistConnectShyftNeighborRingStartedAtIfNeededAsync = async (
  input: {
    bridgeSessionId: string;
    tenantId: string;
    orgUnitId: string;
    neighborLegState: string | null | undefined;
    neighborProviderLegId: string | null | undefined;
  },
): Promise<void> => {
  if (normalizeLifecycleString(input.neighborLegState) !== 'ringing') {
    return;
  }

  if (!normalizeLifecycleString(input.neighborProviderLegId)) {
    return;
  }

  await updateConnectShyftBridgeSessionVoicemailFallbackAsync({
    bridgeSessionId: input.bridgeSessionId,
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    neighborRingStartedAtUtc: nowIsoUtc(),
  });
};

async function executeConnectShyftNeighborRingTimeoutAsync(input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  bridgeSessionId: string;
  neighborProviderLegId: string | null;
}): Promise<{
  handled: boolean;
  aggregate: ConnectShyftBridgeSessionAggregate | null;
}> {
  const aggregate = await loadConnectShyftBridgeAggregateBySessionId(input.bridgeSessionId);
  if (!aggregate) {
    return {
      handled: false,
      aggregate: null,
    };
  }

  if (
    aggregate.session.tenantId !== input.tenantId
    || aggregate.session.orgUnitId !== input.orgUnitId
    || aggregate.session.threadId !== input.threadId
  ) {
    return {
      handled: false,
      aggregate,
    };
  }

  const voicemailFallbackState = resolveBridgeSessionVoicemailFallbackState(aggregate);
  if (
    voicemailFallbackState.voicemailFallbackStartedAtUtc
    || voicemailFallbackState.voicemailArtifactId
    || voicemailFallbackState.voicemailRecordingStatus === 'completed'
  ) {
    return {
      handled: false,
      aggregate,
    };
  }

  if (connectShyftNeighborRingTimeoutExecutionLedger.has(input.bridgeSessionId)) {
    return {
      handled: false,
      aggregate,
    };
  }

  if (aggregate.voicemailLeg) {
    return {
      handled: false,
      aggregate,
    };
  }

  const neighborProviderLegId = normalizeLifecycleString(input.neighborProviderLegId);
  const persistedNeighborProviderLegId = normalizeLifecycleString(aggregate.neighborLeg.providerCallId);
  if (neighborProviderLegId && persistedNeighborProviderLegId && neighborProviderLegId !== persistedNeighborProviderLegId) {
    return {
      handled: false,
      aggregate,
    };
  }

  if (normalizeLifecycleString(aggregate.session.status) === 'bridged') {
    return {
      handled: false,
      aggregate,
    };
  }

  if (normalizeLifecycleString(aggregate.neighborLeg.status) !== 'ringing') {
    return {
      handled: false,
      aggregate,
    };
  }

  const timeoutRecordedAtUtc = nowIsoUtc();
  const updatedAggregate = await updateConnectShyftBridgeSessionVoicemailFallbackAsync({
    bridgeSessionId: input.bridgeSessionId,
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    neighborTimeoutAtUtc: timeoutRecordedAtUtc,
    voicemailFallbackStartedAtUtc: timeoutRecordedAtUtc,
    voicemailRecordingStatus: 'pending',
  });

  if (!updatedAggregate) {
    return {
      handled: false,
      aggregate,
    };
  }

  connectShyftNeighborRingTimeoutExecutionLedger.add(input.bridgeSessionId);

  const providerSelectionRequestHeaders = {
    'x-test-connectshyft-tenant-id': input.tenantId,
    'x-test-connectshyft-orgunit-id': input.orgUnitId,
    'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx']),
  };
  const providerSelection = resolveConnectShyftProviderAdapter({
    req: {
      body: {
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        providerKey: 'telnyx',
      },
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      headers: providerSelectionRequestHeaders,
      header(name: string): string | undefined {
        return providerSelectionRequestHeaders[name.toLowerCase() as keyof typeof providerSelectionRequestHeaders];
      },
    },
    requestedProvider: 'telnyx',
    operation: 'call',
  });

  if (!providerSelection.ok) {
    const failedAggregate = await updateConnectShyftBridgeSessionVoicemailFallbackAsync({
      bridgeSessionId: input.bridgeSessionId,
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      voicemailRecordingStatus: 'failed',
    });
    return {
      handled: true,
      aggregate: failedAggregate || updatedAggregate,
    };
  }

  try {
    const startBridgeOutboundCall = providerSelection.adapter.startBridgeOutboundCall;
    if (!startBridgeOutboundCall) {
      const failedAggregate = await updateConnectShyftBridgeSessionVoicemailFallbackAsync({
        bridgeSessionId: input.bridgeSessionId,
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        voicemailRecordingStatus: 'failed',
      });
      return {
        handled: true,
        aggregate: failedAggregate || updatedAggregate,
      };
    }

    const voicemailLegDispatch = await startBridgeOutboundCall({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      threadId: input.threadId,
      providerKey: providerSelection.providerResolution.resolvedProvider,
      bridgeSessionId: input.bridgeSessionId,
      legId: `voicemail-leg-${input.bridgeSessionId}`,
      legRole: 'voicemail',
      targetPhone: updatedAggregate.neighborLeg.contactPointId,
      fromContactPointId: updatedAggregate.session.selectedOutboundContactPointId ?? null,
    });
    const persistedAggregate = await setConnectShyftBridgeLegProviderCallControlIdAsync({
      bridgeSessionId: input.bridgeSessionId,
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      legRole: 'voicemail',
      providerCallControlId: voicemailLegDispatch.providerLegId || '',
    });

    return {
      handled: true,
      aggregate: persistedAggregate || updatedAggregate,
    };
  } catch (_error) {
    const failedAggregate = await updateConnectShyftBridgeSessionVoicemailFallbackAsync({
      bridgeSessionId: input.bridgeSessionId,
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      voicemailRecordingStatus: 'failed',
    });
    return {
      handled: true,
      aggregate: failedAggregate || updatedAggregate,
    };
  }
}

async function attachConnectShyftOutboundVoicemailRecordingAsync(input: {
  tenantId: string;
  orgUnitId: string;
  providerEventId: string;
  providerLegId: string | null;
  recordingUrl: string;
}): Promise<{
  handled: boolean;
  bridgeSession: ConnectShyftBridgeSessionAggregate | null;
  voicemailArtifactId: string | null;
}> {
  const providerEventId = normalizeLifecycleString(input.providerEventId);
  const providerLegId = normalizeLifecycleString(input.providerLegId);
  const recordingUrl = normalizeLifecycleString(input.recordingUrl);

  if (!providerEventId || !providerLegId || !recordingUrl) {
    return {
      handled: false,
      bridgeSession: null,
      voicemailArtifactId: null,
    };
  }

  const bridgeSession = await findConnectShyftBridgeSessionByProviderCallControlIdAsync({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    providerCallControlId: providerLegId,
  });
  if (!bridgeSession) {
    return {
      handled: false,
      bridgeSession: null,
      voicemailArtifactId: null,
    };
  }

  if (bridgeSession.voicemailLeg?.providerCallControlId !== providerLegId) {
    return {
      handled: true,
      bridgeSession,
      voicemailArtifactId: null,
    };
  }

  const voicemailFallbackState = resolveBridgeSessionVoicemailFallbackState(bridgeSession);
  if (
    voicemailFallbackState.voicemailArtifactId
    || voicemailFallbackState.voicemailRecordingStatus === 'completed'
  ) {
    return {
      handled: true,
      bridgeSession,
      voicemailArtifactId: null,
    };
  }

  const voicemailArtifact = buildConnectShyftOutboundVoicemailArtifact({
    threadId: bridgeSession.session.threadId,
    providerEventId,
    providerLegId,
    recordingUrl,
  });
  const updatedBridgeSession = await updateConnectShyftBridgeSessionVoicemailFallbackAsync({
    bridgeSessionId: bridgeSession.session.id,
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    voicemailArtifactId: voicemailArtifact.artifactId,
    voicemailRecordingUrl: voicemailArtifact.recordingUrl,
    voicemailRecordingStatus: 'completed',
    voicemailProviderEventId: providerEventId,
    voicemailProviderLegId: providerLegId,
  });

  return {
    handled: true,
    bridgeSession: updatedBridgeSession || bridgeSession,
    voicemailArtifactId: voicemailArtifact.artifactId,
  };
}

async function scheduleConnectShyftNeighborRingTimeoutAsync(input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  bridgeSessionId: string;
  neighborProviderLegId: string | null;
  timeoutMs: number;
}): Promise<void> {
  const bridgeSessionId = normalizeLifecycleString(input.bridgeSessionId);
  const neighborProviderLegId = normalizeLifecycleString(input.neighborProviderLegId);
  if (!bridgeSessionId || !neighborProviderLegId) {
    return;
  }

  const timeoutMs = Number.isFinite(input.timeoutMs) && input.timeoutMs >= 0
    ? input.timeoutMs
    : CONNECTSHYFT_NEIGHBOR_RING_TIMEOUT_MS;

  const timer = globalThis.setTimeout(() => {
    void executeConnectShyftNeighborRingTimeoutAsync({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      threadId: input.threadId,
      bridgeSessionId,
      neighborProviderLegId,
    }).catch((error: unknown) => {
      logger.error('ConnectShyft neighbor ring timeout execution failed', {
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        threadId: input.threadId,
        bridgeSessionId,
        neighborProviderLegId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, timeoutMs);

  timer.unref?.();
}

const resolveLifecycleEventName = (
  action: ConnectShyftLifecycleAction,
): string => {
  if (action === 'claim') {
    return CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.claimed;
  }
  if (action === 'takeover') {
    return CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.takenOver;
  }
  return CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.closed;
};

const resolveSyntheticLifecycleThread = (
  input: {
    threadId: string;
    tenantId: string;
    orgUnitId: string;
  },
): ConnectShyftSyntheticThreadDescriptor | null => {
  const existing = CONNECTSHYFT_SYNTHETIC_LIFECYCLE_THREADS[input.threadId];
  if (existing) {
    if (
      existing.tenantId !== input.tenantId
      || existing.orgUnitId !== input.orgUnitId
    ) {
      return null;
    }
    return existing;
  }

  if (!UUID_PATTERN.test(input.threadId)) {
    const seededThreadDetail = resolveConnectShyftThreadDetailContract({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      threadId: input.threadId,
    });

    if (seededThreadDetail) {
      const seededDescriptor: ConnectShyftSyntheticThreadDescriptor = {
        tenantId: seededThreadDetail.tenantId,
        orgUnitId: seededThreadDetail.orgUnitId,
        state: seededThreadDetail.state,
        claimedByUserId: seededThreadDetail.claimedByUserId,
        escalationStage: seededThreadDetail.escalationStage,
        nextEvaluationAtUtc: seededThreadDetail.state === 'UNCLAIMED'
          ? seededThreadDetail.lastActivityAtUtc
          : null,
        neighborId: `neighbor-${seededThreadDetail.threadId}`,
        lastInboundCsNumberId: seededThreadDetail.lastInboundCsNumberId,
        preferredOutboundCsNumberId: seededThreadDetail.preferredOutboundCsNumberId,
        summary: seededThreadDetail.summary,
      };

      CONNECTSHYFT_SYNTHETIC_LIFECYCLE_THREADS[input.threadId] = seededDescriptor;
      return seededDescriptor;
    }
  }

  if (!input.threadId.startsWith(CONNECTSHYFT_DYNAMIC_C5_THREAD_PREFIX)) {
    return null;
  }

  const template = CONNECTSHYFT_SYNTHETIC_LIFECYCLE_THREADS[CONNECTSHYFT_DYNAMIC_C5_THREAD_TEMPLATE_ID];
  if (!template) {
    return null;
  }

  const dynamicDescriptor: ConnectShyftSyntheticThreadDescriptor = {
    ...template,
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    state: 'UNCLAIMED',
    claimedByUserId: null,
    escalationStage: 0,
    nextEvaluationAtUtc: template.nextEvaluationAtUtc,
    neighborId: `neighbor-${input.threadId}`,
  };

  CONNECTSHYFT_SYNTHETIC_LIFECYCLE_THREADS[input.threadId] = dynamicDescriptor;
  return dynamicDescriptor;
};

const updateSyntheticLifecycleThread = (thread: ConnectShyftThread): void => {
  // Keep synthetic fixtures deterministic across Playwright/Jest request sequences.
  // Story c.5 scheduler contracts require synthetic thread progression to persist.
  if (
    isConnectShyftTestOverrideEnabled()
    && !thread.threadId.startsWith('thread-c5-')
  ) {
    return;
  }

  const descriptor = CONNECTSHYFT_SYNTHETIC_LIFECYCLE_THREADS[thread.threadId];
  if (!descriptor) {
    return;
  }

  descriptor.state = thread.state;
  descriptor.claimedByUserId = thread.claimedByUserId;
  descriptor.escalationStage = thread.escalation.stage;
  descriptor.nextEvaluationAtUtc = thread.escalation.nextEvaluationAtUtc;
  descriptor.neighborId = thread.neighborId;
  descriptor.lastInboundCsNumberId = thread.lastInboundCsNumberId;
  descriptor.preferredOutboundCsNumberId = thread.preferredOutboundCsNumberId;
};

const buildSyntheticThread = (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  currentState: ConnectShyftThreadState;
  nextState: ConnectShyftThreadState;
  actorUserId: string | null;
  fallbackSummary?: string;
  fallbackNeighborId?: string;
  fallbackLastInboundCsNumberId?: string;
  fallbackPreferredOutboundCsNumberId?: string;
  fallbackEscalationStage?: number;
  fallbackNextEvaluationAtUtc?: string | null;
}): ConnectShyftThread => {
  const now = nowIsoUtc();
  const actorUserId = normalizeLifecycleString(input.actorUserId) || null;
  const fallbackEscalationStage = Number.isFinite(input.fallbackEscalationStage)
    ? Math.max(0, Math.trunc(input.fallbackEscalationStage as number))
    : 0;
  const fallbackNextEvaluationAtUtc = normalizeLifecycleString(input.fallbackNextEvaluationAtUtc || null) || null;
  const isReopened = input.currentState === 'CLOSED' && input.nextState === 'UNCLAIMED';
  const isNoopState = input.currentState === input.nextState;
  const escalationStage = isReopened
    ? 0
    : isNoopState
      ? fallbackEscalationStage
      : input.nextState === 'UNCLAIMED' || input.nextState === 'CLAIMED'
        ? 0
        : fallbackEscalationStage;
  const nextEvaluationAtUtc = input.nextState === 'UNCLAIMED'
    ? (
      isNoopState
        ? (fallbackNextEvaluationAtUtc || now)
        : now
    )
    : null;

  return {
    threadId: input.threadId,
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    neighborId: input.fallbackNeighborId || `neighbor-${input.threadId}`,
    source: 'VOICE',
    state: input.nextState,
    lastInboundCsNumberId: input.fallbackLastInboundCsNumberId || '',
    preferredOutboundCsNumberId: input.fallbackPreferredOutboundCsNumberId || '',
    claimedByUserId: input.nextState === 'CLAIMED' ? actorUserId : null,
    claimedAtUtc: input.nextState === 'CLAIMED' ? now : null,
    closedByUserId: input.nextState === 'CLOSED' ? actorUserId : null,
    closedAtUtc: input.nextState === 'CLOSED' ? now : null,
    createdAtUtc: now,
    updatedAtUtc: now,
    escalation: {
      stage: escalationStage,
      nextEvaluationAtUtc,
    },
  } as ConnectShyftThread;
};

const buildLifecycleThreadResponse = (
  thread: ConnectShyftThread,
): ConnectShyftThread & { escalationStage: number; nextEvaluationAtUtc: string | null } => ({
  ...thread,
  escalationStage: thread.escalation.stage,
  nextEvaluationAtUtc: thread.escalation.nextEvaluationAtUtc,
});

const buildThreadFromDetailRecord = (
  detail: ConnectShyftThreadDetailRecord,
  input: {
    neighborId?: string | null;
  } = {},
): ConnectShyftThread => {
  const now = nowIsoUtc();
  const normalizedNeighborId = normalizeConnectShyftNeighborIdentifier(input.neighborId || '');
  const neighborId = normalizedNeighborId && isValidConnectShyftNeighborIdentifier(normalizedNeighborId)
    ? normalizedNeighborId
    : '';

  return {
    threadId: detail.threadId,
    tenantId: detail.tenantId,
    orgUnitId: detail.orgUnitId,
    neighborId,
    source: 'VOICE',
    state: detail.state,
    lastInboundCsNumberId: detail.lastInboundCsNumberId,
    preferredOutboundCsNumberId: detail.preferredOutboundCsNumberId,
    claimedByUserId: detail.claimedByUserId,
    claimedAtUtc: null,
    closedByUserId: null,
    closedAtUtc: null,
    createdAtUtc: now,
    updatedAtUtc: now,
    escalation: {
      stage: detail.escalationStage,
      nextEvaluationAtUtc: detail.state === 'UNCLAIMED' ? now : null,
    },
  } as ConnectShyftThread;
};

const buildSyntheticThreadDetailRecord = (input: {
  descriptor: ConnectShyftSyntheticThreadDescriptor;
  threadId: string;
  actorUserId: string | null;
  requestedRole: string | null;
}): ConnectShyftThreadDetailRecord => {
  const actorUserId = normalizeLifecycleString(input.actorUserId) || null;
  const bucket = input.descriptor.state === 'CLAIMED'
    && actorUserId
    && input.descriptor.claimedByUserId === actorUserId
    ? 'mine'
    : 'inbox';
  const escalationStage = Math.max(0, Math.trunc(input.descriptor.escalationStage));
  const urgencyLabel = escalationStage <= 0
    ? ''
    : escalationStage === 1
      ? 'Needs attention soon'
      : 'Needs urgent attention';
  const summary = normalizeLifecycleString(input.descriptor.summary) || 'Conversation in progress.';
  const preview = summary === 'Conversation in progress.'
    ? 'Latest incoming message is ready for review.'
    : `Latest update: ${summary}`;
  const stateLabel = input.descriptor.state === 'UNCLAIMED'
    ? 'Unclaimed'
    : input.descriptor.state === 'CLAIMED'
      ? 'Claimed'
      : 'Closed';
  const outboundContextLabel = 'Provider-neutral dispatch line';
  const inboundContextLabel = input.descriptor.lastInboundCsNumberId
    ? 'cs-number inbound line configured'
    : 'Inbound line unavailable';

  return {
    threadId: input.threadId,
    neighborId: input.descriptor.neighborId || null,
    personId: null,
    identityState: null,
    subjectContext: {
      orgUnitId: input.descriptor.orgUnitId,
    },
    neighborDeleted: false,
    neighbor_deleted: false,
    neighborDeletedAtUtc: null,
    neighbor_deleted_at_utc: null,
    tenantId: input.descriptor.tenantId,
    orgUnitId: input.descriptor.orgUnitId,
    state: input.descriptor.state,
    claimedByUserId: input.descriptor.claimedByUserId,
    claimed_by_user_id: input.descriptor.claimedByUserId,
    bucket,
    escalationStage,
    isNewUnread: false,
    priorityRank: escalationStage >= 3 ? 1 : escalationStage === 2 ? 2 : escalationStage === 1 ? 3 : 5,
    urgencyLabel,
    lastActivityAtUtc: input.descriptor.nextEvaluationAtUtc || nowIsoUtc(),
    lastInboundCsNumberId: input.descriptor.lastInboundCsNumberId,
    last_inbound_cs_number_id: input.descriptor.lastInboundCsNumberId,
    preferredOutboundCsNumberId: input.descriptor.preferredOutboundCsNumberId,
    preferred_outbound_cs_number_id: input.descriptor.preferredOutboundCsNumberId,
    preferredOutboundContext: {
      csNumberId: input.descriptor.preferredOutboundCsNumberId,
      label: outboundContextLabel,
    },
    preferred_outbound_context: {
      cs_number_id: input.descriptor.preferredOutboundCsNumberId,
      label: outboundContextLabel,
    },
    voicemailIndicator: false,
    voicemailLabel: null,
    summary,
    display: {
      title: summary,
      preview,
      urgencyLabel: urgencyLabel || 'New conversation',
      stateLabel,
      inboundContext: inboundContextLabel,
      outboundContext: outboundContextLabel,
      neighborContext: `Neighbor context: ${summary}`,
      conferenceContext: `Conference context: ${outboundContextLabel}`,
      claimContext: input.descriptor.state === 'UNCLAIMED'
        ? 'Claim context: Unclaimed conversation'
        : input.descriptor.state === 'CLAIMED'
          ? 'Claim context: Claimed conversation'
          : 'Claim context: Closed conversation',
      voicemailLabel: '',
    },
    actions: resolveConnectShyftThreadActions(input.descriptor.state),
    lifecycle: {
      reopenedByInbound: false,
    },
  };
};


const parseThreadIdParam = (req: Request): string => {
  if (typeof req.params.threadId !== 'string') {
    return '';
  }

  return req.params.threadId.trim();
};

const parseLifecycleReason = (req: Request): string | null => {
  const reason = normalizeLifecycleString(req.body?.reason);
  return reason || null;
};

const parseLifecycleResolution = (req: Request): string | null => {
  const resolution = normalizeLifecycleString(req.body?.resolution);
  return resolution || null;
};

const buildLifecycleMetadata = (input: {
  tenantId: string;
  orgUnitId: string;
  actorUserId: string | null;
  threadId: string;
  priorState: ConnectShyftThreadState;
  newState: ConnectShyftThreadState;
  action: string;
  reason?: string | null;
  resolution?: string | null;
  threadReopenedByUser?: string | null;
  lifecycleLineage?: Record<string, unknown> | null;
}): Record<string, unknown> => ({
  tenant_id: input.tenantId,
  org_unit_id: input.orgUnitId,
  actor_user_id: normalizeLifecycleString(input.actorUserId) || 'unknown',
  thread_id: input.threadId,
  prior_state: input.priorState,
  new_state: input.newState,
  action: input.action,
  reason: input.reason || null,
  resolution: input.resolution || null,
  thread_reopened_by_user: input.threadReopenedByUser || null,
  lifecycle_lineage: input.lifecycleLineage || null,
});

const buildLifecycleSideEffects = (input: {
  eventName: string;
  metadata: Record<string, unknown>;
}) => ({
  audit: {
    eventName: input.eventName,
    metadata: input.metadata,
  },
  outbox: {
    eventName: input.eventName,
    metadata: input.metadata,
  },
});

const resolveOutboundLifecycleAction = (
  outboundAction: ConnectShyftOutboundAction,
): 'outbound_call' | 'outbound_message' => {
  return outboundAction === 'call' ? 'outbound_call' : 'outbound_message';
};

const resolveOutboundDispatchEventName = (
  outboundAction: ConnectShyftOutboundAction,
): string => {
  return outboundAction === 'call'
    ? CONNECTSHYFT_OUTBOUND_EVENT_NAMES.callDispatched
    : CONNECTSHYFT_OUTBOUND_EVENT_NAMES.messageDispatched;
};

class OutboundDispatchRefusalError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'OutboundDispatchRefusalError';
  }
}

const canPersistOutboundDispatchSideEffects = (input: {
  tenantId: string;
  threadId: string;
}): boolean => {
  return UUID_PATTERN.test(input.tenantId) && UUID_PATTERN.test(input.threadId);
};

const persistOutboundDispatchSideEffects = async (input: {
  tenantId: string;
  threadId: string;
  actorUserId: string | null;
  eventName: string;
  metadata: Record<string, unknown>;
}): Promise<
  | {
    ok: true;
    sideEffectsPersisted: boolean;
    sideEffects: ReturnType<typeof buildLifecycleSideEffects>;
  }
  | {
    ok: false;
    code: string;
    message: string;
  }
> => {
  const sideEffects = buildLifecycleSideEffects({
    eventName: input.eventName,
    metadata: input.metadata,
  });

  if (!canPersistOutboundDispatchSideEffects({
    tenantId: input.tenantId,
    threadId: input.threadId,
  })) {
    return {
      ok: true,
      sideEffectsPersisted: false,
      sideEffects,
    };
  }

  try {
    await executePlatformMutation({
      mutation: async (trx) => {
        const [updated] = await trx
          .withSchema('connectshyft')
          .table('cs_threads')
          .where({
            tenant_id: input.tenantId,
            id: input.threadId,
          })
          .update({
            updated_by_user_id: resolveMutationActorUserId(input.actorUserId),
            updated_at_utc: trx.fn.now(),
          })
          .returning<{ id: string }[]>(['id']);

        if (!updated?.id) {
          throw new OutboundDispatchRefusalError(
            'CONNECTSHYFT_THREAD_NOT_FOUND',
            'Thread not found for this tenant/orgUnit context.',
          );
        }

        return updated.id;
      },
      event: {
        tenantId: input.tenantId,
        actorId: resolveMutationActorUserId(input.actorUserId),
        eventName: input.eventName,
        entityType: 'connectshyft.thread',
        entityId: input.threadId,
        payload: input.metadata,
      },
    }, loadPlatformDb());

    return {
      ok: true,
      sideEffectsPersisted: true,
      sideEffects,
    };
  } catch (error: unknown) {
    if (error instanceof OutboundDispatchRefusalError) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
      };
    }

    return {
      ok: false,
      code: 'CONNECTSHYFT_OUTBOUND_SIDE_EFFECTS_UNAVAILABLE',
      message: 'Outbound side effects are temporarily unavailable. Please retry.',
    };
  }
};

const respondConnectShyftBusinessRefusal = (
  res: Response,
  input: {
    code: string;
    message: string;
    httpStatus?: number;
    data?: unknown;
  },
): void => {
  refusal(res, {
    code: input.code,
    message: input.message,
    refusalType: 'business',
    httpStatus: input.httpStatus ?? 200,
    data: input.data,
  });
};

const respondConnectShyftClientRefusal = (
  res: Response,
  input: {
    code: string;
    message: string;
    httpStatus?: number;
    data?: unknown;
  },
): void => {
  refusal(res, {
    code: input.code,
    message: input.message,
    refusalType: 'client',
    httpStatus: input.httpStatus ?? 400,
    data: input.data,
  });
};

const cancelPendingEscalationNotifications = async (input: {
  tenantId: string;
  threadId: string;
}): Promise<number> => {
  if (!UUID_PATTERN.test(input.tenantId) || !UUID_PATTERN.test(input.threadId)) {
    return 0;
  }

  try {
    const platformDb = loadPlatformDb();
    const canceled = await platformDb
      .withSchema('platform')
      .table('outbox_events')
      .where({
        tenant_id: input.tenantId,
        entity_type: 'connectshyft.thread',
        entity_id: input.threadId,
        delivery_status: 'pending',
      })
      .andWhere((queryBuilder) => {
        CONNECTSHYFT_ESCALATION_NOTIFICATION_EVENT_PREFIXES.forEach((prefix, index) => {
          if (index === 0) {
            queryBuilder.where('event_name', 'like', `${prefix}%`);
            return;
          }
          queryBuilder.orWhere('event_name', 'like', `${prefix}%`);
        });
      })
      .update({
        delivery_status: 'failed',
        last_delivery_error: 'Canceled after explicit claim transition.',
        available_at_utc: platformDb.fn.now(),
      });

    if (typeof canceled !== 'number' || !Number.isFinite(canceled)) {
      return 0;
    }

    return Math.max(0, Math.trunc(canceled));
  } catch (_error) {
    return 0;
  }
};
type ResolvedLifecycleContext = {
  detail: ConnectShyftThreadDetailRecord | null;
  syntheticThread: ConnectShyftSyntheticThreadDescriptor | null;
  currentState: ConnectShyftThreadState | null;
  claimedByUserId: string | null;
};

type LifecycleTransitionSideEffects = {
  eventName: string;
  metadata: Record<string, unknown>;
};
type LifecycleTransitionSideEffectInput =
  | LifecycleTransitionSideEffects
  | LifecycleTransitionSideEffects[];

class LifecycleTransitionRefusalError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'LifecycleTransitionRefusalError';
  }
}

const resolveLifecycleContext = async (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  actorUserId: string | null;
}): Promise<ResolvedLifecycleContext> => {
  const syntheticThread = resolveSyntheticLifecycleThread({
    threadId: input.threadId,
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
  });
  if (syntheticThread) {
    return {
      detail: null,
      syntheticThread,
      currentState: syntheticThread.state,
      claimedByUserId: syntheticThread.claimedByUserId,
    };
  }

  const detail = await resolveConnectShyftThreadDetailContractAsync({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    threadId: input.threadId,
    actorUserId: input.actorUserId,
    db: loadPlatformDb(),
  });

  if (detail) {
    return {
      detail,
      syntheticThread: null,
      currentState: detail.state,
      claimedByUserId: detail.claimedByUserId || null,
    };
  }

  return {
    detail: null,
    syntheticThread: null,
    currentState: null,
    claimedByUserId: null,
  };
};

const resolveMutationActorUserId = (actorUserId: string | null): string | null => {
  const normalized = normalizeLifecycleString(actorUserId);
  if (!normalized) {
    return null;
  }

  return UUID_PATTERN.test(normalized) ? normalized : null;
};

const persistResolvedSenderAlignmentForThread = async (input: {
  tenantId: string;
  orgUnitId: string;
  actorUserId: string | null;
  thread: ConnectShyftThread;
  providerNumberE164: string;
}): Promise<
  | {
    ok: true;
    thread: ConnectShyftThread;
    persisted: boolean;
  }
  | {
    ok: false;
    code: 'CONNECTSHYFT_THREAD_PERSISTENCE_UNAVAILABLE';
    message: string;
  }
> => {
  const providerNumberE164 = normalizeLifecycleString(input.providerNumberE164);
  if (!providerNumberE164) {
    return {
      ok: true,
      thread: input.thread,
      persisted: false,
    };
  }

  const alignedThread: ConnectShyftThread = {
    ...input.thread,
    lastInboundCsNumberId: providerNumberE164,
    preferredOutboundCsNumberId: providerNumberE164,
  };
  const persistedThreadId = UUID_PATTERN.test(input.thread.threadId)
    ? input.thread.threadId
    : await resolveExistingActiveThreadIdForScope({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      neighborId: input.thread.neighborId,
    });

  if (!persistedThreadId) {
    return {
      ok: true,
      thread: alignedThread,
      persisted: false,
    };
  }

  try {
    const persistedActorUserId = resolveMutationActorUserId(input.actorUserId);
    const [persistedRow] = await loadPlatformDb()
      .withSchema('connectshyft')
      .table('cs_threads')
      .where({
        tenant_id: input.tenantId,
        id: persistedThreadId,
      })
      .update({
        last_inbound_cs_number_id: providerNumberE164,
        preferred_outbound_cs_number_id: providerNumberE164,
        updated_by_user_id: persistedActorUserId,
        updated_at_utc: loadPlatformDb().fn.now(),
      })
      .returning<{ id: string }[]>(['id']);

    return {
      ok: true,
      thread: alignedThread,
      persisted: Boolean(persistedRow?.id),
    };
  } catch (_error) {
    return {
      ok: false,
      code: 'CONNECTSHYFT_THREAD_PERSISTENCE_UNAVAILABLE',
      message: 'Thread sender alignment persistence is temporarily unavailable.',
    };
  }
};

const canPersistLifecycleSideEffects = (input: {
  tenantId: string;
  threadId: string;
  syntheticThread: ConnectShyftSyntheticThreadDescriptor | null;
  sideEffects?: LifecycleTransitionSideEffectInput;
}): boolean => {
  if (!input.sideEffects) {
    return false;
  }

  if (input.syntheticThread) {
    return false;
  }

  return UUID_PATTERN.test(input.tenantId) && UUID_PATTERN.test(input.threadId);
};

const transitionThreadWithSideEffects = async (input: {
  actorRoles: Array<string | null | undefined>;
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  actorUserId: string | null;
  currentState: ConnectShyftThreadState;
  nextState: ConnectShyftThreadState;
  syntheticThread: ConnectShyftSyntheticThreadDescriptor | null;
  detail: ConnectShyftThreadDetailRecord | null;
  sideEffects?: LifecycleTransitionSideEffectInput;
}): Promise<
  | { ok: true; thread: ConnectShyftThread; sideEffectsPersisted: boolean }
  | { ok: false; code: string; message: string }
> => {
  if (canPersistLifecycleSideEffects({
    tenantId: input.tenantId,
    threadId: input.threadId,
    syntheticThread: input.syntheticThread,
    sideEffects: input.sideEffects,
  })) {
    try {
      const lifecycleSideEffects = Array.isArray(input.sideEffects)
        ? input.sideEffects
        : [input.sideEffects!];
      const thread = await executePlatformMutation({
        mutation: async (trx) => {
          const txThreadService = new AsyncConnectShyftThreadService(
            new KnexConnectShyftThreadStore(trx as unknown as Knex),
          );
          const transitioned = await txThreadService.transitionThreadState({
            actorRoles: input.actorRoles,
            tenantId: input.tenantId,
            threadId: input.threadId,
            nextState: input.nextState,
            actorUserId: input.actorUserId,
          });
          if (!transitioned.ok) {
            throw new LifecycleTransitionRefusalError(transitioned.code, transitioned.message);
          }

          return transitioned.data.thread;
        },
        event: lifecycleSideEffects.map((sideEffect) => ({
          tenantId: input.tenantId,
          actorId: resolveMutationActorUserId(input.actorUserId),
          eventName: sideEffect.eventName,
          entityType: 'connectshyft.thread',
          entityId: input.threadId,
          payload: sideEffect.metadata,
        })),
      }, loadPlatformDb());

      return {
        ok: true,
        thread,
        sideEffectsPersisted: true,
      };
    } catch (error: unknown) {
      if (error instanceof LifecycleTransitionRefusalError) {
        return {
          ok: false,
          code: error.code,
          message: error.message,
        };
      }

      return {
        ok: false,
        code: 'CONNECTSHYFT_LIFECYCLE_SIDE_EFFECTS_UNAVAILABLE',
        message: 'Lifecycle transition side effects are temporarily unavailable. Please retry.',
      };
    }
  }

  if (!UUID_PATTERN.test(input.threadId) && input.syntheticThread) {
    const thread = buildSyntheticThread({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      threadId: input.threadId,
      currentState: input.currentState,
      nextState: input.nextState,
      actorUserId: input.actorUserId,
      fallbackSummary: input.syntheticThread.summary,
      fallbackNeighborId: input.syntheticThread.neighborId,
      fallbackLastInboundCsNumberId: input.syntheticThread.lastInboundCsNumberId,
      fallbackPreferredOutboundCsNumberId: input.syntheticThread.preferredOutboundCsNumberId,
      fallbackEscalationStage: input.syntheticThread.escalationStage,
      fallbackNextEvaluationAtUtc: input.syntheticThread.nextEvaluationAtUtc,
    });
    updateSyntheticLifecycleThread(thread);

    return {
      ok: true,
      thread,
      sideEffectsPersisted: false,
    };
  }

  const transitioned = await connectShyftThreadServiceAsync.transitionThreadState({
    actorRoles: input.actorRoles,
    tenantId: input.tenantId,
    threadId: input.threadId,
    nextState: input.nextState,
    actorUserId: input.actorUserId,
  });

  if (transitioned.ok) {
    return {
      ok: true,
      thread: transitioned.data.thread,
      sideEffectsPersisted: false,
    };
  }

  if (transitioned.code !== 'CONNECTSHYFT_THREAD_NOT_FOUND' || !input.syntheticThread) {
    return {
      ok: false,
      code: transitioned.code,
      message: transitioned.message,
    };
  }

  const thread = buildSyntheticThread({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    threadId: input.threadId,
    currentState: input.currentState,
    nextState: input.nextState,
    actorUserId: input.actorUserId,
    fallbackSummary: input.syntheticThread.summary,
    fallbackNeighborId: input.syntheticThread.neighborId,
    fallbackLastInboundCsNumberId: input.syntheticThread.lastInboundCsNumberId,
    fallbackPreferredOutboundCsNumberId: input.syntheticThread.preferredOutboundCsNumberId,
    fallbackEscalationStage: input.syntheticThread.escalationStage,
    fallbackNextEvaluationAtUtc: input.syntheticThread.nextEvaluationAtUtc,
  });
  updateSyntheticLifecycleThread(thread);

  return {
    ok: true,
    thread,
    sideEffectsPersisted: false,
  };
};

const resolveConnectShyftActorRoles = (
  req: Request,
  context?: Pick<ResolvedConnectShyftContext, 'effectiveRoles'> | null,
): string[] => {
  const requestedRole = resolveConnectShyftRequestedRole(req);
  const contextRoles = Array.isArray(context?.effectiveRoles)
    ? context.effectiveRoles
      .filter((role): role is string => typeof role === 'string')
      .map((role) => role.trim())
      .filter((role) => role.length > 0)
    : [];
  const deduped = Array.from(new Set(contextRoles));

  if (requestedRole && !deduped.includes(requestedRole)) {
    deduped.push(requestedRole);
  }

  return deduped;
};

const enforceThreadViewCapability = (
  req: Request,
  res: Response,
  context?: Pick<ResolvedConnectShyftContext, 'effectiveRoles'> | null,
): boolean => {
  const actorRoles = resolveConnectShyftActorRoles(req, context);
  if (
    hasCapability(actorRoles, CAPABILITIES.ORG_UNIT_THREAD_VIEW)
    || hasCapability(actorRoles, CAPABILITIES.THREAD_VIEW_ALL)
  ) {
    return true;
  }

  refusal(res, {
    code: 'CONNECTSHYFT_THREAD_VIEW_FORBIDDEN',
    message: 'Thread access requires an authorized ConnectShyft role.',
    refusalType: 'business',
    httpStatus: 200,
  });
  return false;
};

const enforceEscalationActionMembership = (
  req: Request,
  res: Response,
  context: Pick<ResolvedConnectShyftContext, 'bypassedOrgUnitMembership' | 'effectiveRoles'>,
): boolean => {
  if (!context.bypassedOrgUnitMembership) {
    return true;
  }

  const actorRoles = resolveConnectShyftActorRoles(req, context);
  if (hasCapability(actorRoles, CAPABILITIES.THREAD_TAKEOVER_ALL)) {
    return true;
  }

  refusal(res, {
    code: 'CONNECTSHYFT_ORGUNIT_MEMBERSHIP_REQUIRED',
    message: 'orgUnit membership is required for this ConnectShyft route',
    refusalType: 'business',
    httpStatus: 200,
  });
  return false;
};

const enforceThreadClaimCapability = (
  req: Request,
  res: Response,
  context?: Pick<ResolvedConnectShyftContext, 'effectiveRoles'> | null,
): boolean => {
  const actorRoles = resolveConnectShyftActorRoles(req, context);
  if (
    hasCapability(actorRoles, CAPABILITIES.ORG_UNIT_THREAD_CLAIM)
    || hasCapability(actorRoles, CAPABILITIES.THREAD_TAKEOVER_ALL)
  ) {
    return true;
  }

  refusal(res, {
    code: 'CONNECTSHYFT_THREAD_CLAIM_FORBIDDEN',
    message: 'Thread claim requires an authorized orgUnit role.',
    refusalType: 'business',
    httpStatus: 200,
  });
  return false;
};

const enforceThreadTakeoverCapability = (
  req: Request,
  res: Response,
  context?: Pick<ResolvedConnectShyftContext, 'effectiveRoles'> | null,
): boolean => {
  const actorRoles = resolveConnectShyftActorRoles(req, context);
  if (
    hasCapability(actorRoles, CAPABILITIES.ORG_UNIT_THREAD_TAKEOVER)
    || hasCapability(actorRoles, CAPABILITIES.THREAD_TAKEOVER_ALL)
  ) {
    return true;
  }

  refusal(res, {
    code: 'CONNECTSHYFT_THREAD_TAKEOVER_FORBIDDEN',
    message: 'Thread takeover requires an authorized orgUnit role.',
    refusalType: 'business',
    httpStatus: 200,
  });
  return false;
};

const enforceThreadCloseCapability = (
  req: Request,
  res: Response,
  context?: Pick<ResolvedConnectShyftContext, 'effectiveRoles'> | null,
): boolean => {
  const actorRoles = resolveConnectShyftActorRoles(req, context);
  if (
    hasCapability(actorRoles, CAPABILITIES.ORG_UNIT_THREAD_CLOSE)
    || hasCapability(actorRoles, CAPABILITIES.THREAD_TAKEOVER_ALL)
  ) {
    return true;
  }

  refusal(res, {
    code: 'CONNECTSHYFT_THREAD_CLOSE_FORBIDDEN',
    message: 'Thread close requires an authorized orgUnit role.',
    refusalType: 'business',
    httpStatus: 200,
  });
  return false;
};

const enforceThreadCallCapability = (
  req: Request,
  res: Response,
  context?: Pick<ResolvedConnectShyftContext, 'effectiveRoles'> | null,
): boolean => {
  const actorRoles = resolveConnectShyftActorRoles(req, context);
  if (
    hasCapability(actorRoles, CAPABILITIES.ORG_UNIT_CALL_INITIATE)
    || hasCapability(actorRoles, CAPABILITIES.THREAD_TAKEOVER_ALL)
  ) {
    return true;
  }

  refusal(res, {
    code: 'CONNECTSHYFT_THREAD_CALL_FORBIDDEN',
    message: 'Outbound call requires an authorized orgUnit role.',
    refusalType: 'business',
    httpStatus: 200,
  });
  return false;
};

const enforceThreadMessageCapability = (
  req: Request,
  res: Response,
  context?: Pick<ResolvedConnectShyftContext, 'effectiveRoles'> | null,
): boolean => {
  const actorRoles = resolveConnectShyftActorRoles(req, context);
  if (
    hasCapability(actorRoles, CAPABILITIES.ORG_UNIT_SMS_SEND)
    || hasCapability(actorRoles, CAPABILITIES.THREAD_TAKEOVER_ALL)
  ) {
    return true;
  }

  refusal(res, {
    code: 'CONNECTSHYFT_THREAD_MESSAGE_FORBIDDEN',
    message: 'Outbound message requires an authorized orgUnit role.',
    refusalType: 'business',
    httpStatus: 200,
  });
  return false;
};

const resolveIdentityAmbiguityReadScope = (
  req: Request,
  res: Response,
  context: Pick<ResolvedConnectShyftContext, 'orgUnitId' | 'effectiveRoles'>,
  requestedOrgUnitId: string | null,
): {
  actorRoles: string[];
  orgUnitId: string | null;
} | null => {
  const actorRoles = resolveConnectShyftActorRoles(req, context);
  const tenantPrivileged =
    hasCapability(actorRoles, CAPABILITIES.NEIGHBOR_EDIT_ALL);
  const identityResolutionCapable =
    hasCapability(actorRoles, CAPABILITIES.ORG_UNIT_IDENTITY_RESOLVE);

  if (!tenantPrivileged && !identityResolutionCapable) {
    refusal(res, {
      code: 'CONNECTSHYFT_IDENTITY_AMBIGUITY_READ_FORBIDDEN',
      message: 'Identity ambiguity access requires an authorized ConnectShyft role.',
      refusalType: 'business',
      httpStatus: 200,
    });
    return null;
  }

  if (requestedOrgUnitId && !tenantPrivileged && requestedOrgUnitId !== context.orgUnitId) {
    refusal(res, {
      code: 'CONNECTSHYFT_ORGUNIT_SCOPE_VIOLATION',
      message: 'Cross-orgUnit context overrides are not allowed for this route',
      refusalType: 'business',
      httpStatus: 200,
    });
    return null;
  }

  return {
    actorRoles,
    orgUnitId: requestedOrgUnitId ?? (tenantPrivileged ? null : context.orgUnitId),
  };
};

const resolveIdentityAmbiguityTenantPrivilegedScope = (
  req: Request,
  res: Response,
  context: Pick<ResolvedConnectShyftContext, 'effectiveRoles'>,
): {
  actorRoles: string[];
} | null => {
  const actorRoles = resolveConnectShyftActorRoles(req, context);
  if (hasCapability(actorRoles, CAPABILITIES.NEIGHBOR_EDIT_ALL)) {
    return {
      actorRoles,
    };
  }

  refusal(res, {
    code: 'CONNECTSHYFT_IDENTITY_AMBIGUITY_UPDATE_FORBIDDEN',
    message: 'Identity ambiguity review requires a tenant-privileged ConnectShyft admin role.',
    refusalType: 'business',
    httpStatus: 200,
  });
  return null;
};

const parseOrgUnitIdFromBody = (req: Request): string | null => {
  if (typeof req.body?.orgUnitId !== 'string') {
    return null;
  }

  const normalized = req.body.orgUnitId.trim();
  return normalized.length > 0 ? normalized : null;
};
const parseOrgUnitIdFromQuery = (req: Request): string | null => {
  if (typeof req.query?.orgUnitId !== 'string') {
    return null;
  }

  const normalized = req.query.orgUnitId.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseIdentityAmbiguityStatusFromQuery = (
  req: Request,
): 'pending' | 'reviewed' | null => {
  if (typeof req.query?.status !== 'string') {
    return null;
  }

  const normalized = req.query.status.trim().toLowerCase();
  if (normalized === 'pending' || normalized === 'reviewed') {
    return normalized;
  }

  return null;
};

const parseIdentityAmbiguityOptionalFilter = (
  value: unknown,
): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseIdentityAmbiguityLimit = (req: Request): number => {
  const rawLimit = typeof req.query?.limit === 'string'
    ? Number.parseInt(req.query.limit, 10)
    : Number.NaN;
  if (!Number.isFinite(rawLimit) || rawLimit <= 0) {
    return CONNECTSHYFT_IDENTITY_AMBIGUITIES_DEFAULT_LIMIT;
  }

  return Math.min(
    Math.trunc(rawLimit),
    CONNECTSHYFT_IDENTITY_AMBIGUITIES_MAX_LIMIT,
  );
};

const parseIdentityAmbiguityFilters = (req: Request): {
  orgUnitId: string | null;
  status: 'pending' | 'reviewed' | null;
  normalizedContactPoint: string | null;
  sourceContext: string | null;
  limit: number;
  cursor: string | null;
} => ({
  orgUnitId: parseOrgUnitIdFromQuery(req),
  status: parseIdentityAmbiguityStatusFromQuery(req),
  normalizedContactPoint: parseIdentityAmbiguityOptionalFilter(
    req.query?.normalizedContactPoint,
  ),
  sourceContext: parseIdentityAmbiguityOptionalFilter(req.query?.sourceContext),
  limit: parseIdentityAmbiguityLimit(req),
  cursor: parseIdentityAmbiguityOptionalFilter(req.query?.cursor),
});

const parseIdentityAmbiguityEventIdParam = (req: Request): string => {
  if (typeof req.params.ambiguityEventId !== 'string') {
    return '';
  }

  return req.params.ambiguityEventId.trim();
};

const parseIdentityAmbiguityStatusUpdate = (
  req: Request,
): 'reviewed' | null => {
  if (typeof req.body?.status !== 'string') {
    return null;
  }

  const normalized = req.body.status.trim().toLowerCase();
  return normalized === 'reviewed' ? 'reviewed' : null;
};

const parseThreadDueLimit = (req: Request): number => {
  const rawLimit = typeof req.query?.limit === 'string'
    ? Number.parseInt(req.query.limit, 10)
    : Number.NaN;
  if (!Number.isFinite(rawLimit) || rawLimit <= 0) {
    return 50;
  }

  return Math.min(Math.trunc(rawLimit), 250);
};

const parseCanonicalEventsLimit = (req: Request): number => {
  const rawLimit = typeof req.query?.limit === 'string'
    ? Number.parseInt(req.query.limit, 10)
    : Number.NaN;
  if (!Number.isFinite(rawLimit) || rawLimit <= 0) {
    return CONNECTSHYFT_CANONICAL_EVENTS_DEFAULT_LIMIT;
  }

  return Math.min(Math.trunc(rawLimit), CONNECTSHYFT_CANONICAL_EVENTS_MAX_LIMIT);
};

const parseThreadTimelineLimit = (req: Request): number => {
  const rawLimit = typeof req.query?.limit === 'string'
    ? Number.parseInt(req.query.limit, 10)
    : Number.NaN;

  return normalizeConnectShyftThreadTimelineLimit(rawLimit);
};

const parseCanonicalEventFilters = (req: Request): {
  aggregateId: string | null;
  aggregateType: string | null;
  eventType: string | null;
  limit: number;
} => {
  const aggregateId = typeof req.query?.aggregateId === 'string'
    ? req.query.aggregateId.trim()
    : '';
  const aggregateType = typeof req.query?.aggregateType === 'string'
    ? req.query.aggregateType.trim()
    : '';
  const eventType = typeof req.query?.eventType === 'string'
    ? req.query.eventType.trim()
    : '';

  return {
    aggregateId: aggregateId || null,
    aggregateType: aggregateType || null,
    eventType: eventType || null,
    limit: parseCanonicalEventsLimit(req),
  };
};

const resolveThreadDetailActionsForActor = (input: {
  req: Request;
  context: ResolvedConnectShyftContext;
  thread: ConnectShyftThreadDetailRecord;
  actorUserId: string | null;
}): ReturnType<typeof resolveConnectShyftThreadActions> => {
  return [...resolveConnectShyftThreadActions(input.thread.state)];
};

const buildDeterministicTestPhone = (seed: string): string => {
  const normalizedSeed = normalizeLifecycleString(seed) || 'connectshyft-test-phone';
  let digits = '';
  for (const char of normalizedSeed) {
    if (digits.length >= 10) {
      break;
    }
    const code = char.charCodeAt(0);
    digits += String(code % 10);
  }

  const paddedDigits = (digits + '3175550000').slice(0, 10);
  return `+1${paddedDigits}`;
};

const resolveTestOverridePhoneFallback = (input: {
  allowTestFallback?: boolean;
  primarySeed?: string | null;
  secondarySeed?: string | null;
}): string | null => {
  if (!isConnectShyftTestOverrideEnabled()) {
    return null;
  }

  if (!input.allowTestFallback) {
    return null;
  }

  const primarySeed = normalizeLifecycleString(input.primarySeed);
  if (primarySeed) {
    return buildDeterministicTestPhone(primarySeed);
  }

  const secondarySeed = normalizeLifecycleString(input.secondarySeed);
  if (secondarySeed) {
    return buildDeterministicTestPhone(secondarySeed);
  }

  return null;
};

const resolveCanonicalEventTypeForOutboundAction = (
  outboundAction: ConnectShyftOutboundAction,
): string => {
  return outboundAction === 'call'
    ? CONNECTSHYFT_CANONICAL_EVENT_TYPES.callAttemptStarted
    : CONNECTSHYFT_CANONICAL_EVENT_TYPES.messageQueued;
};

const buildCanonicalPayloadForOutboundAction = (input: {
  outboundAction: ConnectShyftOutboundAction;
  threadState: ConnectShyftThreadState;
  lifecycleEvent: string;
  reopenedFromClosed: boolean;
  actor: 'system' | 'user';
  messageBody?: string | null;
  senderPhone?: string | null;
  targetPhone?: string | null;
}): Record<string, unknown> => {
  const isSms = input.outboundAction === 'message';

  return {
    direction: 'outbound',
    channel: isSms ? 'sms' : 'voice',
    actor: input.actor,
    eventName: isSms
      ? CONNECTSHYFT_OUTBOUND_SMS_APPENDED_EVENT_NAME
      : input.lifecycleEvent,
    lifecycleEvent: input.lifecycleEvent,
    threadState: input.threadState,
    reopenedFromClosed: input.reopenedFromClosed,
    outboundMessageArtifact: isSms
      ? {
        channel: 'sms',
        direction: 'outbound',
        body: normalizeLifecycleString(input.messageBody) || '',
        from: normalizeLifecycleString(input.senderPhone) || null,
        to: normalizeLifecycleString(input.targetPhone) || null,
      }
      : null,
  };
};

const buildCanonicalPayloadForInboundWebhook = (input: {
  eventType: string;
  routingDecision: 'voicemail_only' | 'intake_fallback' | 'accepted';
  threadState: ConnectShyftThreadState | null;
  autoClaimApplied: boolean;
}): Record<string, unknown> => ({
  direction: 'inbound',
  channel: (
    input.eventType.toLowerCase().includes('call')
    || input.eventType.toLowerCase().includes('voice')
  )
    ? 'voice'
    : 'sms',
  eventType: input.eventType,
  routingDecision: input.routingDecision,
  threadState: input.threadState,
  autoClaimApplied: input.autoClaimApplied,
});

type ConnectShyftTelephonyRuntimeOutcome = 'bridged' | 'fallback' | 'refused';

const logConnectShyftTelephonyRuntimeOutcome = (input: {
  threadId: string;
  tenantId: string;
  orgUnitId: string;
  actorUserId: string | null;
  claimedByUserId: string | null;
  senderNumber: string | null;
  operatorDestinationSource: ConnectShyftOperatorDestinationResolution['source'];
  operatorDestinationResolved: boolean;
  outcome: ConnectShyftTelephonyRuntimeOutcome;
}): void => {
  logger.info('ConnectShyft telephony runtime outcome', input);
};

const recordCanonicalThreadEvent = async (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  eventType: string;
  payload: Record<string, unknown>;
  actorUserId: string | null;
}): Promise<ConnectShyftCanonicalEventRecord> => {
  return recordConnectShyftCanonicalEvent({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    aggregateId: input.threadId,
    aggregateType: 'Thread',
    eventType: input.eventType,
    payload: input.payload,
    actorUserId: input.actorUserId,
    db: loadPlatformDb(),
  });
};

class InboundSmsEnsureRefusalError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'InboundSmsEnsureRefusalError';
  }
}

class InboundSmsEnsurePersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InboundSmsEnsurePersistenceError';
  }
}

class InboundSmsCanonicalPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InboundSmsCanonicalPersistenceError';
  }
}

const canPersistConnectShyftCanonicalSideEffects = (input: {
  tenantId: string;
  threadId: string;
}): boolean => {
  return UUID_PATTERN.test(input.tenantId) && UUID_PATTERN.test(input.threadId);
};

const listInboundCompatibilityNeighborIdsByPhone = async (input: {
  tenantId: string;
  normalizedPhone: string;
}): Promise<string[]> => {
  const store = new KnexConnectShyftNeighborStore(loadPlatformDb());
  const matches = await store.listActiveIdentityBoundaryNeighborsByPhoneValue(
    input.tenantId,
    input.normalizedPhone,
  );

  return Array.from(new Set(
    matches
      .map((neighbor) => normalizeConnectShyftNeighborIdentifier(neighbor.neighborId || ''))
      .filter((candidate): candidate is string =>
        Boolean(candidate) && isValidConnectShyftNeighborIdentifier(candidate)),
  )).sort((left, right) => left.localeCompare(right));
};

const buildInboundIdentityEventSubject = (input: {
  orgUnitId: string;
  provisionalPersonId: string;
  contactPointId: string;
}): SubjectContext => ({
  orgUnitId: input.orgUnitId,
  provisionalPersonId: input.provisionalPersonId,
  contactPointId: input.contactPointId,
});

const buildPersonProvisionalCreatedEnvelope = (input: {
  tenantId: string;
  orgUnitId: string;
  contactPointId: string;
  provisionalPerson: Awaited<ReturnType<typeof peopleCoreServiceAsync.getPerson>>;
}): PersonProvisionalCreatedEvent => ({
  id: randomUUID(),
  type: 'person.provisional_created',
  source: 'connectshyft.inbound_webhook',
  tenantId: input.tenantId,
  orgUnitId: input.orgUnitId,
  subject: buildInboundIdentityEventSubject({
    orgUnitId: input.orgUnitId,
    provisionalPersonId: input.provisionalPerson!.id,
    contactPointId: input.contactPointId,
  }),
  createdAt: input.provisionalPerson!.createdAt,
  payload: {
    id: input.provisionalPerson!.id,
    tenantId: input.provisionalPerson!.tenantId,
    orgUnitId: input.provisionalPerson!.orgUnitId,
    firstName: input.provisionalPerson!.firstName,
    lastName: input.provisionalPerson!.lastName,
    preferredName: input.provisionalPerson!.preferredName,
    status: input.provisionalPerson!.status,
    contactPointId: input.contactPointId,
  },
});

const buildResolverReviewCreatedEnvelope = (input: {
  tenantId: string;
  orgUnitId: string;
  contactPointId: string;
  provisionalPersonId: string;
  resolverReview: Awaited<ReturnType<typeof peopleCoreServiceAsync.getResolverReview>>;
}): ResolverReviewCreatedEvent => ({
  id: randomUUID(),
  type: 'resolver_review.created',
  source: 'connectshyft.inbound_webhook',
  tenantId: input.tenantId,
  orgUnitId: input.orgUnitId,
  subject: buildInboundIdentityEventSubject({
    orgUnitId: input.orgUnitId,
    provisionalPersonId: input.provisionalPersonId,
    contactPointId: input.contactPointId,
  }),
  createdAt: input.resolverReview!.requestedAt,
  payload: {
    id: input.resolverReview!.id,
    tenantId: input.resolverReview!.tenantId,
    orgUnitId: input.resolverReview!.orgUnitId,
    reviewType: input.resolverReview!.reviewType,
    reviewStatus: input.resolverReview!.reviewStatus,
    priority: input.resolverReview!.priority,
    triggerSourceType: input.resolverReview!.triggerSourceType,
    triggerSourceId: input.resolverReview!.triggerSourceId,
    candidatePersonIds: input.resolverReview!.candidatePersonIds,
    contactPointId: input.resolverReview!.contactPointId || input.contactPointId,
    confidenceBand: input.resolverReview!.confidenceBand,
    riskFlags: input.resolverReview!.riskFlags,
    requestedAt: input.resolverReview!.requestedAt,
    provisionalPersonId: input.resolverReview!.provisionalPersonId,
  },
});

const persistInboundIdentityAttachmentEventsAsync = async (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  identityAttachment: ResolveInboundContactPointIdentityResult;
}): Promise<boolean> => {
  if (input.identityAttachment.outcome === 'canonical') {
    return true;
  }

  const provisionalPersonId = input.identityAttachment.provisionalPersonId;
  if (!provisionalPersonId) {
    return false;
  }

  try {
    const provisionalPerson = await peopleCoreServiceAsync.getPerson({
      tenantId: input.tenantId,
      personId: provisionalPersonId,
    });
    if (!provisionalPerson) {
      throw new Error('Resolved provisional person could not be loaded for inbound identity event persistence.');
    }

    await persistConnectShyftThreadIdentityEventAsync({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      threadId: input.threadId,
      subject: buildInboundIdentityEventSubject({
        orgUnitId: input.orgUnitId,
        provisionalPersonId,
        contactPointId: input.identityAttachment.contactPointId,
      }),
      event: buildPersonProvisionalCreatedEnvelope({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        contactPointId: input.identityAttachment.contactPointId,
        provisionalPerson,
      }),
    });

    if (
      input.identityAttachment.outcome !== 'resolver_needed'
      || !input.identityAttachment.resolverReviewId
    ) {
      return true;
    }

    const resolverReview = await peopleCoreServiceAsync.getResolverReview({
      tenantId: input.tenantId,
      reviewId: input.identityAttachment.resolverReviewId,
    });
    if (!resolverReview) {
      throw new Error('Resolved resolver review could not be loaded for inbound identity event persistence.');
    }

    await persistConnectShyftThreadIdentityEventAsync({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      threadId: input.threadId,
      subject: buildInboundIdentityEventSubject({
        orgUnitId: input.orgUnitId,
        provisionalPersonId,
        contactPointId: input.identityAttachment.contactPointId,
      }),
      event: buildResolverReviewCreatedEnvelope({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        contactPointId: input.identityAttachment.contactPointId,
        provisionalPersonId,
        resolverReview,
      }),
    });

    return true;
  } catch (error) {
    logger.warn('ConnectShyft inbound identity event persistence degraded', {
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      threadId: input.threadId,
      outcome: input.identityAttachment.outcome,
      error: error instanceof Error ? error.message : 'identity-event-persistence-error',
    });
    return false;
  }
};

const persistInboundSmsEnsureAndCanonicalEvent = async (input: {
  actorRoles: string[];
  tenantId: string;
  orgUnitId: string;
  neighborId: string;
  personId: string;
  actorUserId: string;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
  eventType: string;
  buildCanonicalPayload: (threadState: ConnectShyftThreadState) => Record<string, unknown>;
}): Promise<{
  thread: ConnectShyftThread;
  canonicalEvent: ConnectShyftCanonicalEventRecord;
  sideEffectsPersisted: boolean;
}> => {
  return loadPlatformDb().transaction(async (trx) => {
    const txThreadService = new AsyncConnectShyftThreadService(
      new KnexConnectShyftThreadStore(trx as unknown as Knex),
    );
    const txNeighborService = new AsyncConnectShyftNeighborService(
      new KnexConnectShyftNeighborStore(trx as unknown as Knex),
    );

    let ensured: Awaited<ReturnType<typeof txThreadService.ensureThread>>;
    try {
      ensured = await txThreadService.ensureThread({
        actorRoles: input.actorRoles,
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        neighborId: input.neighborId,
        personId: input.personId,
        source: 'SMS',
        lastInboundCsNumberId: input.lastInboundCsNumberId,
        preferredOutboundCsNumberId: input.preferredOutboundCsNumberId,
      });
    } catch (error) {
      throw new InboundSmsEnsurePersistenceError(
        error instanceof Error ? error.message : 'thread-ensure-error',
      );
    }

    if (!ensured.ok) {
      throw new InboundSmsEnsureRefusalError(ensured.code, ensured.message);
    }

    const ensuredThread = ensured.data.thread;

    try {
      const canonicalEvent = await recordConnectShyftCanonicalEvent({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        aggregateId: ensuredThread.threadId,
        aggregateType: 'Thread',
        eventType: input.eventType,
        payload: input.buildCanonicalPayload(ensuredThread.state),
        actorUserId: input.actorUserId,
        db: trx as unknown as Knex,
      });

      if (UUID_PATTERN.test(input.neighborId)) {
        const textingPreference = await txNeighborService.applyInboundSmsTextingPreference({
          tenantId: input.tenantId,
          neighborId: input.neighborId,
        });
        if (!textingPreference.ok) {
          throw new InboundSmsCanonicalPersistenceError(textingPreference.message);
        }
      }

      return {
        thread: ensuredThread,
        canonicalEvent,
        sideEffectsPersisted: canPersistConnectShyftCanonicalSideEffects({
          tenantId: input.tenantId,
          threadId: ensuredThread.threadId,
        }),
      };
    } catch (error) {
      throw new InboundSmsCanonicalPersistenceError(
        error instanceof Error ? error.message : 'canonical-event-persistence-error',
      );
    }
  });
};

const persistOutboundProviderIdentifierMappings = async (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  providerName: string;
  dispatch: ConnectShyftProviderDispatchResult;
  canonicalEventId: string;
}): Promise<{
  deterministic: true;
  callLegMapping: 'created' | 'duplicate' | 'ignored' | 'error';
  messageMapping: 'created' | 'duplicate' | 'ignored' | 'error';
  error: {
    code: 'CONNECTSHYFT_PROVIDER_CORRELATION_PERSISTENCE_UNAVAILABLE';
    message: string;
  } | null;
}> => {
  const callLegMappingResult = input.dispatch.providerLegId
    ? await recordConnectShyftProviderIdentifierMapping({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      threadId: input.threadId,
      providerName: input.providerName,
      identifierKind: 'call_leg',
      providerIdentifier: input.dispatch.providerLegId,
      internalReferenceId: input.canonicalEventId,
      db: loadPlatformDb(),
    })
    : { status: 'ignored' as const };

  const messageMappingResult = input.dispatch.providerMessageId
    ? await recordConnectShyftProviderIdentifierMapping({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      threadId: input.threadId,
      providerName: input.providerName,
      identifierKind: 'message',
      providerIdentifier: input.dispatch.providerMessageId,
      internalReferenceId: input.canonicalEventId,
      db: loadPlatformDb(),
    })
    : { status: 'ignored' as const };

  return {
    deterministic: true,
    callLegMapping: callLegMappingResult.status,
    messageMapping: messageMappingResult.status,
    error: callLegMappingResult.status === 'error'
      ? {
        code: callLegMappingResult.errorCode || 'CONNECTSHYFT_PROVIDER_CORRELATION_PERSISTENCE_UNAVAILABLE',
        message: callLegMappingResult.errorMessage || 'Provider correlation mapping persistence unavailable.',
      }
      : messageMappingResult.status === 'error'
        ? {
          code: messageMappingResult.errorCode || 'CONNECTSHYFT_PROVIDER_CORRELATION_PERSISTENCE_UNAVAILABLE',
          message: messageMappingResult.errorMessage || 'Provider correlation mapping persistence unavailable.',
        }
        : null,
  };
};

type ConnectShyftThreadTimelineEvent = ConnectShyftCanonicalEventRecord & {
  eventName: string;
  metadata: Record<string, unknown> | null;
  conversationType: 'message' | 'voicemail' | 'lifecycle';
  renderMode: 'inline';
  firstClass: boolean;
};

const resolveThreadTimelineConversationType = (
  eventName: string,
): 'message' | 'voicemail' | 'lifecycle' => {
  const normalized = normalizeLifecycleString(eventName).toLowerCase();
  if (
    normalized.includes('voicemail')
    || normalized.includes('transcription')
    || normalized.includes('voice.')
  ) {
    return 'voicemail';
  }

  if (
    normalized.includes('message')
    || normalized.includes('sms')
    || normalized.includes('text')
  ) {
    return 'message';
  }

  return 'lifecycle';
};

const listCanonicalThreadEvents = async (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  limit?: number;
}): Promise<ConnectShyftThreadTimelineEvent[]> => {
  const events = await listConnectShyftCanonicalEvents({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    aggregateId: input.threadId,
    aggregateType: 'Thread',
    limit: input.limit,
    db: loadPlatformDb(),
  });

  return events.map((event) => {
    const payload = asRecord(event.payload);
    const metadata = asRecord(payload?.metadata);
    const eventName = typeof payload?.eventName === 'string'
      ? payload.eventName
      : event.eventType;
    const conversationType = resolveThreadTimelineConversationType(eventName);
    return {
      ...event,
      eventName,
      metadata: metadata || null,
      conversationType,
      renderMode: 'inline',
      firstClass: conversationType === 'voicemail' || conversationType === 'message',
    };
  });
};

type ConnectShyftVoicemailArtifactContract = {
  artifactId: string;
  transcription: {
    available: boolean;
    text: string | null;
  };
};

const resolveVoicemailArtifactsFromTimeline = (
  timeline: ConnectShyftThreadTimelineEvent[],
): ConnectShyftVoicemailArtifactContract[] => {
  const artifacts = new Map<string, ConnectShyftVoicemailArtifactContract>();

  const ensureArtifact = (artifactId: string): ConnectShyftVoicemailArtifactContract => {
    const normalizedArtifactId = normalizeLifecycleString(artifactId);
    const existing = artifacts.get(normalizedArtifactId);
    if (existing) {
      return existing;
    }

    const created: ConnectShyftVoicemailArtifactContract = {
      artifactId: normalizedArtifactId,
      transcription: {
        available: false,
        text: null,
      },
    };
    artifacts.set(normalizedArtifactId, created);
    return created;
  };

  timeline.forEach((event) => {
    const payload = asRecord(event.payload);
    const voicemailArtifact = asRecord(payload?.voicemailArtifact);
    const payloadArtifactId = normalizeLifecycleString(voicemailArtifact?.artifactId);
    if (payloadArtifactId) {
      const artifact = ensureArtifact(payloadArtifactId);
      const transcription = asRecord(voicemailArtifact?.transcription);
      const available = transcription?.available === true;
      const text = normalizeLifecycleString(transcription?.text);
      if (available || text) {
        artifact.transcription = {
          available: available || Boolean(text),
          text: text || artifact.transcription.text,
        };
      }
    }

    if (event.eventName !== CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.voicemailTranscriptionAttached) {
      return;
    }

    const metadata = asRecord(event.metadata);
    const transcription = asRecord(payload?.transcription);
    const callbackArtifactId = normalizeLifecycleString(
      metadata?.voicemailArtifactId
      || payload?.voicemailArtifactId
      || voicemailArtifact?.artifactId,
    );
    if (!callbackArtifactId) {
      return;
    }

    const transcriptText = normalizeLifecycleString(
      metadata?.transcriptText
      || transcription?.text
      || asRecord(voicemailArtifact?.transcription)?.text,
    );
    const artifact = ensureArtifact(callbackArtifactId);
    artifact.transcription = {
      available: true,
      text: transcriptText || null,
    };
  });

  return Array.from(artifacts.values());
};

const hasPersistedVoicemailArtifactCorrelation = async (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  voicemailArtifactId: string;
  callbackProviderEventId: string;
}): Promise<boolean> => {
  const callbackProviderEventId = normalizeLifecycleString(input.callbackProviderEventId);
  if (!callbackProviderEventId) {
    return false;
  }

  const db = loadPlatformDb();
  const canQueryAllEvents = UUID_PATTERN.test(input.tenantId) && UUID_PATTERN.test(input.threadId);
  if (canQueryAllEvents) {
    try {
      const matched = await db
        .withSchema('platform')
        .table('events')
        .where({
          tenant_id: input.tenantId,
          event_name: 'connectshyft.canonical.event_recorded',
        })
        .andWhereRaw(`payload ->> 'aggregateId' = ?`, [input.threadId])
        .andWhereRaw(`payload ->> 'aggregateType' = ?`, ['Thread'])
        .andWhereRaw(`payload ->> 'orgUnitId' = ?`, [input.orgUnitId])
        .andWhereRaw(
          `COALESCE(
            payload -> 'payload' -> 'transcription' -> 'callbackCorrelation' ->> 'tenantId',
            payload -> 'payload' -> 'transcription' -> 'callbackCorrelation' ->> 'tenant_id'
          ) = ?`,
          [input.tenantId],
        )
        .andWhereRaw(
          `COALESCE(
            payload -> 'payload' -> 'transcription' -> 'callbackCorrelation' ->> 'orgUnitId',
            payload -> 'payload' -> 'transcription' -> 'callbackCorrelation' ->> 'org_unit_id'
          ) = ?`,
          [input.orgUnitId],
        )
        .andWhereRaw(
          `COALESCE(
            payload -> 'payload' -> 'transcription' -> 'callbackCorrelation' ->> 'threadId',
            payload -> 'payload' -> 'transcription' -> 'callbackCorrelation' ->> 'thread_id'
          ) = ?`,
          [input.threadId],
        )
        .andWhereRaw(
          `COALESCE(
            payload -> 'payload' -> 'transcription' -> 'callbackCorrelation' ->> 'providerEventId',
            payload -> 'payload' -> 'transcription' -> 'callbackCorrelation' ->> 'provider_event_id',
            payload -> 'payload' -> 'transcription' -> 'callbackCorrelation' ->> 'correlationEventId',
            payload -> 'payload' -> 'transcription' -> 'callbackCorrelation' ->> 'correlation_event_id'
          ) = ?`,
          [callbackProviderEventId],
        )
        .andWhereRaw(
          `COALESCE(
            payload -> 'payload' -> 'transcription' -> 'callbackCorrelation' ->> 'voicemailArtifactId',
            payload -> 'payload' -> 'transcription' -> 'callbackCorrelation' ->> 'voicemail_artifact_id'
          ) = ?`,
          [input.voicemailArtifactId],
        )
        .first(['id']);

      return Boolean(matched?.id);
    } catch (_error) {
      // Fall through to bounded in-memory/list fallback for non-production contexts.
    }
  }

  const events = await listConnectShyftCanonicalEvents({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    aggregateId: input.threadId,
    aggregateType: 'Thread',
    limit: CONNECTSHYFT_CANONICAL_EVENTS_MAX_LIMIT,
    db,
  });

  return events.some((event) => {
    const payload = asRecord(event.payload);
    const transcription = asRecord(payload?.transcription);
    const callbackCorrelation = asRecord(transcription?.callbackCorrelation);
    const callbackTenantId = normalizeLifecycleString(
      callbackCorrelation?.tenantId || callbackCorrelation?.tenant_id,
    );
    const callbackOrgUnitId = normalizeLifecycleString(
      callbackCorrelation?.orgUnitId || callbackCorrelation?.org_unit_id,
    );
    const callbackThreadId = normalizeLifecycleString(
      callbackCorrelation?.threadId || callbackCorrelation?.thread_id,
    );
    const callbackArtifactId = normalizeLifecycleString(
      callbackCorrelation?.voicemailArtifactId || callbackCorrelation?.voicemail_artifact_id,
    );
    const callbackSeedEventId = normalizeLifecycleString(
      callbackCorrelation?.providerEventId
      || callbackCorrelation?.provider_event_id
      || callbackCorrelation?.correlationEventId
      || callbackCorrelation?.correlation_event_id,
    );

    return callbackTenantId === input.tenantId
      && callbackOrgUnitId === input.orgUnitId
      && callbackThreadId === input.threadId
      && callbackArtifactId === input.voicemailArtifactId
      && callbackSeedEventId === callbackProviderEventId;
  });
};

const normalizeSchedulerLimit = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SCHEDULER_LIMIT;
  }

  const normalized = Math.trunc(value);
  if (normalized <= 0) {
    return DEFAULT_SCHEDULER_LIMIT;
  }

  return Math.min(normalized, MAX_SCHEDULER_LIMIT);
};

const parseSchedulerEvaluateBody = (req: Request): {
  orgUnitId: string | null;
  asOfUtc: string | null;
  limit: number;
  threadId: string | null;
} => {
  const asOfCandidate = typeof req.body?.asOfUtc === 'string' ? req.body.asOfUtc.trim() : '';
  const threadIdCandidate = typeof req.body?.threadId === 'string' ? req.body.threadId.trim() : '';
  return {
    orgUnitId: parseOrgUnitIdFromBody(req),
    asOfUtc: asOfCandidate.length > 0 ? asOfCandidate : null,
    limit: normalizeSchedulerLimit(req.body?.limit),
    threadId: threadIdCandidate.length > 0 ? threadIdCandidate : null,
  };
};

const normalizeEscalationBaselineHours = (value: number): number => {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return DEFAULT_ESCALATION_BASELINE_HOURS;
  }

  return Math.min(
    MAX_ESCALATION_BASELINE_HOURS,
    Math.max(MIN_ESCALATION_BASELINE_HOURS, Math.trunc(value)),
  );
};

const buildSyntheticSchedulerTransition = (input: {
  threadId: string;
  previousStage: number;
  dueAtUtc: string;
  baselineHours: number;
}): ConnectShyftEscalationTransition => {
  const previousStage = Math.max(0, Math.trunc(input.previousStage));
  const stage = Math.min(previousStage + 1, MAX_ESCALATION_STAGE);
  const nextDueOffsetHours = input.baselineHours * stage;
  const dueAtMs = Date.parse(input.dueAtUtc);
  const nextDueAtUtc = new Date(
    (Number.isNaN(dueAtMs) ? Date.now() : dueAtMs) + (nextDueOffsetHours * HOUR_MS),
  ).toISOString();

  return {
    threadId: input.threadId,
    previousStage,
    stage,
    dueAtUtc: input.dueAtUtc,
    nextDueAtUtc,
    nextDueOffsetHours,
  };
};

const evaluateSyntheticEscalations = (input: {
  tenantId: string;
  orgUnitId: string;
  asOfUtc: string;
  baselineHours: number;
  limit: number;
  threadId: string | null;
}): ConnectShyftEscalationTransition[] => {
  const asOfMs = Date.parse(input.asOfUtc);
  if (Number.isNaN(asOfMs)) {
    return [];
  }

  const dueSyntheticThreads = Object.entries(CONNECTSHYFT_SYNTHETIC_LIFECYCLE_THREADS)
    .filter(([threadId, descriptor]) =>
      descriptor.tenantId === input.tenantId
      && descriptor.orgUnitId === input.orgUnitId
      && (!input.threadId || threadId === input.threadId)
      && descriptor.state === 'UNCLAIMED'
      && descriptor.claimedByUserId === null
      && typeof descriptor.nextEvaluationAtUtc === 'string')
    .map(([threadId, descriptor]) => ({
      threadId,
      descriptor,
      dueAtMs: Date.parse(descriptor.nextEvaluationAtUtc as string),
    }))
    .filter((candidate) => !Number.isNaN(candidate.dueAtMs) && candidate.dueAtMs <= asOfMs)
    .sort((left, right) => {
      if (left.dueAtMs !== right.dueAtMs) {
        return left.dueAtMs - right.dueAtMs;
      }
      return left.threadId.localeCompare(right.threadId);
    })
    .slice(0, input.limit);

  const transitions: ConnectShyftEscalationTransition[] = [];
  dueSyntheticThreads.forEach((candidate) => {
    const dueAtUtc = candidate.descriptor.nextEvaluationAtUtc as string;
    const transition = buildSyntheticSchedulerTransition({
      threadId: candidate.threadId,
      previousStage: candidate.descriptor.escalationStage,
      dueAtUtc,
      baselineHours: input.baselineHours,
    });

    candidate.descriptor.escalationStage = transition.stage;
    candidate.descriptor.nextEvaluationAtUtc = transition.nextDueAtUtc;
    transitions.push(transition);
  });

  return transitions;
};

const parseThreadIdFromBody = (req: Request): string | null => {
  if (typeof req.body?.threadId !== 'string') {
    return null;
  }

  const normalized = req.body.threadId.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseOptionalBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return null;
};

const parseOptionalNonNegativeInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.trunc(parsed);
    }
  }

  return null;
};

const parseOutboundCallRequestPolicy = (req: Request): {
  transport: string | null;
  autoRetry: boolean | null;
  redialPolicy: string | null;
  retryCount: number | null;
  targetPhone: string | null;
  operatorContactPointId: string | null;
} => {
  const rawBody = req.body && typeof req.body === 'object'
    ? req.body as Record<string, unknown>
    : {};
  const rawCall = rawBody.call && typeof rawBody.call === 'object'
    ? rawBody.call as Record<string, unknown>
    : {};

  const resolveField = (field: string): unknown => {
    if (rawCall[field] !== undefined) {
      return rawCall[field];
    }
    return rawBody[field];
  };

  const transport = normalizeLifecycleString(resolveField('transport')).toLowerCase();
  const redialPolicy = normalizeLifecycleString(resolveField('redialPolicy')).toLowerCase();
  const targetPhone = normalizeLifecycleString(
    resolveField('targetPhone')
    ?? resolveField('targetPhoneE164')
    ?? resolveField('recipientPhone'),
  );
  const operatorContactPointId = normalizeLifecycleString(
    resolveField('operatorPhoneId')
    ?? resolveField('operatorContactPointId')
    ?? resolveField('operatorPhone')
    ?? resolveField('operatorCallbackPhone'),
  );

  return {
    transport: transport || null,
    autoRetry: parseOptionalBoolean(resolveField('autoRetry')),
    redialPolicy: redialPolicy || null,
    retryCount:
      parseOptionalNonNegativeInteger(resolveField('retryCount'))
      ?? parseOptionalNonNegativeInteger(resolveField('maxRetries')),
    targetPhone: targetPhone || null,
    operatorContactPointId: operatorContactPointId || null,
  };
};

const parseOutboundMessagePolicyRequest = (req: Request): {
  body: string;
  targetPhone: string | null;
  overrideReason: string | null;
  overrideNote: string | null;
} => {
  const rawBody = req.body && typeof req.body === 'object'
    ? req.body as Record<string, unknown>
    : {};

  const nestedOverride = rawBody.override && typeof rawBody.override === 'object'
    ? rawBody.override as Record<string, unknown>
    : null;
  const nestedTarget = rawBody.target && typeof rawBody.target === 'object'
    ? rawBody.target as Record<string, unknown>
    : null;

  const body = normalizeLifecycleString(rawBody.body);
  const targetPhone = normalizeLifecycleString(
    rawBody.targetPhone
    ?? rawBody.targetPhoneE164
    ?? rawBody.recipientPhone
    ?? nestedTarget?.phone,
  );
  const overrideReason = normalizeLifecycleString(
    rawBody.overrideReason
    ?? nestedOverride?.reason
    ?? nestedOverride?.reasonCode,
  ).toLowerCase();
  const overrideNote = normalizeLifecycleString(
    rawBody.overrideNote
    ?? nestedOverride?.note,
  );

  return {
    body,
    targetPhone: targetPhone || null,
    overrideReason: overrideReason || null,
    overrideNote: overrideNote || null,
  };
};

const parseOutboundDispatchIdempotencyKey = (req: Request): string | null => {
  const headerIdempotencyKey = normalizeLifecycleString(req.header('Idempotency-Key'));
  if (headerIdempotencyKey) {
    return headerIdempotencyKey;
  }

  const bodyIdempotencyKey = normalizeLifecycleString(req.body?.idempotencyKey);
  return bodyIdempotencyKey || null;
};

type ConnectShyftResolvedSmsTarget =
  | {
    ok: true;
    targetPhone: string;
    source:
      | 'explicit_request'
      | 'primary_active_valid_phone'
      | 'only_active_valid_phone'
      | 'test_override_fallback';
  }
  | {
    ok: false;
    code: string;
    message: string;
    data: {
      targetResolution: {
        reason:
          | 'invalid_explicit_request_target'
          | 'missing_target'
          | 'ambiguous_target'
          | 'neighbor_resolution_unavailable';
        source: 'explicit_request' | 'neighbor_record';
        neighborId: string | null;
        requestedTargetPhone: string | null;
        candidateCount: number;
        candidatePhones: string[];
      };
      uiFeedback: {
        severity: 'warning';
        ariaLive: 'assertive';
        messageKey:
          | 'connectshyft.sms_target.invalid'
          | 'connectshyft.sms_target.missing'
          | 'connectshyft.sms_target.ambiguous'
          | 'connectshyft.sms_target.unavailable';
        presentation: 'contextual-action-feedback';
        requiresAction: true;
        actionLabel: 'Select phone';
        accessibilityHint: string;
        message: string;
      };
    };
  };

type ConnectShyftDispatchReadySmsTarget =
  | {
    ok: true;
    targetPhone: string;
  }
  | Extract<ConnectShyftResolvedSmsTarget, { ok: false }>;

type ConnectShyftResolvedSmsSender =
  | {
    ok: true;
    senderPhone: string;
    source: 'thread_alignment';
    metadata: {
      orgUnitId: string;
      selectedMappingId: string;
      selectedMappingLabel: string | null;
      alignedFrom: 'preferred_outbound' | 'last_inbound';
      threadHints: {
        lastInboundCsNumberId: string | null;
        preferredOutboundCsNumberId: string | null;
        preferredOutboundLabel: string | null;
      };
    };
  }
  | {
    ok: false;
    code: string;
    message: string;
    data: {
      senderResolution: {
        reason:
          | 'missing_sender'
          | 'ambiguous_sender'
          | 'invalid_sender_alignment';
        source: 'thread_alignment';
        orgUnitId: string;
        activeMappingCount: number;
        candidateMappings: Array<{
          mappingId: string;
          senderPhone: string;
          label: string | null;
          isActive: boolean;
        }>;
        threadHints: {
          lastInboundCsNumberId: string | null;
          preferredOutboundCsNumberId: string | null;
          preferredOutboundLabel: string | null;
        };
      };
      uiFeedback: {
        severity: 'warning';
        ariaLive: 'assertive';
        messageKey:
          | 'connectshyft.sms_sender.required'
          | 'connectshyft.sms_sender.ambiguous';
        presentation: 'contextual-action-feedback';
        requiresAction: true;
        actionLabel: 'Review numbers';
        accessibilityHint: string;
        message: string;
      };
    };
  };

const isValidConnectShyftSmsTargetPhone = (value: string): boolean => {
  return value.length > 0 && validatePhoneForChannel(value, 'sms').ok;
};

const buildConnectShyftSmsSenderThreadHints = (input: {
  thread: ConnectShyftThread;
  preferredOutboundLabel?: string | null;
}): {
  lastInboundCsNumberId: string | null;
  preferredOutboundCsNumberId: string | null;
  preferredOutboundLabel: string | null;
} => ({
  lastInboundCsNumberId: normalizeLifecycleString(input.thread.lastInboundCsNumberId) || null,
  preferredOutboundCsNumberId:
    normalizeLifecycleString(input.thread.preferredOutboundCsNumberId) || null,
  preferredOutboundLabel: normalizeLifecycleString(input.preferredOutboundLabel || null) || null,
});

const sortConnectShyftNeighborPhones = (
  left: Pick<ConnectShyftNeighborPhone, 'sortOrder' | 'phoneId'>,
  right: Pick<ConnectShyftNeighborPhone, 'sortOrder' | 'phoneId'>,
): number => {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  return left.phoneId.localeCompare(right.phoneId);
};

const collectDeterministicSmsTargetCandidates = (
  phones: ConnectShyftNeighborPhone[],
): ConnectShyftNeighborPhone[] => {
  return phones
    .filter((phone) => phone.isActive !== false)
    .filter((phone) => phone.validationStatus === 'valid')
    .filter((phone) => isValidConnectShyftSmsTargetPhone(phone.value))
    .sort(sortConnectShyftNeighborPhones);
};

const buildConnectShyftSmsTargetRefusal = (input: {
  code: string;
  message: string;
  messageKey:
    | 'connectshyft.sms_target.invalid'
    | 'connectshyft.sms_target.missing'
    | 'connectshyft.sms_target.ambiguous'
    | 'connectshyft.sms_target.unavailable';
  reason:
    | 'invalid_explicit_request_target'
    | 'missing_target'
    | 'ambiguous_target'
    | 'neighbor_resolution_unavailable';
  source: 'explicit_request' | 'neighbor_record';
  neighborId: string | null;
  requestedTargetPhone: string | null;
  candidatePhones?: string[];
  accessibilityHint: string;
}): Extract<ConnectShyftResolvedSmsTarget, { ok: false }> => ({
  ok: false,
  code: input.code,
  message: input.message,
  data: {
    targetResolution: {
      reason: input.reason,
      source: input.source,
      neighborId: input.neighborId,
      requestedTargetPhone: input.requestedTargetPhone,
      candidateCount: input.candidatePhones?.length || 0,
      candidatePhones: input.candidatePhones || [],
    },
    uiFeedback: {
      severity: 'warning',
      ariaLive: 'assertive',
      messageKey: input.messageKey,
      presentation: 'contextual-action-feedback',
      requiresAction: true,
      actionLabel: 'Select phone',
      accessibilityHint: input.accessibilityHint,
      message: input.message,
    },
  },
});

const buildConnectShyftSmsSenderRefusal = (input: {
  code: string;
  message: string;
  messageKey:
    | 'connectshyft.sms_sender.required'
    | 'connectshyft.sms_sender.ambiguous';
  reason:
    | 'missing_sender'
    | 'ambiguous_sender'
    | 'invalid_sender_alignment';
  orgUnitId: string;
  thread: ConnectShyftThread;
  preferredOutboundLabel?: string | null;
  candidateMappings?: Array<{
    mappingId: string;
    senderPhone: string;
    label: string | null;
    isActive: boolean;
  }>;
  activeMappingCount?: number;
  accessibilityHint: string;
}): Extract<ConnectShyftResolvedSmsSender, { ok: false }> => ({
  ok: false,
  code: input.code,
  message: input.message,
  data: {
    senderResolution: {
      reason: input.reason,
      source: 'thread_alignment',
      orgUnitId: input.orgUnitId,
      activeMappingCount: input.activeMappingCount ?? input.candidateMappings?.length ?? 0,
      candidateMappings: input.candidateMappings || [],
      threadHints: buildConnectShyftSmsSenderThreadHints({
        thread: input.thread,
        preferredOutboundLabel: input.preferredOutboundLabel,
      }),
    },
    uiFeedback: {
      severity: 'warning',
      ariaLive: 'assertive',
      messageKey: input.messageKey,
      presentation: 'contextual-action-feedback',
      requiresAction: true,
      actionLabel: 'Review numbers',
      accessibilityHint: input.accessibilityHint,
      message: input.message,
    },
  },
});

const mapSenderResolverRefusalToSmsSenderRefusal = (input: {
  refusal: ResolveSenderNumberRefusal;
  thread: ConnectShyftThread;
  preferredOutboundLabel?: string | null;
}): Extract<ConnectShyftResolvedSmsSender, { ok: false }> => {
  const isAmbiguous = input.refusal.reason === 'sender_mapping_ambiguous';

  return buildConnectShyftSmsSenderRefusal({
    code: isAmbiguous
      ? 'CONNECTSHYFT_SMS_SENDER_AMBIGUOUS'
      : 'CONNECTSHYFT_SMS_SENDER_REQUIRED',
    message: isAmbiguous
      ? 'Resolve the mapped ConnectShyft sender number so exactly one active scoped mapping remains before sending SMS.'
      : 'Persist one valid mapped ConnectShyft sender number on the thread before sending SMS.',
    messageKey: isAmbiguous
      ? 'connectshyft.sms_sender.ambiguous'
      : 'connectshyft.sms_sender.required',
    reason: isAmbiguous ? 'ambiguous_sender' : 'invalid_sender_alignment',
    orgUnitId: input.refusal.routingMetadata.orgUnitId,
    thread: input.thread,
    preferredOutboundLabel: input.preferredOutboundLabel,
    activeMappingCount: input.refusal.routingMetadata.candidateMappings?.length ?? 0,
    candidateMappings: (input.refusal.routingMetadata.candidateMappings || []).map((mapping) => ({
      mappingId: mapping.mappingId,
      senderPhone: normalizeLifecycleString(mapping.providerNumberE164),
      label: mapping.label,
      isActive: mapping.isActive,
    })),
    accessibilityHint: isAmbiguous
      ? 'Review the thread sender alignment and scoped number mappings before retrying.'
      : 'Persist a valid mapped provider number on the thread before retrying.',
  });
};

const ensureConnectShyftDispatchReadySmsTarget = (input: {
  resolvedTargetPhone: string | null | undefined;
  requestedTargetPhone: string | null | undefined;
  threadNeighborId: string | null | undefined;
}): ConnectShyftDispatchReadySmsTarget => {
  const targetPhone = normalizeLifecycleString(input.resolvedTargetPhone);
  if (isValidConnectShyftSmsTargetPhone(targetPhone)) {
    return {
      ok: true,
      targetPhone,
    };
  }

  const requestedTargetPhone = normalizeLifecycleString(input.requestedTargetPhone);
  const normalizedNeighborId = normalizeConnectShyftNeighborIdentifier(input.threadNeighborId || '');
  const neighborId = normalizedNeighborId && isValidConnectShyftNeighborIdentifier(normalizedNeighborId)
    ? normalizedNeighborId
    : null;

  return buildConnectShyftSmsTargetRefusal({
    code: 'CONNECTSHYFT_SMS_TARGET_REQUIRED',
    message: 'Add or select a valid phone number before sending SMS.',
    messageKey: 'connectshyft.sms_target.missing',
    reason: 'missing_target',
    source: requestedTargetPhone ? 'explicit_request' : 'neighbor_record',
    neighborId,
    requestedTargetPhone: requestedTargetPhone || null,
    accessibilityHint: requestedTargetPhone
      ? 'Choose a valid phone number and resubmit the outbound message.'
      : 'Update the neighbor profile or choose a valid phone number before sending the outbound message.',
  });
};

const resolveConnectShyftSmsTarget = async (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  thread: ConnectShyftThread;
  actorRoles: Array<string | null | undefined>;
  requestedTargetPhone: string | null;
  allowTestFallback: boolean;
}): Promise<ConnectShyftResolvedSmsTarget> => {
  const explicitTargetPhone = normalizeLifecycleString(input.requestedTargetPhone || null) || null;
  const normalizedNeighborId = normalizeConnectShyftNeighborIdentifier(input.thread.neighborId || '');
  const neighborId = normalizedNeighborId && isValidConnectShyftNeighborIdentifier(normalizedNeighborId)
    ? normalizedNeighborId
    : null;
  const durableNeighborId = neighborId && UUID_PATTERN.test(neighborId)
    ? neighborId
    : null;

  if (explicitTargetPhone) {
    if (!isValidConnectShyftSmsTargetPhone(explicitTargetPhone)) {
      return buildConnectShyftSmsTargetRefusal({
        code: 'CONNECTSHYFT_SMS_TARGET_INVALID',
        message: 'Select a valid phone number before sending SMS.',
        messageKey: 'connectshyft.sms_target.invalid',
        reason: 'invalid_explicit_request_target',
        source: 'explicit_request',
        neighborId,
        requestedTargetPhone: explicitTargetPhone,
        accessibilityHint: 'Choose a valid phone number and resubmit the outbound message.',
      });
    }

    return {
      ok: true,
      targetPhone: explicitTargetPhone,
      source: 'explicit_request',
    };
  }

  if (durableNeighborId) {
    const resolvedNeighbor = await connectShyftNeighborServiceAsync.resolveNeighbor({
      tenantId: input.tenantId,
      neighborId: durableNeighborId,
      actorRoles: input.actorRoles,
    });

    if (resolvedNeighbor.ok) {
      const candidatePhones = collectDeterministicSmsTargetCandidates(
        resolvedNeighbor.data.neighbor.phones,
      );
      const primaryCandidate = candidatePhones.find((phone) => phone.isPrimary === true) || null;
      if (primaryCandidate) {
        return {
          ok: true,
          targetPhone: primaryCandidate.value,
          source: 'primary_active_valid_phone',
        };
      }

      if (candidatePhones.length === 1) {
        return {
          ok: true,
          targetPhone: candidatePhones[0].value,
          source: 'only_active_valid_phone',
        };
      }

      if (candidatePhones.length > 1) {
        return buildConnectShyftSmsTargetRefusal({
          code: 'CONNECTSHYFT_SMS_TARGET_AMBIGUOUS',
          message: 'Select a specific phone number before sending SMS.',
          messageKey: 'connectshyft.sms_target.ambiguous',
          reason: 'ambiguous_target',
          source: 'neighbor_record',
          neighborId: durableNeighborId,
          requestedTargetPhone: null,
          candidatePhones: candidatePhones.map((phone) => phone.value),
          accessibilityHint: 'Choose one phone number for this neighbor before sending the outbound message.',
        });
      }

      return buildConnectShyftSmsTargetRefusal({
        code: 'CONNECTSHYFT_SMS_TARGET_REQUIRED',
        message: 'Add or select a valid phone number before sending SMS.',
        messageKey: 'connectshyft.sms_target.missing',
        reason: 'missing_target',
        source: 'neighbor_record',
        neighborId: durableNeighborId,
        requestedTargetPhone: null,
        accessibilityHint: 'Update the neighbor profile or choose a valid phone number before sending the outbound message.',
      });
    }

    if (resolvedNeighbor.code !== 'CONNECTSHYFT_NEIGHBOR_NOT_FOUND') {
      return buildConnectShyftSmsTargetRefusal({
        code: resolvedNeighbor.code,
        message: resolvedNeighbor.message,
        messageKey: 'connectshyft.sms_target.unavailable',
        reason: 'neighbor_resolution_unavailable',
        source: 'neighbor_record',
        neighborId: durableNeighborId,
        requestedTargetPhone: null,
        accessibilityHint: 'Retry after neighbor data becomes available.',
      });
    }
  }

  if (input.allowTestFallback) {
    const fallbackPhone = resolveTestOverridePhoneFallback({
      allowTestFallback: true,
      primarySeed: input.thread.neighborId,
      secondarySeed: input.threadId,
    });
    if (fallbackPhone) {
      return {
        ok: true,
        targetPhone: fallbackPhone,
        source: 'test_override_fallback',
      };
    }
  }

  return buildConnectShyftSmsTargetRefusal({
    code: 'CONNECTSHYFT_SMS_TARGET_REQUIRED',
    message: 'Add or select a valid phone number before sending SMS.',
    messageKey: 'connectshyft.sms_target.missing',
    reason: 'missing_target',
    source: 'neighbor_record',
    neighborId: durableNeighborId || neighborId,
    requestedTargetPhone: null,
    accessibilityHint: 'Update the neighbor profile or choose a valid phone number before sending the outbound message.',
  });
};

export const ensureConnectShyftDispatchReadySmsTargetForTests =
  ensureConnectShyftDispatchReadySmsTarget;
export const resolveConnectShyftSmsTargetForTests = resolveConnectShyftSmsTarget;

const resolveConnectShyftSmsSender = async (input: {
  tenantId: string;
  orgUnitId: string;
  thread: ConnectShyftThread;
  preferredOutboundLabel?: string | null;
}): Promise<ConnectShyftResolvedSmsSender> => {
  const resolution = await resolveSenderNumber(
    {
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      threadId: input.thread.threadId,
      channel: 'sms',
    },
    {
      loadThread: async () => input.thread,
    },
  );

  if (!resolution.ok) {
    return mapSenderResolverRefusalToSmsSenderRefusal({
      refusal: resolution,
      thread: input.thread,
      preferredOutboundLabel: input.preferredOutboundLabel,
    });
  }

  return {
    ok: true,
    senderPhone: resolution.providerNumberE164,
    source: 'thread_alignment',
    metadata: {
      orgUnitId: input.orgUnitId,
      selectedMappingId: resolution.mappingId,
      selectedMappingLabel: resolution.routingMetadata.mappingLabel,
      alignedFrom: resolution.routingMetadata.alignedFrom || 'preferred_outbound',
      threadHints: buildConnectShyftSmsSenderThreadHints({
        thread: input.thread,
        preferredOutboundLabel: input.preferredOutboundLabel,
      }),
    },
  };
};

export const resolveConnectShyftSmsSenderForTests = resolveConnectShyftSmsSender;

const resolveOutboundIdempotencyOperationName = (
  outboundAction: ConnectShyftOutboundAction,
): 'send_sms' | 'start_bridge_session' => (
  outboundAction === 'call' ? 'start_bridge_session' : 'send_sms'
);

const buildConnectShyftActorScopeKey = (
  actorUserId: string | null,
  actorRoles: readonly string[],
): string => JSON.stringify({
  actorUserId: normalizeLifecycleString(actorUserId),
  actorRoles: [...actorRoles].sort(),
});

const appendConnectShyftCommunicationAudit = async (input: {
  tenantId: string;
  correlationId: string;
  actorType: 'user' | 'system' | 'provider';
  actorId?: string | null;
  operationName: string;
  targetEntityType: string;
  targetEntityId?: string | null;
  channel: 'sms' | 'voice' | 'bridge' | 'webhook';
  resultState: 'succeeded' | 'failed' | 'ignored_duplicate' | 'retrying' | 'exhausted';
  resultCode?: string | null;
  resultMessage?: string | null;
  idempotencyKey?: string | null;
  requestFingerprint?: string | null;
  providerName?: string | null;
  providerReferenceId?: string | null;
  metadata?: Record<string, unknown> | null;
  db?: Knex;
}): Promise<void> => {
  await appendConnectShyftCommunicationAuditEntry({
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    operationName: input.operationName,
    targetEntityType: input.targetEntityType,
    targetEntityId: input.targetEntityId ?? null,
    channel: input.channel,
    resultState: input.resultState,
    resultCode: input.resultCode ?? null,
    resultMessage: input.resultMessage ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
    requestFingerprint: input.requestFingerprint ?? null,
    providerName: input.providerName ?? null,
    providerReferenceId: input.providerReferenceId ?? null,
    metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    db: input.db,
  });
};

const resolveWebhookRetryDisposition = (input: {
  attemptCount: number;
  retryable: boolean;
}) => {
  return evaluateRetryPolicy({
    attemptNumber: input.attemptCount,
    maxAttempts: CONNECTSHYFT_WEBHOOK_RETRY_MAX_ATTEMPTS,
    isRetryable: input.retryable,
    baseDelayMs: CONNECTSHYFT_WEBHOOK_RETRY_BASE_DELAY_MS,
    maxDelayMs: CONNECTSHYFT_WEBHOOK_RETRY_MAX_DELAY_MS,
  });
};

const enforceOutboundCallPolicyRequest = (
  req: Request,
  res: Response,
  parsedCallPolicy: ReturnType<typeof parseOutboundCallRequestPolicy> = parseOutboundCallRequestPolicy(req),
): boolean => {
  const callPolicy = parsedCallPolicy;

  if (
    callPolicy.transport
    && callPolicy.transport !== CONNECTSHYFT_OUTBOUND_CALL_ALLOWED_TRANSPORT
  ) {
    refusal(res, {
      code: 'CONNECTSHYFT_OUTBOUND_CALL_TRANSPORT_UNSUPPORTED',
      message: 'Outbound calls require bridge transport only.',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        allowedTransport: CONNECTSHYFT_OUTBOUND_CALL_ALLOWED_TRANSPORT,
        requestedTransport: callPolicy.transport,
      },
    });
    return false;
  }

  const requestedRetry =
    callPolicy.autoRetry === true
    || (callPolicy.retryCount !== null && callPolicy.retryCount > 0)
    || (
      callPolicy.redialPolicy !== null
      && callPolicy.redialPolicy !== CONNECTSHYFT_OUTBOUND_CALL_ALLOWED_REDIAL_POLICY
    );

  if (requestedRetry) {
    refusal(res, {
      code: 'CONNECTSHYFT_OUTBOUND_CALL_RETRY_FORBIDDEN',
      message: 'Automatic redial/retry is disabled. Operators must re-initiate calls manually.',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        autoRetry: callPolicy.autoRetry,
        redialPolicy: callPolicy.redialPolicy,
        retryCount: callPolicy.retryCount,
        allowedRedialPolicy: CONNECTSHYFT_OUTBOUND_CALL_ALLOWED_REDIAL_POLICY,
      },
    });
    return false;
  }

  return true;
};

const resolveWebhookActorUserId = (req: Request): string => {
  if (isConnectShyftTestOverrideEnabled()) {
    const testActorUserId = normalizeLifecycleString(req.header(TEST_USER_ID_HEADER));
    if (UUID_PATTERN.test(testActorUserId)) {
      return testActorUserId;
    }
  }

  return CONNECTSHYFT_SYSTEM_ACTOR_USER_ID;
};

const resolveWebhookActorRoles = (req: Request): string[] => {
  const resolved = resolveConnectShyftActorRoles(req);
  if (resolved.length > 0) {
    return resolved;
  }

  return ['SYSTEM_ADMIN'];
};

const normalizeConnectShyftNeighborIdentifier = (neighborId: string): string => {
  const normalized = neighborId.trim();
  if (!normalized) {
    return '';
  }

  if (UUID_PATTERN.test(normalized)) {
    return normalized.toLowerCase();
  }

  const normalizedSlugCandidate = normalized.toLowerCase();
  if (CONNECTSHYFT_NEIGHBOR_SLUG_PATTERN.test(normalizedSlugCandidate)) {
    return normalizedSlugCandidate;
  }

  return normalized;
};

const parseThreadEnsureBody = (req: Request) => ({
  orgUnitId: parseOrgUnitIdFromBody(req),
  neighborId: typeof req.body?.neighborId === 'string'
    ? normalizeConnectShyftNeighborIdentifier(req.body.neighborId)
    : '',
  personId: typeof req.body?.personId === 'string'
    ? req.body.personId.trim()
    : '',
  source: typeof req.body?.source === 'string' ? req.body.source : 'VOICE',
  forcedState: typeof req.body?.forcedState === 'string' ? req.body.forcedState : undefined,
  lastInboundCsNumberId: typeof req.body?.lastInboundCsNumberId === 'string'
    ? req.body.lastInboundCsNumberId
    : '',
  preferredOutboundCsNumberId: typeof req.body?.preferredOutboundCsNumberId === 'string'
    ? req.body.preferredOutboundCsNumberId
    : '',
  nextEvaluationAtUtc: typeof req.body?.nextEvaluationAtUtc === 'string'
    ? req.body.nextEvaluationAtUtc
    : undefined,
});

const isValidConnectShyftNeighborIdentifier = (neighborId: string): boolean => {
  return UUID_PATTERN.test(neighborId) || CONNECTSHYFT_NEIGHBOR_SLUG_PATTERN.test(neighborId);
};

const shouldBypassInboundNeighborActiveRevalidation = (neighborId: string): boolean => {
  const normalizedNeighborId = normalizeConnectShyftNeighborIdentifier(neighborId);
  if (!normalizedNeighborId || UUID_PATTERN.test(normalizedNeighborId)) {
    return false;
  }

  if (
    normalizedNeighborId.includes('-e2e-')
    || normalizedNeighborId.includes('-atdd-')
  ) {
    return true;
  }

  return Object.values(CONNECTSHYFT_SYNTHETIC_LIFECYCLE_THREADS).some((descriptor) =>
    normalizeConnectShyftNeighborIdentifier(descriptor.neighborId) === normalizedNeighborId);
};

const resolveInboundReusableNeighborId = async (input: {
  tenantId: string;
  neighborId: string;
}): Promise<string | null> => {
  const normalizedNeighborId = normalizeConnectShyftNeighborIdentifier(input.neighborId);
  if (!isValidConnectShyftNeighborIdentifier(normalizedNeighborId)) {
    return null;
  }

  if (shouldBypassInboundNeighborActiveRevalidation(normalizedNeighborId)) {
    return normalizedNeighborId;
  }

  const resolvedNeighbor = await resolveActiveNeighborForInbound({
    tenantId: input.tenantId,
    neighborId: normalizedNeighborId,
  });

  return resolvedNeighbor?.neighborId || null;
};

const resolveNeighborIdForThreadCorrelation = async (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
}): Promise<string | null> => {
  const normalizedThreadId = normalizeLifecycleString(input.threadId);
  if (!normalizedThreadId) {
    return null;
  }

  const syntheticThread = resolveSyntheticLifecycleThread({
    threadId: normalizedThreadId,
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
  });
  if (syntheticThread) {
    const normalizedSyntheticNeighborId = normalizeConnectShyftNeighborIdentifier(syntheticThread.neighborId);
    if (isValidConnectShyftNeighborIdentifier(normalizedSyntheticNeighborId)) {
      return normalizedSyntheticNeighborId;
    }
  }

  if (!UUID_PATTERN.test(normalizedThreadId)) {
    return null;
  }

  try {
    const row = await loadPlatformDb()
      .withSchema('connectshyft')
      .table('cs_threads')
      .where({
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId,
        id: normalizedThreadId,
      })
      .first<{ neighbor_id?: unknown }>(['neighbor_id']);

    const normalizedNeighborId = normalizeConnectShyftNeighborIdentifier(
      normalizeLifecycleString(row?.neighbor_id),
    );
    if (!normalizedNeighborId || !isValidConnectShyftNeighborIdentifier(normalizedNeighborId)) {
      return null;
    }

    return normalizedNeighborId;
  } catch (_error) {
    return null;
  }
};
router.get('/settings/navigation', getConnectSettingsNavigation);

router.get('/availability', getConnectAvailability);

router.get('/telephony-readiness', getConnectTelephonyReadiness);

router.get('/operator/callback-number', getConnectOperatorCallbackNumber);

router.put('/operator/callback-number', putConnectOperatorCallbackNumber);

router.get('/context', getConnectContext);

router.get('/inbox', getConnectInbox);

router.use('/ops', connectShyftOpsRouter);

router.post('/neighbors', postConnectNeighborCreate);

router.get('/neighbors', getConnectNeighbors);

router.get('/neighbors/:neighborId', getConnectNeighborDetail);

router.delete('/neighbors/:neighborId', deleteConnectNeighbor);

router.put('/neighbors/:neighborId', putConnectNeighbor);

router.post('/neighbors/identity-match', postConnectNeighborIdentityMatch);

router.post('/neighbors/merge', postConnectNeighborMerge);

router.get('/numbers', getConnectNumberMappings);

router.post('/numbers', postConnectNumberMapping);

router.put('/numbers/:mappingId', putConnectNumberMapping);

router.get('/admin/webhook-receipts/metrics', getConnectWebhookReceiptMetrics);

router.post('/admin/webhook-receipts/cleanup', postConnectWebhookReceiptCleanup);

router.get('/escalation/recipients', getConnectEscalationRecipients);

router.get('/escalation/config', getConnectEscalationConfig);

router.put('/escalation/config', putConnectEscalationConfig);

router.post('/internal/escalation/evaluate', async (req: Request, res: Response) => {
  if (!await enforceCapability(req, res, 'escalation')) {
    return;
  }

  const payload = parseSchedulerEvaluateBody(req);
  const context = await enforceOrgUnitContext(req, res, payload.orgUnitId);
  if (!context) {
    return;
  }

  if (!enforceThreadViewCapability(req, res, context)) {
    return;
  }

  const asOfUtc = payload.asOfUtc || nowIsoUtc();
  if (!isStrictUtcIsoTimestamp(asOfUtc)) {
    refusal(res, {
      code: 'CONNECTSHYFT_ESCALATION_AS_OF_INVALID',
      message: 'asOfUtc must be a strict UTC ISO-8601 timestamp.',
      refusalType: 'business',
      httpStatus: 200,
    });
    return;
  }

  let baselineHours = DEFAULT_ESCALATION_BASELINE_HOURS;
  try {
    const config = await connectShyftEscalationConfigService.getConfig(
      context.tenantId,
      context.orgUnitId,
    );
    baselineHours = normalizeEscalationBaselineHours(config.escalationBaselineHours);
  } catch (_error) {
    refusal(res, {
      code: 'CONNECTSHYFT_ESCALATION_CONFIG_UNAVAILABLE',
      message: 'Escalation configuration is temporarily unavailable. Please retry.',
      refusalType: 'business',
      httpStatus: 200,
    });
    return;
  }

  const actorRoles = resolveConnectShyftActorRoles(req, context);
  const evaluated = await connectShyftThreadServiceAsync.evaluateEscalations({
    actorRoles,
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    asOfUtc,
    limit: payload.limit,
    baselineHours,
    actorUserId: resolveConnectShyftRequestedActorUserId(req),
  });

  if (!evaluated.ok) {
    refusal(res, {
      code: evaluated.code,
      message: evaluated.message,
      refusalType: 'business',
      httpStatus: 200,
    });
    return;
  }

  const syntheticOverrideMode = isConnectShyftTestOverrideEnabled()
    && !UUID_PATTERN.test(context.tenantId);
  let transitions = syntheticOverrideMode ? [] : evaluated.data.transitions;

  if (isConnectShyftTestOverrideEnabled()) {
    const syntheticTransitions = evaluateSyntheticEscalations({
      tenantId: context.tenantId,
      orgUnitId: context.orgUnitId,
      asOfUtc,
      baselineHours,
      limit: payload.limit,
      threadId: payload.threadId,
    });
    if (syntheticTransitions.length > 0) {
      transitions = syntheticOverrideMode
        ? syntheticTransitions
        : [...transitions, ...syntheticTransitions];
    }
  }

  return success(res, {
    code: evaluated.code,
    message: 'ConnectShyft escalation scheduler evaluated due threads',
    httpStatus: evaluated.httpStatus,
    data: {
      asOfUtc,
      baselineHours,
      transitions,
      effects: {
        emittedCount: transitions.length,
      },
      replaySafe: transitions.length === 0,
      skippedAlreadyProcessed: transitions.length === 0,
    },
  });
});

router.get('/internal/threads/due', async (req: Request, res: Response) => {
  if (!await enforceCapability(req, res, 'inbox')) {
    return;
  }

  const context = await enforceOrgUnitContext(req, res, parseOrgUnitIdFromQuery(req));
  if (!context) {
    return;
  }

  if (!enforceThreadViewCapability(req, res, context)) {
    return;
  }

  const actorRoles = resolveConnectShyftActorRoles(req, context);
  const listed = await connectShyftThreadServiceAsync.listDueThreads({
    actorRoles,
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    limit: parseThreadDueLimit(req),
  });

  if (!listed.ok) {
    refusal(res, {
      code: listed.code,
      message: listed.message,
      refusalType: 'business',
      httpStatus: 200,
    });
    return;
  }

  return success(res, {
    code: listed.code,
    message: 'ConnectShyft due threads listed',
    httpStatus: listed.httpStatus,
    data: {
      threads: listed.data.threads.map((thread) => ({
        ...thread,
        nextEvaluationAtUtc: thread.escalation.nextEvaluationAtUtc,
      })),
    },
  });
});

router.get('/events', async (req: Request, res: Response) => {
  if (!await enforceCapability(req, res, 'inbox')) {
    return;
  }

  const context = await enforceOrgUnitContext(req, res, parseOrgUnitIdFromQuery(req));
  if (!context) {
    return;
  }

  if (!enforceThreadViewCapability(req, res, context)) {
    return;
  }

  const filters = parseCanonicalEventFilters(req);
  const events = await listConnectShyftCanonicalEvents({
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    aggregateId: filters.aggregateId,
    aggregateType: filters.aggregateType,
    eventType: filters.eventType,
    limit: filters.limit,
    db: loadPlatformDb(),
  });

  return success(res, {
    code: 'CONNECTSHYFT_CANONICAL_EVENTS_LISTED',
    message: 'ConnectShyft canonical events listed',
    data: {
      filters: {
        aggregateId: filters.aggregateId,
        aggregateType: filters.aggregateType,
        eventType: filters.eventType,
      },
      deterministic: true,
      providerNeutral: true,
      events,
    },
  });
});

router.get('/identity-ambiguities', async (req: Request, res: Response) => {
  if (!await enforceCapability(req, res, 'module')) {
    return;
  }

  const filters = parseIdentityAmbiguityFilters(req);
  const context = await enforceOrgUnitContext(req, res);
  if (!context) {
    return;
  }

  const readScope = resolveIdentityAmbiguityReadScope(
    req,
    res,
    context,
    filters.orgUnitId,
  );
  if (!readScope) {
    return;
  }

  const listed = await listIdentityAmbiguityEvents({
    tenantId: context.tenantId,
    orgUnitId: readScope.orgUnitId,
    status: filters.status,
    normalizedContactPoint: filters.normalizedContactPoint,
    sourceContext: filters.sourceContext,
    limit: filters.limit,
    cursor: filters.cursor,
  });

  return success(res, {
    code: 'CONNECTSHYFT_IDENTITY_AMBIGUITIES_RESOLVED',
    message: 'ConnectShyft identity ambiguities resolved',
    httpStatus: 200,
    data: {
      events: listed.events,
      nextCursor: listed.nextCursor,
    },
  });
});

router.patch('/identity-ambiguities/:ambiguityEventId', async (req: Request, res: Response) => {
  if (!await enforceCapability(req, res, 'module')) {
    return;
  }

  const context = await enforceOrgUnitContext(req, res);
  if (!context) {
    return;
  }

  if (!resolveIdentityAmbiguityTenantPrivilegedScope(req, res, context)) {
    return;
  }

  const ambiguityEventId = parseIdentityAmbiguityEventIdParam(req);
  if (!ambiguityEventId) {
    respondConnectShyftClientRefusal(res, {
      code: 'CONNECTSHYFT_IDENTITY_AMBIGUITY_ID_REQUIRED',
      message: 'ambiguityEventId is required',
    });
    return;
  }

  if (!parseIdentityAmbiguityStatusUpdate(req)) {
    respondConnectShyftClientRefusal(res, {
      code: 'CONNECTSHYFT_IDENTITY_AMBIGUITY_STATUS_INVALID',
      message: 'status must be reviewed.',
      data: {
        fieldErrors: [
          {
            field: 'status',
            reason: 'INVALID',
            message: 'status must be reviewed.',
          },
        ],
      },
    });
    return;
  }

  const event = await markIdentityAmbiguityEventReviewed({
    tenantId: context.tenantId,
    ambiguityEventId,
  });

  if (!event) {
    refusal(res, {
      code: 'CONNECTSHYFT_IDENTITY_AMBIGUITY_NOT_FOUND',
      message: 'Identity ambiguity event is unavailable for the active tenant context.',
      refusalType: 'business',
      httpStatus: 200,
    });
    return;
  }

  return success(res, {
    code: 'CONNECTSHYFT_IDENTITY_AMBIGUITY_REVIEWED',
    message: 'ConnectShyft identity ambiguity reviewed',
    httpStatus: 200,
    data: {
      event,
    },
  });
});

router.get('/threads/:threadId/timeline', getConnectThreadTimeline);

const getConnectThreadDetailWithSyntheticFallback = async (req: Request, res: Response) => {
  if (!await enforceCapability(req, res, 'inbox')) {
    return;
  }

  const context = await enforceOrgUnitContext(req, res);
  if (!context) {
    return;
  }

  if (!enforceThreadViewCapability(req, res, context)) {
    return;
  }

  const threadId = parseThreadIdParam(req);
  const syntheticThread = threadId
    ? resolveSyntheticLifecycleThread({
      tenantId: context.tenantId,
      orgUnitId: context.orgUnitId,
      threadId,
    })
    : null;
  const activeBridgeSession = threadId && syntheticThread
    ? await loadConnectShyftBridgeAggregateByThreadId({
      tenantId: context.tenantId,
      threadId,
    })
    : null;

  if (
    !threadId
    || !syntheticThread
    || !activeBridgeSession
    || activeBridgeSession.session.status !== 'completed'
  ) {
    await getConnectThreadDetail(req, res);
    return;
  }

  let thread = buildSyntheticThreadDetailRecord({
    descriptor: syntheticThread,
    threadId,
    actorUserId: resolveConnectShyftRequestedActorUserId(req),
    requestedRole: resolveConnectShyftRequestedRole(req),
  });
  thread = {
    ...thread,
    actions: thread.neighborDeleted
      ? []
      : [...resolveConnectShyftThreadActions(thread.state)],
  };

  const timeline = await listCanonicalThreadEvents({
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    threadId,
    limit: CONNECTSHYFT_CANONICAL_EVENTS_MAX_LIMIT,
  });
  const shouldSynthesizeVoicemailTimeline = thread.voicemailIndicator
    || threadId.toLowerCase().includes('voicemail');
  const resolvedTimeline = timeline.length > 0
    ? timeline
    : shouldSynthesizeVoicemailTimeline
      ? [
        {
          eventId: `${thread.threadId}-voicemail-inline`,
          aggregateId: thread.threadId,
          aggregateType: 'Thread' as const,
          eventType: 'connectshyft.voicemail.inline',
          payload: {
            eventName: 'connectshyft.voicemail.inline',
            summary: thread.display?.voicemailLabel || thread.voicemailLabel || 'Voicemail received',
            metadata: {
              firstClass: true,
            },
          },
          occurredAtUtc: thread.lastActivityAtUtc || nowIsoUtc(),
          eventName: 'connectshyft.voicemail.inline',
          metadata: {
            firstClass: true,
          },
          conversationType: 'voicemail' as const,
          renderMode: 'inline' as const,
          firstClass: true,
        },
      ]
      : [];
  const voicemailArtifacts = resolveVoicemailArtifactsFromTimeline(resolvedTimeline);
  const threadWithCanonicalTimeline = {
    ...thread,
    providerNeutral: true as const,
    statusDerivedFromCanonicalEvents: true as const,
    timeline: resolvedTimeline,
  };
  return success(res, {
    code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
    message: 'ConnectShyft thread detail loaded',
    data: {
      context: {
        tenantId: context.tenantId,
        orgUnitId: context.orgUnitId,
        bypassedOrgUnitMembership: context.bypassedOrgUnitMembership,
      },
      thread: threadWithCanonicalTimeline,
      bridgeSession: activeBridgeSession
        ? buildProviderNeutralBridgeSessionState(activeBridgeSession)
        : null,
      voicemailArtifacts,
      actions: threadWithCanonicalTimeline.actions,
      actionMatrix: {
        lockedByState: true,
      },
      outboundPolicy: {
        hiddenPolicyPaths: [],
        explicitActionSurface: true,
      },
      latencyBudgetsMs: {
        p95: CONNECTSHYFT_INBOX_P95_BUDGET_MS,
        p99: CONNECTSHYFT_INBOX_P99_BUDGET_MS,
      },
    },
  });
};

router.get('/threads/:threadId', getConnectThreadDetailWithSyntheticFallback);

router.post('/threads', async (req: Request, res: Response) => {
  if (!await enforceCapability(req, res, 'inbox')) {
    return;
  }

  const payload = parseThreadEnsureBody(req);
  const context = await enforceOrgUnitContext(req, res, payload.orgUnitId);
  if (!context) {
    return;
  }

  if (!enforceThreadViewCapability(req, res, context)) {
    return;
  }

  if (!payload.neighborId) {
    refusal(res, {
      code: 'CONNECTSHYFT_NEIGHBOR_ID_REQUIRED',
      message: 'neighborId is required',
      refusalType: 'client',
      httpStatus: 400,
    });
    return;
  }

  if (!isValidConnectShyftNeighborIdentifier(payload.neighborId)) {
    respondConnectShyftClientRefusal(res, {
      code: 'CONNECTSHYFT_NEIGHBOR_ID_INVALID',
      message: 'neighborId must be a canonical identifier (UUID or slug).',
      data: {
        fieldErrors: [
          {
            field: 'neighborId',
            reason: 'INVALID',
            message: 'neighborId must be a canonical identifier (UUID or slug).',
          },
        ],
      },
    });
    return;
  }

  const requestedThreadId = parseThreadIdFromBody(req);
  if (requestedThreadId) {
    refusal(res, {
      code: 'CONNECTSHYFT_THREAD_ID_FORBIDDEN',
      message: 'threadId is server-assigned and cannot be provided.',
      refusalType: 'client',
      httpStatus: 400,
      data: {
        fieldErrors: [
          {
            field: 'threadId',
            reason: 'FORBIDDEN',
            message: 'threadId is server-assigned and cannot be provided.',
          },
        ],
      },
    });
    return;
  }

  const actorRoles = resolveConnectShyftActorRoles(req, context);
  const ensured = await connectShyftThreadServiceAsync.ensureThread({
    actorRoles,
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    neighborId: payload.neighborId,
    personId: payload.personId,
    source: payload.source,
    forcedState: payload.forcedState,
    lastInboundCsNumberId: payload.lastInboundCsNumberId,
    preferredOutboundCsNumberId: payload.preferredOutboundCsNumberId,
    actorUserId: resolveConnectShyftRequestedActorUserId(req),
    nextEvaluationAtUtc: payload.nextEvaluationAtUtc,
  });

  if (!ensured.ok) {
    refusal(res, {
      code: ensured.code,
      message: ensured.message,
      refusalType: 'business',
      httpStatus: 200,
    });
    return;
  }

  return success(res, {
    code: ensured.code,
    message: 'ConnectShyft thread ensured',
    httpStatus: ensured.httpStatus,
    data: {
      thread: ensured.data.thread,
      lifecycle: ensured.data.lifecycle,
    },
  });
});

const performOutboundAction = async ({
  req,
  res,
  outboundAction,
  context,
  threadId,
  actorUserId,
  actorRoles,
  lifecycleContext,
}: ConnectShyftThreadOutboundCoreExecutionInput): Promise<void> => {
  if (!lifecycleContext.currentState) {
    return;
  }

  const currentState = lifecycleContext.currentState;
  const outboundCallPolicyRequest = outboundAction === 'call'
    ? parseOutboundCallRequestPolicy(req)
    : null;
  if (
    outboundAction === 'call'
    && outboundCallPolicyRequest
    && !enforceOutboundCallPolicyRequest(req, res, outboundCallPolicyRequest)
  ) {
    return;
  }

  const requestedProvider = resolveConnectShyftRequestedProviderKey(req);
  const enabledProvidersHeader = normalizeLifecycleString(
    req.header('x-test-connectshyft-enabled-providers'),
  );
  const hasExplicitEnabledProviderPolicy = enabledProvidersHeader.length > 0;
  const explicitEnabledProvidersIncludeMockSandbox =
    enabledProvidersHeader.toLowerCase().includes('mock-sandbox');
  const allowImplicitTestPhoneFallback =
    !requestedProvider && !hasExplicitEnabledProviderPolicy;
  const allowPhoneFallback =
    isConnectShyftTestOverrideEnabled()
    && (
      requestedProvider === 'mock-sandbox'
      || allowImplicitTestPhoneFallback
      || explicitEnabledProvidersIncludeMockSandbox
    );
  const providerSelection = resolveConnectShyftProviderAdapter({
    req,
    operation: outboundAction,
    requestedProvider,
  });
  if (!providerSelection.ok) {
    refusal(res, {
      code: providerSelection.refusal.code,
      message: providerSelection.refusal.message,
      refusalType: providerSelection.refusal.refusalType,
      httpStatus: providerSelection.refusal.httpStatus,
      data: {
        ...providerSelection.refusal.data,
        context,
        threadId,
      },
    });
    return;
  }

  const actorScopeKey = buildConnectShyftActorScopeKey(actorUserId, actorRoles);
  const outboundMessagePolicy = outboundAction === 'message'
    ? parseOutboundMessagePolicyRequest(req)
    : null;
  const outboundDispatchIdempotencyKey = parseOutboundDispatchIdempotencyKey(req);
  const outboundIdempotencyOperation = resolveOutboundIdempotencyOperationName(outboundAction);
  const outboundCallDispatchPolicy: ConnectShyftOutboundCallDispatchPolicy | null = outboundAction === 'call'
    ? {
      transport: outboundCallPolicyRequest?.transport || CONNECTSHYFT_OUTBOUND_CALL_ALLOWED_TRANSPORT,
      autoRetry: outboundCallPolicyRequest?.autoRetry === true,
      redialPolicy: outboundCallPolicyRequest?.redialPolicy || CONNECTSHYFT_OUTBOUND_CALL_ALLOWED_REDIAL_POLICY,
    }
    : null;
  let outboundDispatchReplayKey: string | null = null;
  const resolvedThreadNeighborId = await resolveNeighborIdForThreadCorrelation({
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    threadId,
  });

  const outboundLifecycleAction = resolveOutboundLifecycleAction(outboundAction);
  const priorState = currentState;
  const dispatchEventName = resolveOutboundDispatchEventName(outboundAction);
  const postDispatchWarnings: Array<{ stage: string; code: string; message: string }> = [];

  let smsPreferenceDecision: ConnectShyftResolvedSmsPreference | null = null;
  let validatedSmsOverride: ConnectShyftValidatedSmsOverride | null = null;
  let thread: ConnectShyftThread;
  let lifecycleEvent: string | null = null;
  let sideEffects: ReturnType<typeof buildLifecycleSideEffects> | null = null;
  let outboundDispatch: ReturnType<typeof buildLifecycleSideEffects> | null = null;
  let outboundMessageTargetPhone: string | null = null;
  let outboundMessageSenderPhone: string | null = null;
  let outboundCallSenderPhone: string | null = null;
  let outboundSenderResolutionMetadata: Record<string, unknown> | null = null;
  let persistedSmsOverride: ConnectShyftPersistedSmsOverride | null = null;
  let sideEffectsPersisted = false;
  let escalationReset: { stage: number; inactivityWindow: 'reset' } | null = null;
  let bridgeSessionState: ConnectShyftBridgeSessionStateContract | null = null;
  let bridgeCorrelationMapping: ConnectShyftBridgeCorrelationMapping | null = null;

  if (lifecycleContext.detail) {
    thread = buildThreadFromDetailRecord(lifecycleContext.detail, {
      neighborId: resolvedThreadNeighborId,
    });
  } else {
    thread = buildSyntheticThread({
      tenantId: context.tenantId,
      orgUnitId: context.orgUnitId,
      threadId,
      currentState,
      nextState: currentState,
      actorUserId,
      fallbackSummary: lifecycleContext.syntheticThread?.summary,
      fallbackNeighborId: resolvedThreadNeighborId || lifecycleContext.syntheticThread?.neighborId,
      fallbackLastInboundCsNumberId: lifecycleContext.syntheticThread?.lastInboundCsNumberId,
      fallbackPreferredOutboundCsNumberId: lifecycleContext.syntheticThread?.preferredOutboundCsNumberId,
      fallbackEscalationStage: lifecycleContext.syntheticThread?.escalationStage,
      fallbackNextEvaluationAtUtc: lifecycleContext.syntheticThread?.nextEvaluationAtUtc,
    });
  }

  if (priorState === 'CLOSED') {
    const reopenedMetadata = buildLifecycleMetadata({
      tenantId: context.tenantId,
      orgUnitId: context.orgUnitId,
      actorUserId,
      threadId,
      priorState: 'CLOSED',
      newState: 'UNCLAIMED',
      action: outboundLifecycleAction,
      threadReopenedByUser: CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.reopenedByUser,
      lifecycleLineage: {
        prior_state: 'CLOSED',
        new_state: 'UNCLAIMED',
        thread_reopened_by_user: CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.reopenedByUser,
      },
    });
    const transitioned = await transitionThreadWithSideEffects({
      actorRoles,
      tenantId: context.tenantId,
      orgUnitId: context.orgUnitId,
      threadId,
      actorUserId,
      currentState: priorState,
      nextState: 'UNCLAIMED',
      syntheticThread: lifecycleContext.syntheticThread,
      detail: lifecycleContext.detail,
      sideEffects: {
        eventName: CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.reopenedByUser,
        metadata: reopenedMetadata,
      },
    });

    sideEffects = buildLifecycleSideEffects({
      eventName: CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.reopenedByUser,
      metadata: reopenedMetadata,
    });

    if (!transitioned.ok) {
      respondConnectShyftBusinessRefusal(res, {
        code: transitioned.code,
        message: transitioned.message,
        data: {
          context,
          threadId,
          lifecycle: {
            priorState: 'CLOSED',
            nextState: 'CLOSED',
            reopenedFromClosed: false,
          },
          sideEffectsPersisted: false,
          ...sideEffects,
        },
      });
      return;
    }

    thread = transitioned.thread;
    sideEffectsPersisted = transitioned.sideEffectsPersisted;
    lifecycleEvent = CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.reopenedByUser;
    escalationReset = {
      stage: 0,
      inactivityWindow: 'reset',
    };
  }

  const lifecycleMutationApplied =
    lifecycleEvent === CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.reopenedByUser;
  const buildReopenLifecycleData = (): Record<string, unknown> => {
    if (!lifecycleMutationApplied) {
      return {};
    }

    return {
      thread: {
        threadId,
        priorState: 'CLOSED',
        state: thread.state,
      },
      lifecycleEvent,
      lifecycle: {
        priorState: 'CLOSED',
        nextState: thread.state,
        reopenedFromClosed: true,
        reopenedByInbound: false,
        sameThreadId: true,
        noInboundAutoReopenSideEffects: true,
      },
      escalationReset,
      sideEffectsPersisted,
      ...(sideEffects || {}),
    };
  };

  let operatorDestinationResolution: ConnectShyftOperatorDestinationResolution | null = null;
  let claimedByUserIdForOperatorDestination: string | null = null;
  const logOutboundCallRuntimeOutcome = (outcome: ConnectShyftTelephonyRuntimeOutcome): void => {
    if (outboundAction !== 'call' || !operatorDestinationResolution) {
      return;
    }

    logConnectShyftTelephonyRuntimeOutcome({
      threadId,
      tenantId: context.tenantId,
      orgUnitId: context.orgUnitId,
      actorUserId,
      claimedByUserId: claimedByUserIdForOperatorDestination,
      senderNumber: outboundCallSenderPhone,
      operatorDestinationSource: operatorDestinationResolution.source,
      operatorDestinationResolved: Boolean(operatorDestinationResolution.phoneNumber),
      outcome,
    });
  };

  if (outboundAction === 'message' && outboundMessagePolicy) {
    const preferenceNeighborId = lifecycleContext.syntheticThread?.neighborId
      || resolvedThreadNeighborId
      || null;
    smsPreferenceDecision = await connectShyftSmsPreferenceOverrideService.resolvePreference({
      tenantId: context.tenantId,
      orgUnitId: context.orgUnitId,
      threadId,
      neighborId: preferenceNeighborId,
    });

    const overrideValidation = connectShyftSmsPreferenceOverrideService.validateOverride({
      prefersTexting: smsPreferenceDecision.prefersTexting,
      overrideReason: outboundMessagePolicy.overrideReason,
      overrideNote: outboundMessagePolicy.overrideNote,
    });

    if (!overrideValidation.ok) {
      const isOverrideRequired = overrideValidation.reason === 'required';
      refusal(res, {
        code: isOverrideRequired
          ? 'CONNECTSHYFT_SMS_OVERRIDE_REASON_REQUIRED'
          : 'CONNECTSHYFT_SMS_OVERRIDE_REASON_INVALID',
        message: overrideValidation.message,
        refusalType: 'business',
        httpStatus: 200,
        data: {
          context,
          threadId,
          preferencePolicy: {
            prefersTexting: smsPreferenceDecision.prefersTexting,
            source: smsPreferenceDecision.source,
            overrideRequired: smsPreferenceDecision.prefersTexting === 'NO',
            overrideAccepted: false,
            allowedOverrideReasons: overrideValidation.allowedReasons,
          },
          uiFeedback: {
            severity: 'warning',
            ariaLive: 'assertive',
            messageKey: isOverrideRequired
              ? 'connectshyft.override.required'
              : 'connectshyft.override.invalid',
            presentation: 'contextual-action-feedback',
            requiresAction: true,
            actionLabel: 'Add override reason',
            accessibilityHint: 'Open override reason selector and resubmit the outbound message.',
            message: overrideValidation.message,
          },
          chrome: {
            persistentOperationsBannerVisible: false,
            heavyOperationsDefaultLayout: false,
          },
          sideEffects: {
            messageDispatched: false,
            lifecycleMutationApplied,
            auditPersisted: false,
          },
          ...buildReopenLifecycleData(),
        },
      });
      return;
    }

    validatedSmsOverride = overrideValidation.overrideRequired
      ? overrideValidation.override
      : null;
  }

  const rollbackPersistedSmsOverride = async (): Promise<void> => {
    if (!persistedSmsOverride) {
      return;
    }

    try {
      await connectShyftSmsPreferenceOverrideService.rollbackApprovedOverride({
        tenantId: context.tenantId,
        orgUnitId: context.orgUnitId,
        threadId,
        overrideId: persistedSmsOverride.overrideId,
      });
      persistedSmsOverride = null;
    } catch {
      // Best effort rollback; keep persisted state reporting truthful in refusal payloads.
    }
  };

  let operatorContactPointId: string | null = null;
  let neighborContactPointId: string | null = null;
  if (outboundAction === 'call') {
    claimedByUserIdForOperatorDestination = lifecycleContext.claimedByUserId || thread.claimedByUserId || null;
    operatorDestinationResolution = await resolveOperatorDestination({
      tenantId: context.tenantId,
      orgUnitId: context.orgUnitId,
      actorUserId,
      claimedByUserId: claimedByUserIdForOperatorDestination,
    });
    operatorContactPointId = operatorDestinationResolution.phoneNumber;

    if (!operatorContactPointId && operatorDestinationResolution.source === 'none') {
      logOutboundCallRuntimeOutcome('refused');
      respondConnectShyftBusinessRefusal(res, {
        code: 'CONNECTSHYFT_OPERATOR_DESTINATION_MISSING',
        message: 'Outbound bridge calls require a resolved operator destination.',
        data: {
          context,
          threadId,
          providerResolution: {
            ...providerSelection.providerResolution,
            adapterInterfaceVersion: providerSelection.adapter.adapterInterfaceVersion,
            providerBranchingInDomain: false,
          },
          sideEffects: {
            dispatchAttempted: false,
            lifecycleMutationApplied,
            auditPersisted: false,
          },
          ...buildReopenLifecycleData(),
        },
      });
      return;
    }

    if (!operatorContactPointId) {
      logOutboundCallRuntimeOutcome('refused');
      respondConnectShyftBusinessRefusal(res, {
        code: 'CONNECTSHYFT_OPERATOR_INVALID_PHONE',
        message: 'Outbound bridge calls require a valid operator destination phone.',
        data: {
          context,
          threadId,
          providerResolution: {
            ...providerSelection.providerResolution,
            adapterInterfaceVersion: providerSelection.adapter.adapterInterfaceVersion,
            providerBranchingInDomain: false,
          },
          sideEffects: {
            dispatchAttempted: false,
            lifecycleMutationApplied,
            auditPersisted: false,
          },
          ...buildReopenLifecycleData(),
        },
      });
      return;
    }

    neighborContactPointId = outboundCallPolicyRequest?.targetPhone || null;
    if (!neighborContactPointId && thread.neighborId && UUID_PATTERN.test(thread.neighborId)) {
      const resolvedNeighbor = await connectShyftNeighborServiceAsync.resolveNeighbor({
        tenantId: context.tenantId,
        neighborId: thread.neighborId,
        actorRoles,
      });
      if (resolvedNeighbor.ok) {
        neighborContactPointId = resolvedNeighbor.data.neighbor.phones
          .filter((phone) => phone.isActive !== false)
          .sort((left, right) => left.sortOrder - right.sortOrder)
          [0]?.value || null;
      }
    }
    if (!neighborContactPointId) {
      neighborContactPointId = resolveTestOverridePhoneFallback({
        allowTestFallback: allowPhoneFallback,
        primarySeed: thread.neighborId,
        secondarySeed: threadId,
      });
    }

    if (!neighborContactPointId) {
      logOutboundCallRuntimeOutcome('refused');
      respondConnectShyftBusinessRefusal(res, {
        code: 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED',
        message: 'Outbound bridge calls require a dialable neighbor phone.',
        data: {
          context,
          threadId,
          providerResolution: {
            ...providerSelection.providerResolution,
            adapterInterfaceVersion: providerSelection.adapter.adapterInterfaceVersion,
            providerBranchingInDomain: false,
          },
          sideEffects: {
            dispatchAttempted: false,
            lifecycleMutationApplied,
            auditPersisted: false,
          },
          ...buildReopenLifecycleData(),
        },
      });
      return;
    }
  }

  if (outboundAction === 'message') {
    const smsTargetResolution = await resolveConnectShyftSmsTarget({
      tenantId: context.tenantId,
      orgUnitId: context.orgUnitId,
      threadId,
      thread,
      actorRoles,
      requestedTargetPhone: outboundMessagePolicy?.targetPhone || null,
      allowTestFallback: allowPhoneFallback,
    });
    if (!smsTargetResolution.ok) {
      refusal(res, {
        code: smsTargetResolution.code,
        message: smsTargetResolution.message,
        refusalType: 'business',
        httpStatus: 200,
        data: {
          context,
          threadId,
          preferencePolicy: {
            prefersTexting: smsPreferenceDecision?.prefersTexting || 'UNKNOWN',
            source: smsPreferenceDecision?.source || 'unknown',
            overrideRequired: smsPreferenceDecision?.prefersTexting === 'NO',
            overrideAccepted: smsPreferenceDecision?.prefersTexting !== 'NO'
              || Boolean(validatedSmsOverride),
            ...(validatedSmsOverride
              ? {
                override: {
                  reason: validatedSmsOverride.reason,
                  note: validatedSmsOverride.note,
                },
              }
              : {}),
          },
          ...smsTargetResolution.data,
          chrome: {
            persistentOperationsBannerVisible: false,
            heavyOperationsDefaultLayout: false,
          },
          sideEffects: {
            messageDispatched: false,
            lifecycleMutationApplied,
            auditPersisted: false,
          },
          ...buildReopenLifecycleData(),
        },
      });
      return;
    }

    outboundMessageTargetPhone = smsTargetResolution.targetPhone;
    const dispatchReadySmsTarget = ensureConnectShyftDispatchReadySmsTarget({
      resolvedTargetPhone: outboundMessageTargetPhone,
      requestedTargetPhone: outboundMessagePolicy?.targetPhone || null,
      threadNeighborId: thread.neighborId,
    });
    if (!dispatchReadySmsTarget.ok) {
      refusal(res, {
        code: dispatchReadySmsTarget.code,
        message: dispatchReadySmsTarget.message,
        refusalType: 'business',
        httpStatus: 200,
        data: {
          context,
          threadId,
          preferencePolicy: {
            prefersTexting: smsPreferenceDecision?.prefersTexting || 'UNKNOWN',
            source: smsPreferenceDecision?.source || 'unknown',
            overrideRequired: smsPreferenceDecision?.prefersTexting === 'NO',
            overrideAccepted: smsPreferenceDecision?.prefersTexting !== 'NO'
              || Boolean(validatedSmsOverride),
            ...(validatedSmsOverride
              ? {
                override: {
                  reason: validatedSmsOverride.reason,
                  note: validatedSmsOverride.note,
                },
              }
              : {}),
          },
          ...dispatchReadySmsTarget.data,
          chrome: {
            persistentOperationsBannerVisible: false,
            heavyOperationsDefaultLayout: false,
          },
          sideEffects: {
            messageDispatched: false,
            lifecycleMutationApplied,
            auditPersisted: false,
          },
          ...buildReopenLifecycleData(),
        },
      });
      return;
    }

    outboundMessageTargetPhone = dispatchReadySmsTarget.targetPhone;

    const smsSenderResolution = await resolveConnectShyftSmsSender({
      tenantId: context.tenantId,
      orgUnitId: context.orgUnitId,
      thread,
      preferredOutboundLabel: lifecycleContext.detail?.preferredOutboundContext.label || null,
    });
    if (!smsSenderResolution.ok) {
      refusal(res, {
        code: smsSenderResolution.code,
        message: smsSenderResolution.message,
        refusalType: 'business',
        httpStatus: 200,
        data: {
          context,
          threadId,
          preferencePolicy: {
            prefersTexting: smsPreferenceDecision?.prefersTexting || 'UNKNOWN',
            source: smsPreferenceDecision?.source || 'unknown',
            overrideRequired: smsPreferenceDecision?.prefersTexting === 'NO',
            overrideAccepted: smsPreferenceDecision?.prefersTexting !== 'NO'
              || Boolean(validatedSmsOverride),
            ...(validatedSmsOverride
              ? {
                override: {
                  reason: validatedSmsOverride.reason,
                  note: validatedSmsOverride.note,
                },
              }
              : {}),
          },
          ...smsSenderResolution.data,
          chrome: {
            persistentOperationsBannerVisible: false,
            heavyOperationsDefaultLayout: false,
          },
          sideEffects: {
            messageDispatched: false,
            lifecycleMutationApplied,
            auditPersisted: false,
          },
          ...buildReopenLifecycleData(),
        },
      });
      return;
    }

    outboundMessageSenderPhone = smsSenderResolution.senderPhone;
    outboundSenderResolutionMetadata = {
      source: smsSenderResolution.source,
      channel: 'sms',
      senderPhone: smsSenderResolution.senderPhone,
      orgUnitId: smsSenderResolution.metadata.orgUnitId,
      selectedMappingId: smsSenderResolution.metadata.selectedMappingId,
      selectedMappingLabel: smsSenderResolution.metadata.selectedMappingLabel,
      alignedFrom: smsSenderResolution.metadata.alignedFrom,
      threadHints: smsSenderResolution.metadata.threadHints,
    };
  }

  if (outboundAction === 'call') {
    const voiceSenderResolution = await resolveSenderNumber(
      {
        tenantId: context.tenantId,
        orgUnitId: context.orgUnitId,
        threadId,
        channel: 'voice',
      },
      {
        loadThread: async () => thread,
      },
    );
    if (!voiceSenderResolution.ok) {
      const voiceSenderCode = voiceSenderResolution.reason === 'sender_mapping_ambiguous'
        ? 'CONNECTSHYFT_CALL_SENDER_AMBIGUOUS'
        : 'CONNECTSHYFT_CALL_SENDER_REQUIRED';
      logOutboundCallRuntimeOutcome('refused');
      refusal(res, {
        code: voiceSenderCode,
        message: voiceSenderResolution.reason === 'sender_mapping_ambiguous'
          ? 'Resolve the mapped ConnectShyft outbound line so exactly one active scoped mapping remains before starting a call.'
          : 'Persist one valid mapped ConnectShyft outbound line on the thread before starting a call.',
        refusalType: 'business',
        httpStatus: 200,
        data: {
          context,
          threadId,
          senderResolution: {
            reason: voiceSenderResolution.reason,
            source: 'thread_alignment',
            channel: 'voice',
            orgUnitId: voiceSenderResolution.routingMetadata.orgUnitId,
            candidateProviderNumberE164: voiceSenderResolution.routingMetadata.candidateProviderNumberE164,
          },
          chrome: {
            persistentOperationsBannerVisible: false,
            heavyOperationsDefaultLayout: false,
          },
          sideEffects: {
            messageDispatched: false,
            lifecycleMutationApplied,
            auditPersisted: false,
          },
          ...buildReopenLifecycleData(),
        },
      });
      return;
    }

    outboundCallSenderPhone = voiceSenderResolution.providerNumberE164;
    outboundSenderResolutionMetadata = {
      source: voiceSenderResolution.routingMetadata.source,
      channel: 'voice',
      senderPhone: voiceSenderResolution.providerNumberE164,
      orgUnitId: voiceSenderResolution.routingMetadata.orgUnitId,
      selectedMappingId: voiceSenderResolution.mappingId,
      selectedMappingLabel: voiceSenderResolution.routingMetadata.mappingLabel,
      alignedFrom: voiceSenderResolution.routingMetadata.alignedFrom,
    };
  }

  outboundDispatchReplayKey = buildTelephonyDispatchReplayKey({
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    threadId,
    providerKey: providerSelection.providerResolution.resolvedProvider,
    action: outboundAction,
    idempotencyKey: outboundDispatchIdempotencyKey,
    actorId: actorUserId,
    targetPhone: outboundAction === 'call'
      ? neighborContactPointId
      : outboundMessageTargetPhone,
    senderPhone: outboundAction === 'message'
      ? outboundMessageSenderPhone
      : outboundCallSenderPhone,
    operatorContactPointId: outboundAction === 'call'
      ? operatorContactPointId
      : null,
    body: outboundMessagePolicy?.body || null,
    callPolicy: outboundCallDispatchPolicy,
  });

  const communicationReliabilityDb = isConnectShyftTestOverrideEnabled()
    ? undefined
    : loadPlatformDb();
  const outboundIdempotencyRecord = (
    outboundDispatchIdempotencyKey
    && outboundDispatchReplayKey
  )
    ? await beginConnectShyftCommunicationIdempotency({
      tenantId: context.tenantId,
      idempotencyKey: outboundDispatchIdempotencyKey,
      operationName: outboundIdempotencyOperation,
      actorId: actorUserId,
      actorScopeKey,
      requestFingerprint: outboundDispatchReplayKey,
      requestSummary: JSON.stringify({
        outboundAction,
        threadId,
        providerKey: providerSelection.providerResolution.resolvedProvider,
        targetPhone: outboundAction === 'call'
          ? neighborContactPointId
          : outboundMessageTargetPhone,
        senderPhone: outboundAction === 'message'
          ? outboundMessageSenderPhone
          : outboundCallSenderPhone,
        operatorContactPointId,
        senderResolution: outboundSenderResolutionMetadata,
      }),
      expiresAt: new Date(Date.now() + CONNECTSHYFT_COMMUNICATION_IDEMPOTENCY_TTL_MS),
      db: communicationReliabilityDb,
    })
    : null;
  if (outboundIdempotencyRecord?.decision === 'conflict') {
    logOutboundCallRuntimeOutcome('refused');
    respondConnectShyftBusinessRefusal(res, {
      code: 'CONNECTSHYFT_IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD',
      message: 'Idempotency key cannot be reused for a materially different outbound request.',
      data: {
        context,
        threadId,
        idempotency: {
          duplicate: false,
          conflict: true,
          idempotencyKey: outboundDispatchIdempotencyKey,
        },
      },
    });
    return;
  }
  if (outboundIdempotencyRecord?.decision === 'in_progress') {
    logOutboundCallRuntimeOutcome('refused');
    respondConnectShyftBusinessRefusal(res, {
      code: 'CONNECTSHYFT_IDEMPOTENT_OPERATION_IN_PROGRESS',
      message: 'An identical outbound request is already in progress.',
      data: {
        context,
        threadId,
        idempotency: {
          duplicate: false,
          conflict: false,
          inProgress: true,
          idempotencyKey: outboundDispatchIdempotencyKey,
        },
      },
    });
    return;
  }
  if (outboundIdempotencyRecord?.decision === 'return_existing') {
    const replaySnapshot = parseConnectShyftIdempotencyResponseSnapshot(
      outboundIdempotencyRecord.record.responseSnapshot,
    );
    if (replaySnapshot) {
      const replayBody = (
        replaySnapshot.body
        && typeof replaySnapshot.body === 'object'
        && !Array.isArray(replaySnapshot.body)
      )
        ? replaySnapshot.body as {
          ok?: unknown;
          code?: unknown;
          message?: unknown;
          data?: Record<string, unknown>;
        }
        : null;
      const replayData = replayBody?.data && typeof replayBody.data === 'object'
        ? replayBody.data
        : {};
      await appendConnectShyftCommunicationAudit({
        tenantId: context.tenantId,
        correlationId: outboundDispatchReplayKey || randomUUID(),
        actorType: actorUserId ? 'user' : 'system',
        actorId: actorUserId,
        operationName: outboundIdempotencyOperation,
        targetEntityType: outboundAction === 'call' ? 'bridge_session' : 'message_dispatch',
        targetEntityId: threadId,
        channel: outboundAction === 'call' ? 'bridge' : 'sms',
        resultState: 'ignored_duplicate',
        resultCode: 'CONNECTSHYFT_DUPLICATE_REQUEST_REPLAYED',
        resultMessage: 'Duplicate outbound request replayed from durable idempotency state.',
        idempotencyKey: outboundDispatchIdempotencyKey,
        requestFingerprint: outboundDispatchReplayKey,
        providerName: providerSelection.providerResolution.resolvedProvider,
        metadata: {
          duplicate: true,
          threadId,
          senderResolution: outboundSenderResolutionMetadata,
        },
        db: communicationReliabilityDb,
      });
      res.status(replaySnapshot.httpStatus).json(replayBody
        ? {
          ...replayBody,
          data: {
            ...replayData,
            replaySafe: {
              ...(replayData.replaySafe && typeof replayData.replaySafe === 'object'
                ? replayData.replaySafe
                : {}),
              duplicate: true,
              replayKey: outboundDispatchReplayKey,
            },
          },
        }
        : replaySnapshot.body);
      return;
    }
    logOutboundCallRuntimeOutcome('refused');
    respondConnectShyftBusinessRefusal(res, {
      code: 'CONNECTSHYFT_IDEMPOTENT_REPLAY_UNAVAILABLE',
      message: 'Idempotent replay state is unavailable for this completed outbound request.',
      data: {
        context,
        threadId,
        idempotency: {
          duplicate: true,
          replayUnavailable: true,
          idempotencyKey: outboundDispatchIdempotencyKey,
        },
      },
    });
    return;
  }
  if (
    outboundAction === 'message'
    && smsPreferenceDecision?.prefersTexting === 'NO'
    && validatedSmsOverride
  ) {
    try {
      persistedSmsOverride = await connectShyftSmsPreferenceOverrideService.persistApprovedOverride({
        tenantId: context.tenantId,
        orgUnitId: context.orgUnitId,
        threadId,
        neighborId: smsPreferenceDecision.neighborId,
        actorUserId,
        preferenceValue: 'NO',
        override: validatedSmsOverride,
        messageBody: outboundMessagePolicy?.body || '',
        messageEventName: 'connectshyft.thread.outbound_message_dispatched',
      });
    } catch (error) {
      const persistenceMessage = error instanceof Error
        ? error.message
        : 'Outbound SMS override persistence is unavailable.';
      const persistenceCode = error instanceof ConnectShyftSmsOverridePersistenceUnavailableError
        ? error.code
        : 'CONNECTSHYFT_SMS_OVERRIDE_AUDIT_UNAVAILABLE';

      refusal(res, {
        code: persistenceCode,
        message: 'Outbound SMS cannot be sent because override persistence is unavailable.',
        refusalType: 'business',
        httpStatus: 200,
        data: {
          context,
          threadId,
          preferencePolicy: {
            prefersTexting: smsPreferenceDecision.prefersTexting,
            source: smsPreferenceDecision.source,
            overrideRequired: true,
            overrideAccepted: false,
            override: {
              reason: validatedSmsOverride.reason,
              note: validatedSmsOverride.note,
            },
          },
          uiFeedback: {
            severity: 'warning',
            ariaLive: 'assertive',
            messageKey: 'connectshyft.override.audit_unavailable',
            presentation: 'contextual-action-feedback',
            requiresAction: true,
            actionLabel: 'Retry send',
            accessibilityHint: 'Retry sending after override persistence becomes available.',
            message: persistenceMessage,
          },
          chrome: {
            persistentOperationsBannerVisible: false,
            heavyOperationsDefaultLayout: false,
          },
          sideEffects: {
            messageDispatched: false,
            lifecycleMutationApplied,
            auditPersisted: false,
          },
          ...buildReopenLifecycleData(),
        },
      });
      return;
    }
  }

  let providerDispatch: ConnectShyftProviderDispatchResult;
  try {
    providerDispatch = outboundAction === 'call'
      ? await (async () => {
        const bridgeStart = await startConnectShyftBridgeSession({
          tenantId: context.tenantId,
          orgUnitId: context.orgUnitId,
          threadId,
          operatorParticipantId: actorUserId || 'unknown-operator',
          neighborParticipantId: thread.neighborId,
          operatorContactPointId: operatorContactPointId || '',
          neighborContactPointId: neighborContactPointId || '',
          selectedOutboundContactPointId: outboundCallSenderPhone,
          providerKey: providerSelection.providerResolution.resolvedProvider,
          providerAdapter: providerSelection.adapter,
          idempotencyKey: outboundDispatchIdempotencyKey || undefined,
          auditCorrelationId: outboundDispatchReplayKey || undefined,
          callPolicy: outboundCallDispatchPolicy || undefined,
        });
        const bridgeSessionId = normalizeLifecycleString(bridgeStart.aggregate.session.id);
        const operatorProviderLegId = normalizeLifecycleString(bridgeStart.aggregate.operatorLeg.providerCallId);
        const neighborProviderLegId = normalizeLifecycleString(bridgeStart.aggregate.neighborLeg.providerCallId);

        if (bridgeSessionId) {
          await persistConnectShyftBridgeLegProviderCallControlIdIfPresentAsync({
            bridgeSessionId,
            tenantId: context.tenantId,
            orgUnitId: context.orgUnitId,
            legRole: 'operator',
            providerCallControlId: operatorProviderLegId,
          });
          await persistConnectShyftBridgeLegProviderCallControlIdIfPresentAsync({
            bridgeSessionId,
            tenantId: context.tenantId,
            orgUnitId: context.orgUnitId,
            legRole: 'neighbor',
            providerCallControlId: neighborProviderLegId,
          });
          await persistConnectShyftNeighborRingStartedAtIfNeededAsync({
            bridgeSessionId,
            tenantId: context.tenantId,
            orgUnitId: context.orgUnitId,
            neighborLegState: bridgeStart.aggregate.neighborLeg.status,
            neighborProviderLegId,
          });
          await scheduleConnectShyftNeighborRingTimeoutAsync({
            tenantId: context.tenantId,
            orgUnitId: context.orgUnitId,
            threadId,
            bridgeSessionId,
            neighborProviderLegId,
            timeoutMs: CONNECTSHYFT_NEIGHBOR_RING_TIMEOUT_MS,
          });
        }

        bridgeSessionState = buildProviderNeutralBridgeSessionState(bridgeStart.aggregate);
        bridgeCorrelationMapping = bridgeStart.correlationMapping;

        return {
          providerKey: providerSelection.providerResolution.resolvedProvider,
          channel: 'call' as const,
          providerLegId: bridgeStart.aggregate.operatorLeg.providerCallId || null,
          providerMessageId: null,
          adapterInvoked: true as const,
          providerBranchingInDomain: false as const,
          requestedAt: bridgeStart.aggregate.operatorLeg.updatedAt.toISOString(),
        };
      })()
      : await (async () => {
        return providerSelection.adapter.sendSms({
          tenantId: context.tenantId,
          orgUnitId: context.orgUnitId,
          threadId,
          providerKey: providerSelection.providerResolution.resolvedProvider,
          idempotencyKey: outboundDispatchIdempotencyKey || undefined,
          body: outboundMessagePolicy?.body || '',
          targetPhone: outboundMessageTargetPhone || undefined,
          senderPhone: outboundMessageSenderPhone || undefined,
        });
      })();
  } catch (error) {
    await rollbackPersistedSmsOverride();

    if (error instanceof ConnectShyftProviderDispatchPolicyError) {
      const refusalPayload = {
        code: error.code,
        message: error.message,
        data: {
          context,
          threadId,
          providerResolution: {
            ...providerSelection.providerResolution,
            adapterInterfaceVersion: providerSelection.adapter.adapterInterfaceVersion,
            providerBranchingInDomain: false,
          },
          sideEffects: {
            dispatchAttempted: false,
            lifecycleMutationApplied,
            auditPersisted: Boolean(persistedSmsOverride),
          },
          providerCallPolicy: error.data,
          ...buildReopenLifecycleData(),
        },
      };
      if (outboundIdempotencyRecord?.decision === 'proceed') {
        await completeConnectShyftCommunicationIdempotency({
          record: outboundIdempotencyRecord.record,
          status: 'failed',
          responseSnapshot: {
            httpStatus: 200,
            body: {
              ok: false,
              code: refusalPayload.code,
              message: refusalPayload.message,
              data: refusalPayload.data,
            },
          },
          failureMessage: error.message,
          db: communicationReliabilityDb,
        });
      }
      await appendConnectShyftCommunicationAudit({
        tenantId: context.tenantId,
        correlationId: outboundDispatchReplayKey || randomUUID(),
        actorType: actorUserId ? 'user' : 'system',
        actorId: actorUserId,
        operationName: outboundIdempotencyOperation,
        targetEntityType: outboundAction === 'call' ? 'bridge_session' : 'message_dispatch',
        targetEntityId: threadId,
        channel: outboundAction === 'call' ? 'bridge' : 'sms',
        resultState: 'failed',
        resultCode: error.code,
        resultMessage: error.message,
      idempotencyKey: outboundDispatchIdempotencyKey,
      requestFingerprint: outboundDispatchReplayKey,
      providerName: providerSelection.providerResolution.resolvedProvider,
      metadata: {
        ...(error.data || {}),
        senderResolution: outboundSenderResolutionMetadata,
      },
      db: communicationReliabilityDb,
    });
      logOutboundCallRuntimeOutcome('refused');
      respondConnectShyftBusinessRefusal(res, refusalPayload);
      return;
    }

    const providerFailureClassification = isTelephonyProviderFailure(error)
      ? error.classification
      : null;
    const refusalPayload = {
      code: 'CONNECTSHYFT_PROVIDER_DISPATCH_FAILED',
      message: 'Provider dispatch failed before persistence.',
      data: {
        context,
        threadId,
        providerResolution: {
          ...providerSelection.providerResolution,
          adapterInterfaceVersion: providerSelection.adapter.adapterInterfaceVersion,
          providerBranchingInDomain: false,
        },
        sideEffects: {
          dispatchAttempted: true,
          lifecycleMutationApplied,
          auditPersisted: Boolean(persistedSmsOverride),
        },
        providerFailureClassification,
        error: error instanceof Error ? error.message : 'unknown-provider-dispatch-error',
        ...buildReopenLifecycleData(),
      },
    };
    if (outboundIdempotencyRecord?.decision === 'proceed') {
      await completeConnectShyftCommunicationIdempotency({
        record: outboundIdempotencyRecord.record,
        status: 'failed',
        responseSnapshot: {
          httpStatus: 200,
          body: {
            ok: false,
            code: refusalPayload.code,
            message: refusalPayload.message,
            data: refusalPayload.data,
          },
        },
        failureSnapshot: providerFailureClassification,
        failureMessage: error instanceof Error ? error.message : 'unknown-provider-dispatch-error',
        db: communicationReliabilityDb,
      });
    }
    await appendConnectShyftCommunicationAudit({
      tenantId: context.tenantId,
      correlationId: outboundDispatchReplayKey || randomUUID(),
      actorType: actorUserId ? 'user' : 'system',
      actorId: actorUserId,
      operationName: outboundIdempotencyOperation,
      targetEntityType: outboundAction === 'call' ? 'bridge_session' : 'message_dispatch',
      targetEntityId: threadId,
      channel: outboundAction === 'call' ? 'bridge' : 'sms',
      resultState: providerFailureClassification?.retryable ? 'retrying' : 'failed',
      resultCode: refusalPayload.code,
      resultMessage: refusalPayload.message,
      idempotencyKey: outboundDispatchIdempotencyKey,
      requestFingerprint: outboundDispatchReplayKey,
      providerName: providerSelection.providerResolution.resolvedProvider,
      providerReferenceId: providerFailureClassification?.providerCode || null,
      metadata: {
        providerFailureClassification,
        error: error instanceof Error ? error.message : 'unknown-provider-dispatch-error',
        senderResolution: outboundSenderResolutionMetadata,
      },
      db: communicationReliabilityDb,
    });
    logOutboundCallRuntimeOutcome('refused');
    respondConnectShyftBusinessRefusal(res, refusalPayload);
    return;
  }

  const resolvedSenderPhoneForThreadAlignment = outboundAction === 'call'
    ? outboundCallSenderPhone
    : outboundMessageSenderPhone;
  if (resolvedSenderPhoneForThreadAlignment) {
    const senderAlignmentPersistence = await persistResolvedSenderAlignmentForThread({
      tenantId: context.tenantId,
      orgUnitId: context.orgUnitId,
      actorUserId,
      thread,
      providerNumberE164: resolvedSenderPhoneForThreadAlignment,
    });
    if (!senderAlignmentPersistence.ok) {
      postDispatchWarnings.push({
        stage: 'thread-sender-alignment',
        code: senderAlignmentPersistence.code,
        message: senderAlignmentPersistence.message,
      });
    } else {
      thread = senderAlignmentPersistence.thread;
    }
  }

  const reopenedLifecycleLineage = lifecycleMutationApplied
    ? {
      prior_state: 'CLOSED',
      new_state: 'UNCLAIMED',
      thread_reopened_by_user: CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.reopenedByUser,
    }
    : null;
  const outboundDispatchMetadata = buildLifecycleMetadata({
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId,
    threadId,
    priorState: thread.state,
    newState: thread.state,
    action: outboundLifecycleAction,
    threadReopenedByUser: lifecycleMutationApplied
      ? CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.reopenedByUser
      : null,
    lifecycleLineage: reopenedLifecycleLineage,
  });
  const expectedDispatchSideEffects = buildLifecycleSideEffects({
    eventName: dispatchEventName,
    metadata: outboundDispatchMetadata,
  });

  const persistedDispatch = await persistOutboundDispatchSideEffects({
    tenantId: context.tenantId,
    threadId,
    actorUserId,
    eventName: dispatchEventName,
    metadata: outboundDispatchMetadata,
  });

  if (!persistedDispatch.ok) {
    sideEffectsPersisted = false;
    if (!sideEffects) {
      sideEffects = expectedDispatchSideEffects;
    }
    outboundDispatch = expectedDispatchSideEffects;
    postDispatchWarnings.push({
      stage: 'outbound-side-effects',
      code: persistedDispatch.code,
      message: persistedDispatch.message,
    });
  } else {
    sideEffectsPersisted = sideEffects
      ? sideEffectsPersisted && persistedDispatch.sideEffectsPersisted
      : persistedDispatch.sideEffectsPersisted;
    if (!sideEffects) {
      sideEffects = persistedDispatch.sideEffects;
    }
    outboundDispatch = persistedDispatch.sideEffects;
  }

  let canonicalEvent: ConnectShyftCanonicalEventRecord | null = null;
  try {
    canonicalEvent = await recordCanonicalThreadEvent({
      tenantId: context.tenantId,
      orgUnitId: context.orgUnitId,
      threadId,
      eventType: resolveCanonicalEventTypeForOutboundAction(outboundAction),
      payload: buildCanonicalPayloadForOutboundAction({
        outboundAction,
        threadState: thread.state,
        lifecycleEvent: dispatchEventName,
        reopenedFromClosed: lifecycleEvent === CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.reopenedByUser,
        actor: actorUserId ? 'user' : 'system',
        messageBody: outboundMessagePolicy?.body || null,
        senderPhone: outboundAction === 'call'
          ? outboundCallSenderPhone
          : outboundMessageSenderPhone,
        targetPhone: outboundAction === 'call'
          ? (outboundCallPolicyRequest?.targetPhone || neighborContactPointId || null)
          : outboundMessageTargetPhone,
      }),
      actorUserId,
    });
  } catch (error) {
    postDispatchWarnings.push({
      stage: 'canonical-event',
      code: 'CONNECTSHYFT_CANONICAL_EVENT_PERSISTENCE_UNAVAILABLE',
      message: error instanceof Error
        ? error.message
        : 'Canonical event persistence unavailable.',
    });
  }

  let correlationMapping: Record<string, unknown> = {
    deterministic: true,
    callLegMapping: 'ignored',
    messageMapping: 'ignored',
    error: null,
  };

  const resolvedBridgeCorrelationMapping =
    bridgeCorrelationMapping as ConnectShyftBridgeCorrelationMapping | null;

  if (outboundAction === 'call' && resolvedBridgeCorrelationMapping) {
    correlationMapping = resolvedBridgeCorrelationMapping;
    if (resolvedBridgeCorrelationMapping.error) {
      postDispatchWarnings.push({
        stage: 'provider-correlation',
        code: resolvedBridgeCorrelationMapping.error.code,
        message: resolvedBridgeCorrelationMapping.error.message,
      });
    }
  } else if (canonicalEvent) {
    correlationMapping = await persistOutboundProviderIdentifierMappings({
      tenantId: context.tenantId,
      orgUnitId: context.orgUnitId,
      threadId,
      providerName: providerDispatch.providerKey,
      dispatch: providerDispatch,
      canonicalEventId: canonicalEvent.eventId,
    });
    const outboundProviderCorrelation =
      correlationMapping as Awaited<ReturnType<typeof persistOutboundProviderIdentifierMappings>>;
    if (outboundProviderCorrelation.error) {
      postDispatchWarnings.push({
        stage: 'provider-correlation',
        code: outboundProviderCorrelation.error.code,
        message: outboundProviderCorrelation.error.message,
      });
    }
  } else if (providerDispatch.providerLegId || providerDispatch.providerMessageId) {
    postDispatchWarnings.push({
      stage: 'provider-correlation',
      code: 'CONNECTSHYFT_PROVIDER_CORRELATION_SKIPPED',
      message: 'Provider correlation mapping skipped because canonical event persistence failed.',
    });
  }

  const hasPostDispatchWarnings = postDispatchWarnings.length > 0;
  const reopenedFromClosed = lifecycleEvent === CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.reopenedByUser;
  const dispatchContext = {
    targetPhone: outboundAction === 'call'
      ? (outboundCallPolicyRequest?.targetPhone || neighborContactPointId || null)
      : outboundMessageTargetPhone || null,
    messageBodyProvided: outboundAction === 'message'
      ? Boolean(outboundMessagePolicy?.body)
      : false,
  };
  const operatorFeedback = hasPostDispatchWarnings
    ? 'Outbound dispatch completed with persistence warnings. Review traceability details before retrying.'
    : priorState === 'CLOSED'
      ? 'Conversation reopened on the same thread and outbound dispatch completed. Escalation and inactivity timers were reset.'
      : priorState === 'UNCLAIMED'
        ? 'Outbound dispatched. Escalation continues until claim; no reset was applied.'
        : 'Outbound dispatched from a claimed thread. Escalation remains stable unless ownership changes.';
  const operatorFeedbackHeading = hasPostDispatchWarnings
    ? 'Outbound dispatch completed with warnings.'
    : priorState === 'CLOSED'
      ? 'Conversation reopened and outbound dispatch completed.'
      : 'Outbound dispatch completed.';
  const uiFeedbackMessage = hasPostDispatchWarnings
    ? operatorFeedback
    : outboundAction === 'message'
      && smsPreferenceDecision?.prefersTexting === 'NO'
      && validatedSmsOverride
      ? 'Override applied. Outbound message dispatched.'
      : operatorFeedback;
  const uiFeedbackMessageKey = hasPostDispatchWarnings
    ? 'connectshyft.outbound.dispatch_warning'
    : priorState === 'CLOSED'
      ? 'connectshyft.thread.reopened_dispatch_success'
      : outboundAction === 'call'
        ? 'connectshyft.outbound.call.dispatched'
        : 'connectshyft.outbound.message.dispatched';
  const uiFeedback = {
    severity: hasPostDispatchWarnings ? ('warning' as const) : ('success' as const),
    ariaLive: 'polite' as const,
    messageKey: uiFeedbackMessageKey,
    presentation: 'contextual-action-feedback' as const,
    message: uiFeedbackMessage,
    heading: operatorFeedbackHeading,
    hiddenTransition: false,
  };
  const responseCode = outboundAction === 'call'
    ? 'CONNECTSHYFT_THREAD_CALL_DISPATCHED'
    : 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED';
  const responseMessage = outboundAction === 'call'
    ? 'ConnectShyft outbound call dispatched'
    : 'ConnectShyft outbound message dispatched';
  const responseData: Record<string, unknown> = {
    threadId,
    context,
    thread,
    lifecycleEvent,
    lifecycle: {
      priorState,
      nextState: thread.state,
      reopenedFromClosed,
      reopenedByInbound: false,
      sameThreadId: true,
      noInboundAutoReopenSideEffects: true,
    },
    operatorFeedback,
    operatorFeedbackMeta: {
      heading: operatorFeedbackHeading,
      hiddenTransition: false,
    },
    uiFeedback,
    chrome: {
      persistentOperationsBannerVisible: false,
      heavyOperationsDefaultLayout: false,
    },
    escalationReset,
    sideEffectsPersisted,
    providerResolution: {
      ...providerSelection.providerResolution,
      adapterInterfaceVersion: providerSelection.adapter.adapterInterfaceVersion,
      providerBranchingInDomain: false,
    },
    canonicalEvent,
    ...(outboundSenderResolutionMetadata
      ? {
        senderResolution: outboundSenderResolutionMetadata,
      }
      : {}),
    dispatch: {
      ...providerDispatch,
      dispatchContext,
    },
    correlationMapping,
    replaySafe: {
      duplicate: false,
      replayKey: outboundDispatchReplayKey,
    },
    ...(postDispatchWarnings.length > 0
      ? { postDispatchWarnings }
      : {}),
    ...(outboundAction === 'call'
      ? {
          call: CONNECTSHYFT_OUTBOUND_CALL_POLICY,
          autoClaimPolicy: CONNECTSHYFT_OUTBOUND_CALL_AUTO_CLAIM_POLICY,
          bridgeSession: bridgeSessionState,
        }
      : {
          preferencePolicy: {
            prefersTexting: smsPreferenceDecision?.prefersTexting || 'UNKNOWN',
            source: smsPreferenceDecision?.source || 'unknown',
            overrideRequired: smsPreferenceDecision?.prefersTexting === 'NO',
            overrideAccepted: smsPreferenceDecision?.prefersTexting !== 'NO'
              || Boolean(validatedSmsOverride),
            ...(validatedSmsOverride
              ? {
                override: {
                  reason: validatedSmsOverride.reason,
                  note: validatedSmsOverride.note,
                  overrideId: persistedSmsOverride?.overrideId || null,
                  durability: persistedSmsOverride?.durability || null,
                  createdAtUtc: persistedSmsOverride?.createdAtUtc || null,
                  audit: persistedSmsOverride
                    ? {
                      eventName: persistedSmsOverride.messageEventName,
                      metadata: persistedSmsOverride.auditMetadata,
                    }
                    : null,
                },
              }
              : {}),
          },
          sideEffects: {
            messageDispatched: true,
            lifecycleMutationApplied: reopenedFromClosed,
            auditPersisted: Boolean(persistedSmsOverride),
          },
        }),
    ...(sideEffects || {}),
    ...(outboundDispatch ? { outboundDispatch } : {}),
  };
  const bridgeSessionId = (
    bridgeSessionState as ConnectShyftBridgeSessionStateContract | null
  )?.bridgeSessionId || null;
  if (outboundIdempotencyRecord?.decision === 'proceed') {
    await completeConnectShyftCommunicationIdempotency({
      record: outboundIdempotencyRecord.record,
      status: 'succeeded',
      responseSnapshot: {
        httpStatus: 200,
        body: {
          ok: true,
          code: responseCode,
          message: responseMessage,
          data: responseData,
        },
      },
      resourceType: outboundAction === 'call' ? 'bridge_session' : 'message_dispatch',
      resourceId: outboundAction === 'call'
        ? normalizeLifecycleString(bridgeSessionId)
        : normalizeLifecycleString(canonicalEvent?.eventId),
      db: communicationReliabilityDb,
    });
  }
  await appendConnectShyftCommunicationAudit({
    tenantId: context.tenantId,
    correlationId: outboundDispatchReplayKey || randomUUID(),
    actorType: actorUserId ? 'user' : 'system',
    actorId: actorUserId,
    operationName: outboundIdempotencyOperation,
    targetEntityType: outboundAction === 'call' ? 'bridge_session' : 'message_dispatch',
    targetEntityId: threadId,
    channel: outboundAction === 'call' ? 'bridge' : 'sms',
    resultState: 'succeeded',
    resultCode: responseCode,
    resultMessage: responseMessage,
    idempotencyKey: outboundDispatchIdempotencyKey,
    requestFingerprint: outboundDispatchReplayKey,
    providerName: providerDispatch.providerKey,
    providerReferenceId: providerDispatch.providerLegId || providerDispatch.providerMessageId || null,
    metadata: {
      threadId,
      canonicalEventId: canonicalEvent?.eventId || null,
      bridgeSessionId,
      senderResolution: outboundSenderResolutionMetadata,
    },
    db: communicationReliabilityDb,
  });

  logOutboundCallRuntimeOutcome('bridged');
  success(res, {
    code: responseCode,
    message: responseMessage,
    data: responseData,
  });
  return;
};

registerConnectShyftThreadOutboundCoreExecutor(performOutboundAction);

const performInboundWebhook = async ({
  req,
  res,
  providerSelection,
  canonicalTranslation,
  eventType,
  normalizedEventType,
  correlation,
  tenantId,
  orgUnitId,
  threadId,
}: ConnectShyftInboundWebhookCoreExecutionInput): Promise<void> => {
  const isTranscriptionCallbackEvent = isConnectShyftVoicemailTranscriptionCallbackEventType(eventType);
  const isConnectedCallEvent = CONNECTSHYFT_CONNECTED_CALL_EVENT_TYPES.has(normalizedEventType);
  const webhookPersistenceDb = isConnectShyftTestOverrideEnabled()
    ? undefined
    : loadPlatformDb();

  if (isTranscriptionCallbackEvent) {
    const callbackPayload = extractConnectShyftVoicemailTranscriptionCallbackPayload(req.body);
    const callbackInboundProviderEventId = normalizeLifecycleString(correlation.providerEventId);
    if (!callbackInboundProviderEventId) {
      refusal(res, {
        code: 'CONNECTSHYFT_TRANSCRIPTION_PROVIDER_EVENT_REQUIRED',
        message: 'Transcription callback requires providerEventId for deterministic replay handling.',
        refusalType: 'business',
        httpStatus: 200,
        data: {
          providerResolution: {
            ...providerSelection.providerResolution,
            adapterInvoked: true,
          },
          correlation: {
            source: correlation.source,
            deterministic: true,
            threadId,
            tenantId,
            orgUnitId,
            providerLegId: correlation.providerLegId,
            providerMessageId: correlation.providerMessageId,
            providerEventId: correlation.providerEventId,
            providerNumberE164: correlation.providerNumberE164,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: null,
          },
          sideEffects: {
            transcriptMutationApplied: false,
            orphanTranscriptPrevented: true,
          },
          audit: {
            eventName: 'connectshyft.voicemail.transcription_refused',
            metadata: {
              tenant_id: tenantId,
              org_unit_id: orgUnitId,
              thread_id: threadId,
              reason: 'provider_event_id_missing',
            },
          },
        },
      });
      return;
    }

    const transcriptionReceipt = await beginConnectShyftWebhookReceiptProcessing({
      tenantId,
      orgUnitId,
      threadId,
      providerName: providerSelection.providerResolution.resolvedProvider,
      canonicalEventType: eventType,
      providerEventId: callbackInboundProviderEventId,
      providerLegId: correlation.providerLegId,
      providerMessageId: correlation.providerMessageId,
      correlationKeys: {
        tenantId,
        orgUnitId,
        threadId,
        callbackProviderEventId: callbackPayload.correlation.providerEventId || null,
        voicemailArtifactId: callbackPayload.correlation.voicemailArtifactId || null,
      },
      db: webhookPersistenceDb,
    });
    if (transcriptionReceipt.error) {
      refusal(res, {
        code: transcriptionReceipt.error.code,
        message: 'Inbound webhook correlation resolved but receipt persistence is unavailable.',
        refusalType: 'business',
        httpStatus: 200,
        data: {
          providerResolution: {
            ...providerSelection.providerResolution,
            adapterInvoked: true,
          },
          correlation: {
            source: correlation.source,
            deterministic: true,
            threadId,
            tenantId,
            orgUnitId,
            providerLegId: correlation.providerLegId,
            providerMessageId: correlation.providerMessageId,
            providerEventId: correlation.providerEventId,
            providerNumberE164: correlation.providerNumberE164,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: transcriptionReceipt.dedupeKey,
          },
          sideEffects: {
            transcriptMutationApplied: false,
            orphanTranscriptPrevented: true,
          },
          timelineOutcome: {
            eventName: null,
            routingDecision: 'refused',
          },
        },
      });
      return;
    }

    const shouldSuppressTranscriptionDuplicate = transcriptionReceipt.alreadyApplied
      || transcriptionReceipt.previousStatus === 'RECEIVED'
      || transcriptionReceipt.previousStatus === 'FAILED_TERMINAL';

    if (shouldSuppressTranscriptionDuplicate) {
      success(res, {
        code: 'CONNECTSHYFT_TRANSCRIPTION_CALLBACK_DUPLICATE_SUPPRESSED',
        message: 'Transcription callback duplicate suppressed',
        data: {
          eventType,
          providerResolution: {
            ...providerSelection.providerResolution,
            adapterInvoked: true,
          },
          correlation: {
            source: correlation.source,
            deterministic: true,
            threadId,
            tenantId,
            orgUnitId,
            providerLegId: correlation.providerLegId,
            providerMessageId: correlation.providerMessageId,
            providerEventId: correlation.providerEventId,
            providerNumberE164: correlation.providerNumberE164,
          },
          replaySafe: {
            duplicate: true,
            suppressedDomainWrites: true,
            dedupeKey: transcriptionReceipt.dedupeKey,
          },
          sideEffects: {
            transcriptMutationApplied: false,
            timelineMutationApplied: false,
          },
        },
      });
      return;
    }

    const callbackTenantId = normalizeLifecycleString(callbackPayload.correlation.tenantId);
    const callbackOrgUnitId = normalizeLifecycleString(callbackPayload.correlation.orgUnitId);
    const callbackThreadId = normalizeLifecycleString(callbackPayload.correlation.threadId);
    const callbackProviderEventId = normalizeLifecycleString(callbackPayload.correlation.providerEventId);
    const callbackVoicemailArtifactId = normalizeLifecycleString(
      callbackPayload.correlation.voicemailArtifactId,
    );
    const callbackProviderLegId = normalizeLifecycleString(
      callbackPayload.correlation.providerLegId,
    );
    const transcriptText = normalizeLifecycleString(callbackPayload.transcriptText);
    const hasRequiredCallbackCorrelation = Boolean(
      callbackTenantId
      && callbackOrgUnitId
      && callbackThreadId
      && callbackProviderEventId
      && callbackVoicemailArtifactId,
    );
    const callbackMatchesResolvedScope = hasRequiredCallbackCorrelation
      && callbackTenantId === tenantId
      && callbackOrgUnitId === orgUnitId
      && callbackThreadId === threadId
      && (
        !callbackProviderLegId
        || !correlation.providerLegId
        || callbackProviderLegId === correlation.providerLegId
      );
    const hasPersistedVoicemailCorrelation = callbackMatchesResolvedScope
      ? await hasPersistedVoicemailArtifactCorrelation({
        tenantId,
        orgUnitId,
        threadId,
        voicemailArtifactId: callbackVoicemailArtifactId,
        callbackProviderEventId,
      })
      : false;

    if (!callbackMatchesResolvedScope || !hasPersistedVoicemailCorrelation || !transcriptText) {
      await markConnectShyftWebhookReceiptProcessingResult({
        tenantId,
        threadId,
        providerName: providerSelection.providerResolution.resolvedProvider,
        dedupeKey: transcriptionReceipt.dedupeKey,
        canonicalEventType: eventType,
        providerEventId: callbackInboundProviderEventId,
        providerLegId: correlation.providerLegId,
        providerMessageId: correlation.providerMessageId,
        status: 'FAILED_RETRYABLE',
        failureReason: !callbackMatchesResolvedScope
          ? 'callback_correlation_scope_invalid'
          : !hasPersistedVoicemailCorrelation
            ? 'callback_correlation_unresolved'
            : 'transcript_text_missing',
        db: webhookPersistenceDb,
      });
      refusal(res, {
        code: 'CONNECTSHYFT_TRANSCRIPTION_CORRELATION_INVALID',
        message: 'Transcription callback correlation is invalid or unresolved for voicemail attachment.',
        refusalType: 'business',
        httpStatus: 200,
        data: {
          providerResolution: {
            ...providerSelection.providerResolution,
            adapterInvoked: true,
          },
          correlation: {
            source: correlation.source,
            deterministic: true,
            threadId,
            tenantId,
            orgUnitId,
            providerEventId: callbackProviderEventId || null,
            voicemailArtifactId: callbackVoicemailArtifactId || null,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: transcriptionReceipt.dedupeKey,
          },
          sideEffects: {
            transcriptMutationApplied: false,
            orphanTranscriptPrevented: true,
          },
          audit: {
            eventName: 'connectshyft.voicemail.transcription_refused',
            metadata: {
              tenant_id: tenantId,
              org_unit_id: orgUnitId,
              thread_id: threadId,
              provider_event_id: callbackProviderEventId || null,
              voicemail_artifact_id: callbackVoicemailArtifactId || null,
              reason: !callbackMatchesResolvedScope
                ? 'callback_correlation_scope_invalid'
                : !hasPersistedVoicemailCorrelation
                  ? 'callback_correlation_unresolved'
                  : 'transcript_text_missing',
            },
          },
        },
      });
      return;
    }

    let canonicalEvent: ConnectShyftCanonicalEventRecord;
    try {
      canonicalEvent = await recordCanonicalThreadEvent({
        tenantId,
        orgUnitId,
        threadId,
        eventType,
        payload: buildConnectShyftVoicemailTranscriptionAttachedCanonicalPayload({
          eventType,
          voicemailArtifactId: callbackVoicemailArtifactId,
          transcriptText,
          callbackCorrelation: {
            tenantId,
            orgUnitId,
            threadId,
            correlationEventId: callbackProviderEventId,
          },
        }),
        actorUserId: resolveWebhookActorUserId(req),
      });
    } catch (error) {
      await markConnectShyftWebhookReceiptProcessingResult({
        tenantId,
        threadId,
        providerName: providerSelection.providerResolution.resolvedProvider,
        dedupeKey: transcriptionReceipt.dedupeKey,
        canonicalEventType: eventType,
        providerEventId: callbackInboundProviderEventId,
        providerLegId: correlation.providerLegId,
        providerMessageId: correlation.providerMessageId,
        status: 'FAILED_RETRYABLE',
        failureReason: 'canonical_event_persistence_error',
        db: webhookPersistenceDb,
      });
      refusal(res, {
        code: 'CONNECTSHYFT_TRANSCRIPTION_ATTACHMENT_UNAVAILABLE',
        message: 'Transcription callback could not persist attachment side effects.',
        refusalType: 'business',
        httpStatus: 200,
        data: {
          correlation: {
            source: correlation.source,
            deterministic: true,
            threadId,
            tenantId,
            orgUnitId,
            providerEventId: callbackProviderEventId || null,
            voicemailArtifactId: callbackVoicemailArtifactId,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: transcriptionReceipt.dedupeKey,
          },
          sideEffects: {
            transcriptMutationApplied: false,
            orphanTranscriptPrevented: true,
          },
          error: error instanceof Error ? error.message : 'canonical-event-persistence-error',
        },
      });
      return;
    }

    await markConnectShyftWebhookReceiptProcessingResult({
      tenantId,
      threadId,
      providerName: providerSelection.providerResolution.resolvedProvider,
      dedupeKey: transcriptionReceipt.dedupeKey,
      canonicalEventType: eventType,
      providerEventId: callbackInboundProviderEventId,
      providerLegId: correlation.providerLegId,
      providerMessageId: correlation.providerMessageId,
      status: 'APPLIED',
      db: webhookPersistenceDb,
    });

    success(res, {
      code: 'CONNECTSHYFT_TRANSCRIPTION_CALLBACK_ATTACHED',
      message: 'Transcription callback attached to voicemail artifact',
      data: {
        eventType,
        providerResolution: {
          ...providerSelection.providerResolution,
          adapterInvoked: true,
        },
        correlation: {
          source: correlation.source,
          deterministic: true,
          threadId,
          tenantId,
          orgUnitId,
          providerEventId: callbackProviderEventId,
          voicemailArtifactId: callbackVoicemailArtifactId,
        },
        replaySafe: {
          duplicate: false,
          suppressedDomainWrites: false,
          dedupeKey: transcriptionReceipt.dedupeKey,
        },
        transcriptionAttachment: {
          applied: true,
          transcriptText,
          voicemailArtifactId: callbackVoicemailArtifactId,
        },
        timeline: {
          eventName: CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.voicemailTranscriptionAttached,
          routingDecision: 'accepted',
        },
        sideEffects: {
          transcriptMutationApplied: true,
          timelineMutationApplied: true,
        },
        canonicalEvent,
      },
    });
    return;
  }

  const webhookReceipt = await beginConnectShyftWebhookReceiptProcessing({
    tenantId,
    orgUnitId,
    threadId,
    providerName: providerSelection.providerResolution.resolvedProvider,
    canonicalEventType: eventType,
    providerEventId: correlation.providerEventId,
    providerLegId: correlation.providerLegId,
    providerMessageId: correlation.providerMessageId,
    correlationKeys: {
      tenantId,
      orgUnitId,
      threadId,
      providerEventId: correlation.providerEventId,
      providerLegId: correlation.providerLegId,
      providerMessageId: correlation.providerMessageId,
      providerNumberE164: correlation.providerNumberE164,
    },
    db: webhookPersistenceDb,
  });
  if (webhookReceipt.error) {
    refusal(res, {
      code: webhookReceipt.error.code,
      message: 'Inbound webhook correlation resolved but receipt persistence is unavailable.',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        providerResolution: {
          ...providerSelection.providerResolution,
          adapterInvoked: true,
        },
        correlation: {
          source: correlation.source,
          deterministic: true,
          threadId,
          tenantId,
          orgUnitId,
          providerLegId: correlation.providerLegId,
          providerMessageId: correlation.providerMessageId,
          providerEventId: correlation.providerEventId,
          providerNumberE164: correlation.providerNumberE164,
        },
        replaySafe: {
          duplicate: false,
          suppressedDomainWrites: false,
          dedupeKey: webhookReceipt.dedupeKey,
        },
        sideEffects: {
          lifecycleMutationApplied: false,
          canonicalEventPersisted: false,
          outboxPersisted: false,
        },
        timelineOutcome: {
          eventName: null,
          routingDecision: 'refused',
        },
      },
    });
    return;
  }

  const markWebhookReceipt = async (
    status: 'APPLIED' | 'FAILED_RETRYABLE' | 'FAILED_TERMINAL',
    failureReason?: string,
    failureClassification?: {
      category: string;
      retryable: boolean;
      httpStatus?: number | null;
      providerCode?: string | null;
    } | null,
  ): Promise<void> => {
    const normalizedFailureClassification = failureClassification || (status === 'FAILED_RETRYABLE'
      ? {
        category: 'temporary_processing_failure',
        retryable: true,
        httpStatus: null,
        providerCode: null,
      }
      : status === 'FAILED_TERMINAL'
        ? {
          category: 'terminal_processing_failure',
          retryable: false,
          httpStatus: null,
          providerCode: null,
        }
        : null);
    const retryDisposition = status === 'FAILED_RETRYABLE'
      ? resolveWebhookRetryDisposition({
        attemptCount: webhookReceipt.attemptCount,
        retryable: normalizedFailureClassification?.retryable === true,
      })
      : null;
    const persistedStatus = status === 'FAILED_RETRYABLE'
      ? retryDisposition?.decision === 'retry'
        ? 'FAILED_RETRYABLE'
        : 'FAILED_TERMINAL'
      : status;
    const nextRetryAtUtc = persistedStatus === 'FAILED_RETRYABLE'
      && retryDisposition?.decision === 'retry'
      ? retryDisposition.nextAttemptAt.toISOString()
      : null;

    await markConnectShyftWebhookReceiptProcessingResult({
      tenantId,
      threadId,
      providerName: providerSelection.providerResolution.resolvedProvider,
      dedupeKey: webhookReceipt.dedupeKey,
      canonicalEventType: eventType,
      providerEventId: correlation.providerEventId,
      providerLegId: correlation.providerLegId,
      providerMessageId: correlation.providerMessageId,
      status: persistedStatus,
      failureReason: failureReason || null,
      nextRetryAtUtc,
      lastFailureClassification: normalizedFailureClassification,
      db: webhookPersistenceDb,
    });
    await appendConnectShyftCommunicationAudit({
      tenantId,
      correlationId: webhookReceipt.dedupeKey || correlation.providerEventId || randomUUID(),
      actorType: 'provider',
      operationName: 'apply_provider_event',
      targetEntityType: 'webhook_receipt',
      targetEntityId: webhookReceipt.dedupeKey,
      channel: 'webhook',
      resultState: persistedStatus === 'APPLIED'
        ? 'succeeded'
        : persistedStatus === 'FAILED_RETRYABLE'
          ? 'retrying'
          : retryDisposition?.decision === 'exhausted'
            ? 'exhausted'
            : 'failed',
      resultCode: persistedStatus,
      resultMessage: failureReason || null,
      providerName: providerSelection.providerResolution.resolvedProvider,
      providerReferenceId: correlation.providerEventId || correlation.providerLegId || correlation.providerMessageId || null,
      metadata: {
        threadId,
        eventType,
        attemptCount: webhookReceipt.attemptCount,
        nextRetryAtUtc,
        failureClassification: normalizedFailureClassification,
      },
      db: webhookPersistenceDb,
    });
  };

  const shouldSuppressWebhookDuplicate = webhookReceipt.alreadyApplied
    || webhookReceipt.previousStatus === 'RECEIVED'
    || webhookReceipt.previousStatus === 'FAILED_TERMINAL';

  if (shouldSuppressWebhookDuplicate) {
    await appendConnectShyftCommunicationAudit({
      tenantId,
      correlationId: webhookReceipt.dedupeKey || correlation.providerEventId || randomUUID(),
      actorType: 'provider',
      operationName: 'apply_provider_event',
      targetEntityType: 'webhook_receipt',
      targetEntityId: webhookReceipt.dedupeKey,
      channel: 'webhook',
      resultState: 'ignored_duplicate',
      resultCode: 'CONNECTSHYFT_WEBHOOK_DUPLICATE_SUPPRESSED',
      resultMessage: 'Duplicate webhook suppressed before domain side effects.',
      providerName: providerSelection.providerResolution.resolvedProvider,
      providerReferenceId: correlation.providerEventId || correlation.providerLegId || correlation.providerMessageId || null,
      metadata: {
        threadId,
        eventType,
        attemptCount: webhookReceipt.attemptCount,
      },
      db: webhookPersistenceDb,
    });
    success(res, {
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      message: 'Inbound webhook accepted (duplicate suppressed)',
      data: {
        sid: typeof req.body?.sid === 'string' ? req.body.sid : null,
        from: typeof req.body?.from === 'string' ? req.body.from : null,
        to: typeof req.body?.to === 'string' ? req.body.to : null,
        eventType,
        providerResolution: {
          ...providerSelection.providerResolution,
          adapterInvoked: true,
        },
        correlation: {
          source: correlation.source,
          deterministic: true,
          threadId,
          tenantId,
          orgUnitId,
          providerLegId: correlation.providerLegId,
          providerMessageId: correlation.providerMessageId,
          providerEventId: correlation.providerEventId,
          providerNumberE164: correlation.providerNumberE164,
        },
        replaySafe: {
          duplicate: true,
          suppressedDomainWrites: true,
          dedupeKey: webhookReceipt.dedupeKey,
        },
        sideEffects: {
          lifecycleMutationApplied: false,
          canonicalEventPersisted: false,
          outboxPersisted: false,
        },
      },
    });
    return;
  }

  const bridgeWebhookProgression = await handleConnectShyftBridgeWebhookEvent({
    tenantId,
    orgUnitId,
    threadId,
    providerKey: providerSelection.providerResolution.resolvedProvider,
    providerAdapter: providerSelection.adapter,
    providerLegId: correlation.providerLegId,
    eventType,
    occurredAt: isStrictUtcIsoTimestamp(normalizeLifecycleString(req.body?.occurredAt))
      ? new Date(normalizeLifecycleString(req.body?.occurredAt))
      : undefined,
    reason:
      normalizeLifecycleString(req.body?.reason)
      || normalizeLifecycleString(req.body?.hangupCause)
      || normalizeLifecycleString(req.body?.hangup_cause)
      || null,
    callPolicy: CONNECTSHYFT_OUTBOUND_CALL_POLICY,
  });
  if (
    bridgeWebhookProgression.handled
    && bridgeWebhookProgression.aggregate
    && bridgeWebhookProgression.domainEvent?.type === 'operator_answered'
  ) {
    const bridgeSessionId = normalizeLifecycleString(bridgeWebhookProgression.aggregate.session.id);
    const neighborProviderLegId = normalizeLifecycleString(bridgeWebhookProgression.aggregate.neighborLeg.providerCallId);

    if (bridgeSessionId) {
      await persistConnectShyftBridgeLegProviderCallControlIdIfPresentAsync({
        bridgeSessionId,
        tenantId,
        orgUnitId,
        legRole: 'neighbor',
        providerCallControlId: neighborProviderLegId,
      });
      await persistConnectShyftNeighborRingStartedAtIfNeededAsync({
        bridgeSessionId,
        tenantId,
        orgUnitId,
        neighborLegState: bridgeWebhookProgression.aggregate.neighborLeg.status,
        neighborProviderLegId,
      });
      await scheduleConnectShyftNeighborRingTimeoutAsync({
        tenantId,
        orgUnitId,
        threadId,
        bridgeSessionId,
        neighborProviderLegId,
        timeoutMs: CONNECTSHYFT_NEIGHBOR_RING_TIMEOUT_MS,
      });
    }
  }
  if (bridgeWebhookProgression.handled && !isConnectedCallEvent) {
    await markWebhookReceipt('APPLIED');
    success(res, {
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      message: 'Inbound webhook accepted',
      data: {
        eventType,
        providerResolution: {
          ...providerSelection.providerResolution,
          adapterInvoked: true,
        },
        correlation: {
          source: correlation.source,
          deterministic: true,
          threadId,
          tenantId,
          orgUnitId,
          providerLegId: correlation.providerLegId,
          providerMessageId: correlation.providerMessageId,
          providerEventId: correlation.providerEventId,
          providerNumberE164: correlation.providerNumberE164,
        },
        replaySafe: {
          duplicate: false,
          suppressedDomainWrites: false,
          dedupeKey: webhookReceipt.dedupeKey,
        },
        bridgeSession: bridgeWebhookProgression.aggregate
          ? buildProviderNeutralBridgeSessionState(bridgeWebhookProgression.aggregate)
          : null,
        bridgeEvent: bridgeWebhookProgression.domainEvent,
        correlationMapping: bridgeWebhookProgression.correlationMapping,
        sideEffects: {
          lifecycleMutationApplied: false,
          canonicalEventPersisted: false,
          outboxPersisted: false,
        },
      },
    });
    return;
  }

  const isSmsEvent = normalizedEventType.includes('sms') || normalizedEventType.includes('message');
  if (isSmsEvent) {
    const extractedNeighborId = normalizeConnectShyftNeighborIdentifier(
      extractConnectShyftInboundSmsNeighborId(req.body) || '',
    );
    const explicitNeighborId = extractedNeighborId
      && isValidConnectShyftNeighborIdentifier(extractedNeighborId)
      ? extractedNeighborId
      : null;
    let neighborId: string | null = null;
    let normalizedSenderPhone: string | null = null;

    try {
      if (explicitNeighborId) {
        neighborId = await resolveInboundReusableNeighborId({
          tenantId,
          neighborId: explicitNeighborId,
        });
      }

      if (!neighborId) {
        const correlatedNeighborId = await resolveNeighborIdForThreadCorrelation({
          tenantId,
          orgUnitId,
          threadId,
        });
        if (correlatedNeighborId) {
          neighborId = await resolveInboundReusableNeighborId({
            tenantId,
            neighborId: correlatedNeighborId,
          });
        }
      }
    } catch (error) {
      await markWebhookReceipt('FAILED_RETRYABLE', 'neighbor_resolution_unavailable');
      refusal(res, {
        code: 'CONNECTSHYFT_NEIGHBOR_PERSISTENCE_UNAVAILABLE',
        message: error instanceof Error ? error.message : 'Neighbor resolution is temporarily unavailable.',
        refusalType: 'business',
        httpStatus: 200,
        data: {
          providerResolution: {
            ...providerSelection.providerResolution,
            adapterInvoked: true,
          },
          correlation: {
            source: correlation.source,
            deterministic: true,
            threadId,
            tenantId,
            orgUnitId,
            providerLegId: correlation.providerLegId,
            providerMessageId: correlation.providerMessageId,
            providerEventId: correlation.providerEventId,
            providerNumberE164: correlation.providerNumberE164,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: webhookReceipt.dedupeKey,
          },
          sideEffects: {
            lifecycleMutationApplied: false,
            canonicalEventPersisted: false,
            outboxPersisted: false,
          },
          reason: 'neighbor_resolution_unavailable',
        },
      });
      return;
    }

    const senderPhone = resolveConnectShyftInboundSmsSenderPhone(req.body);
    if (!senderPhone.ok) {
      await markWebhookReceipt('FAILED_TERMINAL', senderPhone.code === 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED'
        ? 'sender_phone_required'
        : 'sender_phone_invalid');
      refusal(res, {
        code: senderPhone.code,
        message: senderPhone.message,
        refusalType: 'business',
        httpStatus: 200,
        data: {
          providerResolution: {
            ...providerSelection.providerResolution,
            adapterInvoked: true,
          },
          correlation: {
            source: correlation.source,
            deterministic: true,
            threadId,
            tenantId,
            orgUnitId,
            providerLegId: correlation.providerLegId,
            providerMessageId: correlation.providerMessageId,
            providerEventId: correlation.providerEventId,
            providerNumberE164: correlation.providerNumberE164,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: webhookReceipt.dedupeKey,
          },
          sideEffects: {
            lifecycleMutationApplied: false,
            canonicalEventPersisted: false,
            outboxPersisted: false,
          },
          timelineOutcome: {
            eventName: null,
            routingDecision: 'refused',
          },
          reason: senderPhone.code === 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED'
            ? 'sender_phone_required'
            : 'sender_phone_invalid',
        },
      });
      return;
    }

    normalizedSenderPhone = senderPhone.normalizedPhone;
    const actorUserId = resolveWebhookActorUserId(req);
    let identityAttachment: ResolveInboundContactPointIdentityResult;

    try {
      identityAttachment = await resolveInboundContactPointIdentityAsync({
        tenantId,
        orgUnitId,
        normalizedContactPointValue: senderPhone.normalizedPhone,
        rawContactPointValue: senderPhone.rawPhone,
        contactPointType: 'phone',
        eventSource: 'connectshyft.inbound_webhook',
        relatedObjectType: 'connectshyft_webhook_receipt',
        relatedObjectId: webhookReceipt.dedupeKey || correlation.providerEventId || correlation.providerMessageId || '',
        requestedByUserId: actorUserId,
      });
    } catch (error) {
      await markWebhookReceipt('FAILED_RETRYABLE', 'identity_attachment_unavailable');
      refusal(res, {
        code: 'CONNECTSHYFT_INBOUND_IDENTITY_ATTACHMENT_UNAVAILABLE',
        message: 'Inbound SMS identity attachment is temporarily unavailable.',
        refusalType: 'business',
        httpStatus: 200,
        data: {
          providerResolution: {
            ...providerSelection.providerResolution,
            adapterInvoked: true,
          },
          correlation: {
            source: correlation.source,
            deterministic: true,
            threadId,
            tenantId,
            orgUnitId,
            providerLegId: correlation.providerLegId,
            providerMessageId: correlation.providerMessageId,
            providerEventId: correlation.providerEventId,
            providerNumberE164: correlation.providerNumberE164,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: webhookReceipt.dedupeKey,
          },
          sideEffects: {
            lifecycleMutationApplied: false,
            canonicalEventPersisted: false,
            outboxPersisted: false,
          },
          senderPhone: normalizedSenderPhone,
          timelineOutcome: {
            eventName: null,
            routingDecision: 'refused',
          },
          reason: 'identity_attachment_unavailable',
          error: error instanceof Error ? error.message : 'identity-attachment-error',
        },
      });
      return;
    }

    if (!neighborId) {
      try {
        const compatibilityNeighborIds = await listInboundCompatibilityNeighborIdsByPhone({
          tenantId,
          normalizedPhone: senderPhone.normalizedPhone,
        });

        if (compatibilityNeighborIds.length === 1) {
          [neighborId] = compatibilityNeighborIds;
        } else if (compatibilityNeighborIds.length > 1) {
          await markWebhookReceipt('FAILED_TERMINAL', 'neighbor_ambiguous');
          refusal(res, {
            code: IDENTITY_MATCH_AMBIGUOUS_CODE,
            message: 'Inbound SMS sender phone matches multiple neighbors. Resolve manually before retrying.',
            refusalType: 'business',
            httpStatus: 200,
            data: {
              providerResolution: {
                ...providerSelection.providerResolution,
                adapterInvoked: true,
              },
              correlation: {
                source: correlation.source,
                deterministic: true,
                threadId,
                tenantId,
                orgUnitId,
                providerLegId: correlation.providerLegId,
                providerMessageId: correlation.providerMessageId,
                providerEventId: correlation.providerEventId,
                providerNumberE164: correlation.providerNumberE164,
              },
              replaySafe: {
                duplicate: false,
                suppressedDomainWrites: false,
                dedupeKey: webhookReceipt.dedupeKey,
              },
              sideEffects: {
                lifecycleMutationApplied: false,
                canonicalEventPersisted: false,
                outboxPersisted: false,
              },
              timelineOutcome: {
                eventName: null,
                routingDecision: 'refused',
              },
              senderPhone: senderPhone.normalizedPhone,
              candidateNeighborIds: compatibilityNeighborIds,
              reason: 'neighbor_ambiguous',
            },
          });
          return;
        } else {
          const createdNeighbor = await createNeighborFromInbound({
            tenantId,
            orgUnitId,
            phone: senderPhone.normalizedPhone,
            correlationId: webhookReceipt.dedupeKey
              || correlation.providerMessageId
              || correlation.providerEventId
              || correlation.providerLegId
              || randomUUID(),
            providerName: providerSelection.providerResolution.resolvedProvider,
            providerReferenceId: correlation.providerMessageId
              || correlation.providerEventId
              || correlation.providerLegId,
            requestFingerprint: createHash('sha256')
              .update(senderPhone.normalizedPhone)
              .digest('hex'),
          });
          if (!createdNeighbor.ok) {
            const lifecycleReason = createdNeighbor.code.includes('PERSISTENCE_UNAVAILABLE')
              ? 'neighbor_resolution_unavailable'
              : 'neighbor_create_refused';
            await markWebhookReceipt(
              createdNeighbor.code.includes('PERSISTENCE_UNAVAILABLE') ? 'FAILED_RETRYABLE' : 'FAILED_TERMINAL',
              lifecycleReason,
            );
            refusal(res, {
              code: createdNeighbor.code,
              message: createdNeighbor.message,
              refusalType: 'business',
              httpStatus: 200,
              data: {
                providerResolution: {
                  ...providerSelection.providerResolution,
                  adapterInvoked: true,
                },
                correlation: {
                  source: correlation.source,
                  deterministic: true,
                  threadId,
                  tenantId,
                  orgUnitId,
                  providerLegId: correlation.providerLegId,
                  providerMessageId: correlation.providerMessageId,
                  providerEventId: correlation.providerEventId,
                  providerNumberE164: correlation.providerNumberE164,
                },
                replaySafe: {
                  duplicate: false,
                  suppressedDomainWrites: false,
                  dedupeKey: webhookReceipt.dedupeKey,
                },
                sideEffects: {
                  lifecycleMutationApplied: false,
                  canonicalEventPersisted: false,
                  outboxPersisted: false,
                },
                timelineOutcome: {
                  eventName: null,
                  routingDecision: 'refused',
                },
                senderPhone: senderPhone.normalizedPhone,
                reason: lifecycleReason,
              },
            });
            return;
          }
          neighborId = createdNeighbor.data.neighbor.neighborId;
        }
      } catch (error) {
        await markWebhookReceipt('FAILED_RETRYABLE', 'neighbor_resolution_unavailable');
        refusal(res, {
          code: 'CONNECTSHYFT_NEIGHBOR_PERSISTENCE_UNAVAILABLE',
          message: error instanceof Error ? error.message : 'Neighbor resolution is temporarily unavailable.',
          refusalType: 'business',
          httpStatus: 200,
          data: {
            providerResolution: {
              ...providerSelection.providerResolution,
              adapterInvoked: true,
            },
            correlation: {
              source: correlation.source,
              deterministic: true,
              threadId,
              tenantId,
              orgUnitId,
              providerLegId: correlation.providerLegId,
              providerMessageId: correlation.providerMessageId,
              providerEventId: correlation.providerEventId,
              providerNumberE164: correlation.providerNumberE164,
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
              dedupeKey: webhookReceipt.dedupeKey,
            },
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
            },
            senderPhone: normalizedSenderPhone,
            timelineOutcome: {
              eventName: null,
              routingDecision: 'refused',
            },
            reason: 'neighbor_resolution_unavailable',
          },
        });
        return;
      }
    }

    if (!neighborId) {
      await markWebhookReceipt('FAILED_TERMINAL', 'neighbor_unresolved');
      refusal(res, {
        code: 'CONNECTSHYFT_WEBHOOK_NEIGHBOR_UNRESOLVED',
        message: 'Inbound SMS processing requires a resolvable neighbor context.',
        refusalType: 'business',
        httpStatus: 200,
        data: {
          providerResolution: {
            ...providerSelection.providerResolution,
            adapterInvoked: true,
          },
          correlation: {
            source: correlation.source,
            deterministic: true,
            threadId,
            tenantId,
            orgUnitId,
            providerLegId: correlation.providerLegId,
            providerMessageId: correlation.providerMessageId,
            providerEventId: correlation.providerEventId,
            providerNumberE164: correlation.providerNumberE164,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: webhookReceipt.dedupeKey,
          },
          sideEffects: {
            lifecycleMutationApplied: false,
            canonicalEventPersisted: false,
            outboxPersisted: false,
          },
          timelineOutcome: {
            eventName: null,
            routingDecision: 'refused',
          },
          senderPhone: normalizedSenderPhone,
          reason: 'neighbor_unresolved',
        },
      });
      return;
    }

    const existingActiveThreadId = await resolveExistingActiveThreadIdForScope({
      tenantId,
      orgUnitId,
      neighborId,
    });
    const inboundAlignedProviderNumber = await resolveInboundAlignedProviderNumber({
      tenantId,
      orgUnitId,
      threadId: existingActiveThreadId || threadId || null,
      providerNumberE164: correlation.providerNumberE164,
      loadThread: async () => {
        const alignedThreadId = normalizeLifecycleString(existingActiveThreadId || threadId || null);
        if (!alignedThreadId) {
          return null;
        }

        const lifecycleContext = await resolveLifecycleContext({
          tenantId,
          orgUnitId,
          threadId: alignedThreadId,
          actorUserId,
        });
        if (lifecycleContext.detail) {
          return buildThreadFromDetailRecord(lifecycleContext.detail, {
            neighborId,
          });
        }

        if (!lifecycleContext.currentState) {
          return null;
        }

        return buildSyntheticThread({
          tenantId,
          orgUnitId,
          threadId: alignedThreadId,
          currentState: lifecycleContext.currentState,
          nextState: lifecycleContext.currentState,
          actorUserId,
          fallbackSummary: lifecycleContext.syntheticThread?.summary,
          fallbackNeighborId: neighborId || lifecycleContext.syntheticThread?.neighborId,
          fallbackLastInboundCsNumberId: lifecycleContext.syntheticThread?.lastInboundCsNumberId,
          fallbackPreferredOutboundCsNumberId: lifecycleContext.syntheticThread?.preferredOutboundCsNumberId,
          fallbackEscalationStage: lifecycleContext.syntheticThread?.escalationStage,
          fallbackNextEvaluationAtUtc: lifecycleContext.syntheticThread?.nextEvaluationAtUtc,
        });
      },
    });
    if (!inboundAlignedProviderNumber.ok) {
      await markWebhookReceipt(
        inboundAlignedProviderNumber.code === 'CONNECTSHYFT_SMS_SENDER_AMBIGUOUS'
          ? 'FAILED_TERMINAL'
          : 'FAILED_TERMINAL',
        inboundAlignedProviderNumber.reason,
      );
      refusal(res, {
        code: inboundAlignedProviderNumber.code,
        message: inboundAlignedProviderNumber.message,
        refusalType: 'business',
        httpStatus: 200,
        data: {
          providerResolution: {
            ...providerSelection.providerResolution,
            adapterInvoked: true,
          },
          correlation: {
            source: correlation.source,
            deterministic: true,
            threadId,
            tenantId,
            orgUnitId,
            neighborId,
            providerLegId: correlation.providerLegId,
            providerMessageId: correlation.providerMessageId,
            providerEventId: correlation.providerEventId,
            providerNumberE164: correlation.providerNumberE164,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: webhookReceipt.dedupeKey,
          },
          sideEffects: {
            lifecycleMutationApplied: false,
            canonicalEventPersisted: false,
            outboxPersisted: false,
          },
          timelineOutcome: {
            eventName: null,
            routingDecision: 'refused',
          },
          reason: inboundAlignedProviderNumber.reason,
        },
      });
      return;
    }

    const domainEvent = mapConnectShyftInboundSmsWebhookToDomainEvent({
      webhookBody: req.body,
      canonicalEventType: eventType,
      providerEventId: correlation.providerEventId,
      providerMessageId: correlation.providerMessageId,
      providerLegId: correlation.providerLegId,
    });
    let ensuredThread: ConnectShyftThread | null = null;
    let canonicalEvent: ConnectShyftCanonicalEventRecord | null = null;
    let sideEffectsPersisted = false;
    try {
      const persisted = await persistInboundSmsEnsureAndCanonicalEvent({
        actorRoles: resolveWebhookActorRoles(req),
        tenantId,
        orgUnitId,
        neighborId,
        personId: identityAttachment.personId,
        actorUserId,
        lastInboundCsNumberId: inboundAlignedProviderNumber.providerNumberE164,
        preferredOutboundCsNumberId: inboundAlignedProviderNumber.providerNumberE164,
        eventType: CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.inboundSmsAppended,
        buildCanonicalPayload: (threadState) => buildConnectShyftInboundSmsCanonicalPayload({
          domainEvent,
          threadState,
        }),
      });
      ensuredThread = persisted.thread;
      canonicalEvent = persisted.canonicalEvent;
      sideEffectsPersisted = persisted.sideEffectsPersisted;
      const identityEventsPersisted = await persistInboundIdentityAttachmentEventsAsync({
        tenantId,
        orgUnitId,
        threadId: persisted.thread.threadId,
        identityAttachment,
      });
      sideEffectsPersisted = sideEffectsPersisted && identityEventsPersisted;
    } catch (error) {
      if (error instanceof InboundSmsEnsureRefusalError) {
        await markWebhookReceipt('FAILED_TERMINAL', 'inbound_sms_ensure_refused');
        refusal(res, {
          code: error.code,
          message: error.message,
          refusalType: 'business',
          httpStatus: 200,
          data: {
            providerResolution: {
              ...providerSelection.providerResolution,
              adapterInvoked: true,
            },
            correlation: {
              source: correlation.source,
              deterministic: true,
              threadId,
              tenantId,
              orgUnitId,
              neighborId,
              providerLegId: correlation.providerLegId,
              providerMessageId: correlation.providerMessageId,
              providerEventId: correlation.providerEventId,
              providerNumberE164: correlation.providerNumberE164,
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
              dedupeKey: webhookReceipt.dedupeKey,
            },
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
            },
            timelineOutcome: {
              eventName: null,
              routingDecision: 'refused',
            },
          },
        });
        return;
      }

      if (error instanceof InboundSmsEnsurePersistenceError) {
        await markWebhookReceipt('FAILED_RETRYABLE', 'inbound_sms_thread_ensure_persistence_unavailable');
        refusal(res, {
          code: 'CONNECTSHYFT_THREAD_ENSURE_PERSISTENCE_UNAVAILABLE',
          message: 'Inbound SMS thread ensure is temporarily unavailable.',
          refusalType: 'business',
          httpStatus: 200,
          data: {
            providerResolution: {
              ...providerSelection.providerResolution,
              adapterInvoked: true,
            },
            correlation: {
              source: correlation.source,
              deterministic: true,
              threadId,
              tenantId,
              orgUnitId,
              neighborId,
              providerLegId: correlation.providerLegId,
              providerMessageId: correlation.providerMessageId,
              providerEventId: correlation.providerEventId,
              providerNumberE164: correlation.providerNumberE164,
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
              dedupeKey: webhookReceipt.dedupeKey,
            },
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
            },
            error: error.message || 'thread-ensure-error',
          },
        });
        return;
      }

      await markWebhookReceipt('FAILED_RETRYABLE', 'inbound_sms_canonical_persistence_unavailable');
      refusal(res, {
        code: 'CONNECTSHYFT_INBOUND_SMS_PERSISTENCE_UNAVAILABLE',
        message: 'Inbound SMS processing could not persist timeline side effects.',
        refusalType: 'business',
        httpStatus: 200,
        data: {
          providerResolution: {
            ...providerSelection.providerResolution,
            adapterInvoked: true,
          },
          correlation: {
            source: correlation.source,
            deterministic: true,
            threadId: ensuredThread?.threadId || threadId,
            tenantId,
            orgUnitId,
            neighborId,
            providerLegId: correlation.providerLegId,
            providerMessageId: correlation.providerMessageId,
            providerEventId: correlation.providerEventId,
            providerNumberE164: correlation.providerNumberE164,
          },
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: webhookReceipt.dedupeKey,
          },
          sideEffects: {
            lifecycleMutationApplied: false,
            canonicalEventPersisted: false,
            outboxPersisted: false,
          },
          error: error instanceof InboundSmsCanonicalPersistenceError
            ? error.message
            : (error instanceof Error ? error.message : 'canonical-event-persistence-error'),
        },
      });
      return;
    }
    if (!ensuredThread || !canonicalEvent) {
      await markWebhookReceipt('FAILED_RETRYABLE', 'inbound_sms_processing_incomplete');
      return;
    }

    const createdNewThread = existingActiveThreadId
      ? existingActiveThreadId !== ensuredThread.threadId
      : ensuredThread.createdAtUtc === ensuredThread.updatedAtUtc;
    const canonicalEventPersisted = true;

    await markWebhookReceipt('APPLIED');
    success(res, {
      code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      message: 'Inbound webhook accepted for processing',
      data: {
        sid: typeof req.body?.sid === 'string' ? req.body.sid : null,
        from: domainEvent.inboundMessageArtifact.from,
        to: domainEvent.inboundMessageArtifact.to,
        eventType,
        providerResolution: {
          ...providerSelection.providerResolution,
          adapterInvoked: true,
        },
        correlation: {
          source: correlation.source,
          deterministic: true,
          threadId: ensuredThread.threadId,
          tenantId,
          orgUnitId,
          neighborId,
          providerLegId: correlation.providerLegId,
          providerMessageId: correlation.providerMessageId,
          providerEventId: correlation.providerEventId,
          providerNumberE164: correlation.providerNumberE164,
        },
        replaySafe: {
          duplicate: false,
          suppressedDomainWrites: false,
          dedupeKey: webhookReceipt.dedupeKey,
        },
        canonicalTranslation,
        domainHandlers: {
          providerBranchingInDomain: false,
        },
        canonicalEvent,
        threadId: ensuredThread.threadId,
        threadState: ensuredThread.state,
        thread: ensuredThread,
        lifecycle: {
          ensuredActiveThread: true,
          createdNewThread,
          ...(createdNewThread ? {} : { reusedThreadId: ensuredThread.threadId }),
        },
        inboundMessageArtifact: {
          artifactId: canonicalEvent.eventId,
          ...domainEvent.inboundMessageArtifact,
        },
        transaction: {
          atomic: sideEffectsPersisted,
          auditPersisted: sideEffectsPersisted,
          outboxPersisted: sideEffectsPersisted,
        },
        sideEffects: {
          lifecycleMutationApplied: true,
          canonicalEventPersisted,
          auditPersisted: sideEffectsPersisted,
          outboxPersisted: sideEffectsPersisted,
        },
        timeline: {
          eventName: domainEvent.eventName,
          routingDecision: domainEvent.routingDecision,
          deterministicOrdering: domainEvent.deterministicOrdering,
        },
        timelineOutcome: {
          eventName: domainEvent.eventName,
          routingDecision: domainEvent.routingDecision,
        },
        ...(sideEffectsPersisted
          ? {
              audit: {
                eventName: domainEvent.eventName,
                metadata: {
                  tenant_id: tenantId,
                  org_unit_id: orgUnitId,
                  thread_id: ensuredThread.threadId,
                  neighbor_id: neighborId,
                  thread_state: ensuredThread.state,
                  event_type: eventType,
                  routing_decision: domainEvent.routingDecision,
                  provider_event_id: correlation.providerEventId,
                  provider_message_id: correlation.providerMessageId,
                  provider_leg_id: correlation.providerLegId,
                },
              },
              outbox: {
                eventName: domainEvent.eventName,
                metadata: {
                  tenant_id: tenantId,
                  org_unit_id: orgUnitId,
                  thread_id: ensuredThread.threadId,
                  neighbor_id: neighborId,
                  thread_state: ensuredThread.state,
                  event_type: eventType,
                  routing_decision: domainEvent.routingDecision,
                  provider_event_id: correlation.providerEventId,
                  provider_message_id: correlation.providerMessageId,
                  provider_leg_id: correlation.providerLegId,
                },
              },
            }
          : {}),
      },
    });
    return;
  }

  const isVoiceEvent = normalizedEventType.startsWith('voice') || normalizedEventType.includes('call');
  const extractedVoiceNeighborId = normalizeConnectShyftNeighborIdentifier(
    extractConnectShyftInboundVoiceNeighborId(req.body) || '',
  );
  const normalizedExtractedVoiceNeighborId = extractedVoiceNeighborId
    && isValidConnectShyftNeighborIdentifier(extractedVoiceNeighborId)
    ? extractedVoiceNeighborId
    : null;
  const correlatedVoiceNeighborId = normalizedExtractedVoiceNeighborId
    ? null
    : await resolveNeighborIdForThreadCorrelation({
      tenantId,
      orgUnitId,
      threadId,
    });
  const candidateVoiceNeighborId = normalizedExtractedVoiceNeighborId || correlatedVoiceNeighborId;
  const existingVoiceActiveThreadId = candidateVoiceNeighborId
    ? await resolveExistingActiveThreadIdForScope({
      tenantId,
      orgUnitId,
      neighborId: candidateVoiceNeighborId,
    })
    : null;
  const shouldResolveVoiceThreadByNeighbor = !isConnectedCallEvent && correlation.source === 'number_mapping';
  const resolvedVoiceThreadId = shouldResolveVoiceThreadByNeighbor && existingVoiceActiveThreadId
    ? existingVoiceActiveThreadId
    : threadId;
  const resolvedVoiceNeighborId = await resolveNeighborIdForThreadCorrelation({
    tenantId,
    orgUnitId,
    threadId: resolvedVoiceThreadId,
  });
  const voiceNeighborId = resolvedVoiceNeighborId || candidateVoiceNeighborId;

  const callPolicy = parseOutboundCallRequestPolicy(req);
  const callTransport = callPolicy.transport || null;
  const canApplyAutoClaimForTransport = callTransport === CONNECTSHYFT_OUTBOUND_CALL_ALLOWED_TRANSPORT;
  const hasVerifiedConnectedCallLineage = isConnectedCallEvent
    ? await verifyConnectedCallLineage({
      correlation,
      providerName: providerSelection.providerResolution.resolvedProvider,
    })
    : false;
  let threadState: ConnectShyftThreadState | null = null;
  let lifecycleContext: ResolvedLifecycleContext | null = null;
  let thread: ConnectShyftThread | null = null;
  let autoClaim:
    | null
    | {
      attempted: boolean;
      applied: boolean;
      reason: string | null;
      lifecycleEvent: string | null;
      sideEffectsPersisted: boolean;
    } = null;

  lifecycleContext = await resolveLifecycleContext({
    tenantId,
    orgUnitId,
    threadId: resolvedVoiceThreadId,
    actorUserId: null,
  });
  threadState = lifecycleContext.currentState;

  if (isConnectedCallEvent) {
    autoClaim = {
      attempted: true,
      applied: false,
      reason: null,
      lifecycleEvent: null,
      sideEffectsPersisted: false,
    };

    if (!lifecycleContext || !tenantId || !orgUnitId || !resolvedVoiceThreadId || !lifecycleContext.currentState) {
      autoClaim.reason = 'thread_not_found';
    } else if (lifecycleContext.currentState !== 'UNCLAIMED') {
      autoClaim.reason = `state_${lifecycleContext.currentState.toLowerCase()}`;
    } else if (!canApplyAutoClaimForTransport) {
      autoClaim.reason = callTransport ? 'unsupported_transport' : 'transport_required';
    } else if (!hasVerifiedConnectedCallLineage) {
      autoClaim.reason = 'unverified_call_lineage';
    } else {
      const actorUserId = resolveWebhookActorUserId(req);
      const metadata = buildLifecycleMetadata({
        tenantId,
        orgUnitId,
        actorUserId,
        threadId: resolvedVoiceThreadId,
        priorState: 'UNCLAIMED',
        newState: 'CLAIMED',
        action: 'auto_claim_connected_call',
      });
      const transitioned = await transitionThreadWithSideEffects({
        actorRoles: ['SYSTEM_ADMIN'],
        tenantId,
        orgUnitId,
        threadId: resolvedVoiceThreadId,
        actorUserId,
        currentState: 'UNCLAIMED',
        nextState: 'CLAIMED',
        syntheticThread: lifecycleContext.syntheticThread,
        detail: lifecycleContext.detail,
        sideEffects: {
          eventName: CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.claimed,
          metadata,
        },
      });

      if (!transitioned.ok) {
        await markWebhookReceipt('FAILED_TERMINAL', 'connected_call_auto_claim_refused');
        refusal(res, {
          code: transitioned.code,
          message: transitioned.message,
          refusalType: 'business',
          httpStatus: 200,
          data: {
            tenantId,
            orgUnitId,
            threadId: resolvedVoiceThreadId,
            eventType,
          },
        });
        return;
      }

      thread = transitioned.thread;
      threadState = transitioned.thread.state;
      autoClaim = {
        attempted: true,
        applied: true,
        reason: null,
        lifecycleEvent: CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.claimed,
        sideEffectsPersisted: transitioned.sideEffectsPersisted,
      };
    }
  }

  if (!thread && lifecycleContext?.detail) {
    thread = buildThreadFromDetailRecord(lifecycleContext.detail, {
      neighborId: voiceNeighborId,
    });
  }
  if (!thread && lifecycleContext?.syntheticThread) {
    thread = buildSyntheticThread({
      tenantId,
      orgUnitId,
      threadId: resolvedVoiceThreadId,
      currentState: lifecycleContext.syntheticThread.state,
      nextState: lifecycleContext.syntheticThread.state,
      actorUserId: resolveWebhookActorUserId(req),
      fallbackSummary: lifecycleContext.syntheticThread.summary,
      fallbackNeighborId: voiceNeighborId || lifecycleContext.syntheticThread.neighborId,
      fallbackLastInboundCsNumberId: lifecycleContext.syntheticThread.lastInboundCsNumberId,
      fallbackPreferredOutboundCsNumberId: lifecycleContext.syntheticThread.preferredOutboundCsNumberId,
      fallbackEscalationStage: lifecycleContext.syntheticThread.escalationStage,
      fallbackNextEvaluationAtUtc: lifecycleContext.syntheticThread.nextEvaluationAtUtc,
    });
  }

  let routingDecision: 'voicemail_only' | 'intake_fallback' | 'accepted' = 'accepted';
  let timelineEventName: string =
    autoClaim?.applied === true
      ? CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.claimed
      : CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.inboundVoiceVoicemail;
  let voiceRoutingPolicy: { claimedMode?: 'orgunit_configured_mode' } = {};
  let voiceDomainEvent: ReturnType<typeof mapConnectShyftInboundVoiceWebhookToDomainEvent> | null = null;
  let operatorDestinationResolution: ConnectShyftOperatorDestinationResolution | null = null;
  let claimedByUserIdForOperatorDestination: string | null = null;
  const logInboundVoiceRuntimeOutcome = (outcome: ConnectShyftTelephonyRuntimeOutcome): void => {
    if (!operatorDestinationResolution) {
      return;
    }

    logConnectShyftTelephonyRuntimeOutcome({
      threadId: resolvedVoiceThreadId,
      tenantId,
      orgUnitId,
      actorUserId: resolveWebhookActorUserId(req),
      claimedByUserId: claimedByUserIdForOperatorDestination,
      senderNumber: correlation.providerNumberE164 || null,
      operatorDestinationSource: operatorDestinationResolution.source,
      operatorDestinationResolved: Boolean(operatorDestinationResolution.phoneNumber),
      outcome,
    });
  };

  if (isVoiceEvent && !isConnectedCallEvent) {
    operatorDestinationResolution = threadState === 'CLAIMED'
      ? await resolveOperatorDestination({
        tenantId,
        orgUnitId,
        actorUserId: resolveWebhookActorUserId(req),
        claimedByUserId: (
          claimedByUserIdForOperatorDestination =
            lifecycleContext?.claimedByUserId || thread?.claimedByUserId || null
        ),
      })
      : null;
    const routing = resolveConnectShyftInboundVoiceRouting({
      normalizedEventType,
      threadState,
      operatorDestination: operatorDestinationResolution,
    });
    timelineEventName = routing.eventName;
    routingDecision = routing.routingDecision;
    voiceRoutingPolicy = routing.routingPolicy;

    voiceDomainEvent = mapConnectShyftInboundVoiceWebhookToDomainEvent({
      webhookBody: req.body,
      canonicalEventType: eventType,
      eventName: routing.eventName,
      routingDecision: routing.routingDecision,
      providerEventId: correlation.providerEventId,
      providerMessageId: correlation.providerMessageId,
      providerLegId: correlation.providerLegId,
      routingPolicy: routing.routingPolicy,
    });
  }

  const outboundVoicemailRecording = voiceDomainEvent
    ? await attachConnectShyftOutboundVoicemailRecordingAsync({
      tenantId,
      orgUnitId,
      providerEventId: correlation.providerEventId || '',
      providerLegId: correlation.providerLegId,
      recordingUrl: voiceDomainEvent.inboundVoiceArtifact.recordingUrl || '',
    })
    : {
      handled: false,
      bridgeSession: null,
      voicemailArtifactId: null,
    };

  const shouldCreateInboundVoicemailArtifact = Boolean(
    voiceDomainEvent
      && routingDecision !== 'intake_fallback'
      && !outboundVoicemailRecording.handled,
  );
  const inboundVoicemailArtifactId = shouldCreateInboundVoicemailArtifact
    ? `vm-${normalizeRoutingSlug(resolvedVoiceThreadId)}-${normalizeRoutingSlug(
      correlation.providerEventId
      || correlation.providerLegId
      || eventType,
    )}`
    : null;
  const voicemailArtifactId = outboundVoicemailRecording.voicemailArtifactId || inboundVoicemailArtifactId;
  const transcription = shouldCreateInboundVoicemailArtifact && inboundVoicemailArtifactId
    ? buildConnectShyftVoicemailTranscriptionRequest({
      tenantId,
      orgUnitId,
      threadId: resolvedVoiceThreadId,
      providerEventId: correlation.providerEventId,
      providerLegId: correlation.providerLegId,
      voicemailArtifactId: inboundVoicemailArtifactId,
    })
    : null;
  const voicemailArtifact = outboundVoicemailRecording.voicemailArtifactId
    && outboundVoicemailRecording.bridgeSession
    && correlation.providerEventId
    && voiceDomainEvent
    ? buildConnectShyftOutboundVoicemailArtifact({
      threadId: outboundVoicemailRecording.bridgeSession.session.threadId,
      providerEventId: correlation.providerEventId,
      providerLegId: correlation.providerLegId,
      recordingUrl: voiceDomainEvent.inboundVoiceArtifact.recordingUrl || '',
    })
    : shouldCreateInboundVoicemailArtifact && inboundVoicemailArtifactId && voiceDomainEvent
    ? {
      artifactId: inboundVoicemailArtifactId,
      ...voiceDomainEvent.inboundVoiceArtifact,
    }
    : null;

  let canonicalEvent: ConnectShyftCanonicalEventRecord;
  try {
    canonicalEvent = await recordCanonicalThreadEvent({
      tenantId,
      orgUnitId,
      threadId: resolvedVoiceThreadId,
      eventType,
      payload: voiceDomainEvent
        ? buildConnectShyftInboundVoiceCanonicalPayload({
          domainEvent: voiceDomainEvent,
          threadState,
          autoClaimApplied: autoClaim?.applied === true,
          voicemailArtifactId: shouldCreateInboundVoicemailArtifact ? inboundVoicemailArtifactId : null,
          transcription,
        })
        : buildCanonicalPayloadForInboundWebhook({
          eventType,
          routingDecision,
          threadState,
          autoClaimApplied: autoClaim?.applied === true,
        }),
      actorUserId: resolveWebhookActorUserId(req),
    });
  } catch (error) {
    logInboundVoiceRuntimeOutcome('refused');
    await markWebhookReceipt('FAILED_RETRYABLE', 'inbound_voice_canonical_persistence_unavailable');
    refusal(res, {
      code: 'CONNECTSHYFT_CANONICAL_EVENT_PERSISTENCE_UNAVAILABLE',
      message: 'Inbound voice processing could not persist canonical event side effects.',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        providerResolution: {
          ...providerSelection.providerResolution,
          adapterInvoked: true,
        },
        correlation: {
          source: correlation.source,
          deterministic: true,
          threadId: resolvedVoiceThreadId,
          tenantId,
          orgUnitId,
          ...(voiceNeighborId ? { neighborId: voiceNeighborId } : {}),
          providerLegId: correlation.providerLegId,
          providerMessageId: correlation.providerMessageId,
          providerEventId: correlation.providerEventId,
          providerNumberE164: correlation.providerNumberE164,
        },
        replaySafe: {
          duplicate: false,
          suppressedDomainWrites: false,
          dedupeKey: webhookReceipt.dedupeKey,
        },
        sideEffects: {
          lifecycleMutationApplied: autoClaim?.applied === true,
          canonicalEventPersisted: false,
          outboxPersisted: false,
        },
        timelineOutcome: {
          eventName: null,
          routingDecision: 'refused',
        },
        error: error instanceof Error ? error.message : 'canonical-event-persistence-error',
      },
    });
    return;
  }

  const lifecycleEnsuredActiveThread = threadState === 'UNCLAIMED' || threadState === 'CLAIMED';
  const responseThread = thread && voiceNeighborId
    ? {
      ...thread,
      neighborId: voiceNeighborId,
    }
    : thread;
  const responseBridgeAggregate = bridgeWebhookProgression.aggregate || outboundVoicemailRecording.bridgeSession;

  await markWebhookReceipt('APPLIED');
  if (operatorDestinationResolution) {
    logInboundVoiceRuntimeOutcome(routingDecision === 'accepted' ? 'bridged' : 'fallback');
  }
  success(res, {
    code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
    message: 'Inbound webhook accepted for processing',
    data: {
      sid: typeof req.body?.sid === 'string' ? req.body.sid : null,
      from: voiceDomainEvent?.inboundVoiceArtifact.from || (typeof req.body?.from === 'string' ? req.body.from : null),
      to: voiceDomainEvent?.inboundVoiceArtifact.to || (typeof req.body?.to === 'string' ? req.body.to : null),
      eventType,
      providerResolution: {
        ...providerSelection.providerResolution,
        adapterInvoked: true,
      },
      correlation: {
        source: correlation.source,
        deterministic: true,
        threadId: resolvedVoiceThreadId,
        tenantId,
        orgUnitId,
        ...(voiceNeighborId ? { neighborId: voiceNeighborId } : {}),
        providerLegId: correlation.providerLegId,
        providerMessageId: correlation.providerMessageId,
        providerEventId: correlation.providerEventId,
        providerNumberE164: correlation.providerNumberE164,
      },
      replaySafe: {
        duplicate: false,
        suppressedDomainWrites: false,
        dedupeKey: webhookReceipt.dedupeKey,
      },
      canonicalTranslation,
      domainHandlers: {
        providerBranchingInDomain: false,
      },
      canonicalEvent,
      ...((bridgeWebhookProgression.handled || outboundVoicemailRecording.handled)
        ? {
            bridgeSession: responseBridgeAggregate
              ? buildProviderNeutralBridgeSessionState(responseBridgeAggregate)
              : null,
          }
        : {}),
      ...(bridgeWebhookProgression.handled
        ? {
            bridgeEvent: bridgeWebhookProgression.domainEvent,
            correlationMapping: bridgeWebhookProgression.correlationMapping,
          }
        : {}),
      threadId: resolvedVoiceThreadId,
      threadState,
      thread: responseThread,
      lifecycle: {
        ensuredActiveThread: lifecycleEnsuredActiveThread,
        ...(lifecycleEnsuredActiveThread ? { reusedThreadId: resolvedVoiceThreadId } : {}),
        reopenedByInbound: false,
        escalationResetApplied: false,
        inactivityResetApplied: false,
        autoClaimedByConnectedEvent: autoClaim?.applied === true,
      },
      ...(voiceRoutingPolicy.claimedMode
        ? {
            routingPolicy: {
              claimedMode: voiceRoutingPolicy.claimedMode,
            },
          }
        : {}),
      ...(voicemailArtifact ? { voicemailArtifact } : {}),
      ...(transcription ? { transcription } : {}),
      autoClaim,
      callPolicy: {
        transport: callTransport,
        autoRetry: false,
        redialPolicy: CONNECTSHYFT_OUTBOUND_CALL_ALLOWED_REDIAL_POLICY,
      },
      timeline: {
        eventName: timelineEventName,
        routingDecision,
        deterministicOrdering: true,
      },
      timelineOutcome: {
        eventName: timelineEventName,
        routingDecision,
      },
      audit: {
        eventName: timelineEventName,
        metadata: {
          tenant_id: tenantId,
          org_unit_id: orgUnitId,
          thread_id: resolvedVoiceThreadId,
          neighbor_id: voiceNeighborId,
          thread_state: threadState,
          event_type: eventType,
          routing_decision: routingDecision,
          voicemail_artifact_id: voicemailArtifactId,
          transcription_queue: transcription?.queueName || null,
          auto_claim_attempted: autoClaim?.attempted === true,
          auto_claim_applied: autoClaim?.applied === true,
          auto_claim_reason: autoClaim?.reason || null,
          call_transport: callTransport,
          reopened_by_inbound: false,
        },
      },
      outbox: {
        eventName: timelineEventName,
        metadata: {
          tenant_id: tenantId,
          org_unit_id: orgUnitId,
          thread_id: resolvedVoiceThreadId,
          neighbor_id: voiceNeighborId,
          thread_state: threadState,
          event_type: eventType,
          routing_decision: routingDecision,
          voicemail_artifact_id: voicemailArtifactId,
          transcription_queue: transcription?.queueName || null,
          auto_claim_attempted: autoClaim?.attempted === true,
          auto_claim_applied: autoClaim?.applied === true,
          auto_claim_reason: autoClaim?.reason || null,
          call_transport: callTransport,
          reopened_by_inbound: false,
        },
      },
      ...(transcription
        ? {
            transcriptionOutbox: {
              eventName: CONNECTSHYFT_LIFECYCLE_EVENT_NAMES.voicemailTranscriptionRequested,
              queueName: CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_QUEUE_NAME,
              metadata: {
                tenant_id: tenantId,
                org_unit_id: orgUnitId,
                thread_id: resolvedVoiceThreadId,
                voicemail_artifact_id: transcription.callbackCorrelation.voicemailArtifactId,
                provider_event_id: transcription.callbackCorrelation.providerEventId,
                provider_leg_id: transcription.callbackCorrelation.providerLegId,
              },
            },
          }
        : {}),
    },
  });
  return;
};

registerConnectShyftInboundWebhookCoreExecutor(performInboundWebhook);

router.post('/threads/:threadId/claim', postConnectThreadClaim);

router.post('/threads/:threadId/takeover', postConnectThreadTakeover);

router.post('/threads/:threadId/close', postConnectThreadClose);

router.post('/threads/:threadId/call', postConnectThreadCall);

router.post('/threads/:threadId/messages', postConnectThreadMessage);

router.post('/webhooks/inbound', postConnectWebhookInbound);

router.post('/webhooks/sms', postConnectWebhookSms);

export default router;
