import { validatePhoneForChannel } from '../../../../../domains/communication';
import {
  connectShyftNumberMappingServiceAsync,
  type AsyncConnectShyftNumberMappingService,
  type ConnectShyftNumberMapping,
} from './numberMappings';
import {
  connectShyftThreadServiceAsync,
  type AsyncConnectShyftThreadService,
  type ConnectShyftThread,
} from './threads';

export type ConnectShyftSenderChannel = 'sms' | 'voice';

type SenderAlignmentSource = 'preferred_outbound' | 'last_inbound';

type SenderAlignmentMetadata = {
  threadId: string;
  tenantId: string;
  orgUnitId: string;
  preferredOutboundCsNumberId: string | null;
  lastInboundCsNumberId: string | null;
  alignedFrom: SenderAlignmentSource | null;
  candidateProviderNumberE164: string | null;
};

export type ResolveSenderNumberInput = {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  channel: ConnectShyftSenderChannel;
};

export type ResolveSenderNumberSuccess = {
  ok: true;
  providerNumberE164: string;
  mappingId: string;
  routingMetadata: SenderAlignmentMetadata & {
    deterministic: true;
    channel: ConnectShyftSenderChannel;
    source: 'thread_alignment';
    mappingLabel: string | null;
  };
};

export type ResolveSenderNumberRefusal = {
  ok: false;
  code:
    | 'CONNECTSHYFT_THREAD_NOT_FOUND'
    | 'CONNECTSHYFT_SENDER_ALIGNMENT_REQUIRED'
    | 'CONNECTSHYFT_SENDER_ALIGNMENT_INVALID'
    | 'CONNECTSHYFT_SENDER_MAPPING_REQUIRED'
    | 'CONNECTSHYFT_SENDER_MAPPING_AMBIGUOUS'
    | 'CONNECTSHYFT_SENDER_SCOPE_MISMATCH';
  message: string;
  reason:
    | 'thread_not_found'
    | 'sender_alignment_missing'
    | 'sender_alignment_invalid'
    | 'sender_mapping_missing'
    | 'sender_mapping_ambiguous'
    | 'sender_scope_mismatch';
  routingMetadata: SenderAlignmentMetadata & {
    deterministic: true;
    channel: ConnectShyftSenderChannel;
    source: 'thread_alignment';
    candidateMappings?: Array<{
      mappingId: string;
      providerNumberE164: string;
      label: string | null;
      isActive: boolean;
    }>;
  };
};

export type ResolveSenderNumberResult =
  | ResolveSenderNumberSuccess
  | ResolveSenderNumberRefusal;

type ResolveSenderNumberDependencies = {
  loadThread?: (input: ResolveSenderNumberInput) => Promise<ConnectShyftThread | null>;
  numberMappingService?: Pick<AsyncConnectShyftNumberMappingService, 'resolveRoutingMappingByNumber'>;
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const buildAlignmentMetadata = (input: {
  request: ResolveSenderNumberInput;
  thread: ConnectShyftThread | null;
  alignedFrom: SenderAlignmentSource | null;
  candidateProviderNumberE164: string | null;
}) => ({
  threadId: input.request.threadId,
  tenantId: input.request.tenantId,
  orgUnitId: input.request.orgUnitId,
  preferredOutboundCsNumberId: normalizeString(input.thread?.preferredOutboundCsNumberId) || null,
  lastInboundCsNumberId: normalizeString(input.thread?.lastInboundCsNumberId) || null,
  alignedFrom: input.alignedFrom,
  candidateProviderNumberE164: input.candidateProviderNumberE164,
});

const resolveAlignedThreadNumber = (
  thread: ConnectShyftThread,
): { alignedFrom: SenderAlignmentSource | null; providerNumberE164: string | null; invalid: boolean } => {
  const preferredOutbound = normalizeString(thread.preferredOutboundCsNumberId);
  const lastInbound = normalizeString(thread.lastInboundCsNumberId);

  if (preferredOutbound && lastInbound && preferredOutbound !== lastInbound) {
    return {
      alignedFrom: 'preferred_outbound',
      providerNumberE164: preferredOutbound,
      invalid: true,
    };
  }

  if (preferredOutbound) {
    return {
      alignedFrom: 'preferred_outbound',
      providerNumberE164: preferredOutbound,
      invalid: false,
    };
  }

  if (lastInbound) {
    return {
      alignedFrom: 'last_inbound',
      providerNumberE164: lastInbound,
      invalid: false,
    };
  }

  return {
    alignedFrom: null,
    providerNumberE164: null,
    invalid: false,
  };
};

const buildRefusal = (
  input: {
    request: ResolveSenderNumberInput;
    thread: ConnectShyftThread | null;
    alignedFrom: SenderAlignmentSource | null;
    candidateProviderNumberE164: string | null;
    code: ResolveSenderNumberRefusal['code'];
    message: string;
    reason: ResolveSenderNumberRefusal['reason'];
    candidateMappings?: ConnectShyftNumberMapping[];
  },
): ResolveSenderNumberRefusal => ({
  ok: false,
  code: input.code,
  message: input.message,
  reason: input.reason,
  routingMetadata: {
    deterministic: true,
    channel: input.request.channel,
    source: 'thread_alignment',
    ...buildAlignmentMetadata({
      request: input.request,
      thread: input.thread,
      alignedFrom: input.alignedFrom,
      candidateProviderNumberE164: input.candidateProviderNumberE164,
    }),
    ...(input.candidateMappings && input.candidateMappings.length > 0
      ? {
        candidateMappings: input.candidateMappings.map((mapping) => ({
          mappingId: mapping.mappingId,
          providerNumberE164: mapping.twilioNumberE164,
          label: normalizeString(mapping.label) || null,
          isActive: mapping.isActive === true,
        })),
      }
      : {}),
  },
});

export const resolveSenderNumber = async (
  input: ResolveSenderNumberInput,
  dependencies: ResolveSenderNumberDependencies = {},
): Promise<ResolveSenderNumberResult> => {
  const loadThread = dependencies.loadThread
    || (async (request: ResolveSenderNumberInput) => (
      connectShyftThreadServiceAsync.findThreadById({
        tenantId: request.tenantId,
        threadId: request.threadId,
      })
    ));
  const numberMappingService = dependencies.numberMappingService || connectShyftNumberMappingServiceAsync;
  const thread = await loadThread(input);

  if (!thread || thread.orgUnitId !== input.orgUnitId) {
    return buildRefusal({
      request: input,
      thread,
      alignedFrom: null,
      candidateProviderNumberE164: null,
      code: 'CONNECTSHYFT_THREAD_NOT_FOUND',
      message: 'Thread sender resolution requires an existing tenant-scoped thread.',
      reason: 'thread_not_found',
    });
  }

  const aligned = resolveAlignedThreadNumber(thread);
  if (!aligned.providerNumberE164) {
    return buildRefusal({
      request: input,
      thread,
      alignedFrom: aligned.alignedFrom,
      candidateProviderNumberE164: null,
      code: 'CONNECTSHYFT_SENDER_ALIGNMENT_REQUIRED',
      message: 'Thread sender resolution requires a persisted provider-number alignment.',
      reason: 'sender_alignment_missing',
    });
  }

  if (
    aligned.invalid
    || !validatePhoneForChannel(aligned.providerNumberE164, input.channel).ok
  ) {
    return buildRefusal({
      request: input,
      thread,
      alignedFrom: aligned.alignedFrom,
      candidateProviderNumberE164: aligned.providerNumberE164,
      code: 'CONNECTSHYFT_SENDER_ALIGNMENT_INVALID',
      message: 'Thread sender alignment must contain one valid provider number.',
      reason: 'sender_alignment_invalid',
    });
  }

  const mapping = await numberMappingService.resolveRoutingMappingByNumber({
    tenantId: input.tenantId,
    twilioNumberE164: aligned.providerNumberE164,
  });

  if (mapping.status === 'not-found') {
    return buildRefusal({
      request: input,
      thread,
      alignedFrom: aligned.alignedFrom,
      candidateProviderNumberE164: aligned.providerNumberE164,
      code: 'CONNECTSHYFT_SENDER_MAPPING_REQUIRED',
      message: 'Thread sender alignment does not map to an active provider number in this tenant.',
      reason: 'sender_mapping_missing',
    });
  }

  if (mapping.status === 'ambiguous') {
    return buildRefusal({
      request: input,
      thread,
      alignedFrom: aligned.alignedFrom,
      candidateProviderNumberE164: aligned.providerNumberE164,
      code: 'CONNECTSHYFT_SENDER_MAPPING_AMBIGUOUS',
      message: 'Thread sender alignment is ambiguous across provider number mappings.',
      reason: 'sender_mapping_ambiguous',
      candidateMappings: mapping.mappings,
    });
  }

  if (mapping.mapping.orgUnitId !== input.orgUnitId || mapping.mapping.tenantId !== input.tenantId) {
    return buildRefusal({
      request: input,
      thread,
      alignedFrom: aligned.alignedFrom,
      candidateProviderNumberE164: aligned.providerNumberE164,
      code: 'CONNECTSHYFT_SENDER_SCOPE_MISMATCH',
      message: 'Thread sender alignment resolves outside the requested tenant or orgUnit scope.',
      reason: 'sender_scope_mismatch',
      candidateMappings: [mapping.mapping],
    });
  }

  return {
    ok: true,
    providerNumberE164: mapping.mapping.twilioNumberE164,
    mappingId: mapping.mapping.mappingId,
    routingMetadata: {
      deterministic: true,
      channel: input.channel,
      source: 'thread_alignment',
      mappingLabel: normalizeString(mapping.mapping.label) || null,
      ...buildAlignmentMetadata({
        request: input,
        thread,
        alignedFrom: aligned.alignedFrom,
        candidateProviderNumberE164: mapping.mapping.twilioNumberE164,
      }),
    },
  };
};

export const loadThreadForSenderNumberResolution = async (
  threadService: Pick<AsyncConnectShyftThreadService, 'findThreadById'>,
  input: ResolveSenderNumberInput,
): Promise<ConnectShyftThread | null> => {
  return threadService.findThreadById({
    tenantId: input.tenantId,
    threadId: input.threadId,
  });
};
