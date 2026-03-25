import { normalizePhone } from '../../../../../domains/communication';
import {
  AsyncConnectShyftNeighborService,
  KnexConnectShyftNeighborStore,
  connectShyftNeighborServiceAsync,
} from './neighbors';
import {
  AsyncConnectShyftThreadService,
  connectShyftThreadServiceAsync,
  type ConnectShyftThread,
} from './threads';
import {
  resolveInboundContactPointIdentityAsync,
  type ResolveInboundContactPointIdentityResult,
} from '../peoplecore/contactPointIdentityResolution';

const CONNECTSHYFT_CONVERSATION_LAUNCH_SOURCE = 'LAUNCHER';

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const buildPhoneInvalidRefusal = () => ({
  ok: false as const,
  code: 'CONNECTSHYFT_CONVERSATION_LAUNCH_PHONE_INVALID',
  message: 'Enter a valid phone number before continuing.',
});

const buildTargetMismatchRefusal = () => ({
  ok: false as const,
  code: 'CONNECTSHYFT_CONVERSATION_LAUNCH_TARGET_MISMATCH',
  message: 'Choose a phone number that belongs to this contact before continuing.',
});

const buildAmbiguousTargetRefusal = () => ({
  ok: false as const,
  code: 'CONNECTSHYFT_CONVERSATION_LAUNCH_TARGET_AMBIGUOUS',
  message: 'More than one contact uses that number. Pick the contact first, then try again.',
});

export type ConnectShyftConversationLaunchPrepareCommand = {
  actorRoles: Array<string | null | undefined>;
  tenantId: string;
  orgUnitId: string;
  actorUserId: string | null;
  neighborId?: string | null;
  targetPhone: string;
  source?: string;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
};

export type ConnectShyftConversationLaunchPrepareResult =
  | {
    ok: true;
    code: 'CONNECTSHYFT_CONVERSATION_LAUNCH_PREPARED';
    httpStatus: 201;
    data: {
      thread: ConnectShyftThread;
      lifecycle: {
        ensuredActiveThread: true;
        createdNewThread: boolean;
        reusedThreadId?: string;
      };
      target: {
        neighborId: string;
        phone: string;
      };
      identity: Pick<
        ResolveInboundContactPointIdentityResult,
        'outcome' | 'personId' | 'provisionalPersonId' | 'resolverReviewId'
      >;
    };
  }
  | {
    ok: false;
    code: string;
    message: string;
  };

type ConnectShyftConversationLaunchPrepareDependencies = {
  neighborService?: Pick<
    AsyncConnectShyftNeighborService,
    'createNeighborFromInbound' | 'resolveNeighbor'
  >;
  neighborStore?: Pick<
    KnexConnectShyftNeighborStore,
    'listActiveIdentityBoundaryNeighborsByPhoneValue'
  >;
  resolveIdentity?: (
    input: Parameters<typeof resolveInboundContactPointIdentityAsync>[0],
  ) => Promise<ResolveInboundContactPointIdentityResult>;
  threadService?: Pick<AsyncConnectShyftThreadService, 'ensureThread'>;
};

const defaultNeighborStore = new KnexConnectShyftNeighborStore();

const resolveNormalizedTargetPhone = (rawPhone: string): string | null => {
  const normalized = normalizePhone(rawPhone, {
    defaultCountry: 'US',
    source: 'user_entered',
  });

  return normalized.ok ? normalized.phone.normalizedE164 : null;
};

const targetBelongsToNeighbor = (
  neighborPhoneValues: string[],
  normalizedTargetPhone: string,
): boolean => {
  return neighborPhoneValues.some((phoneValue) =>
    resolveNormalizedTargetPhone(phoneValue) === normalizedTargetPhone);
};

export const prepareConnectShyftConversationLaunch = async (
  input: ConnectShyftConversationLaunchPrepareCommand,
  dependencies: ConnectShyftConversationLaunchPrepareDependencies = {},
): Promise<ConnectShyftConversationLaunchPrepareResult> => {
  const neighborService = dependencies.neighborService || connectShyftNeighborServiceAsync;
  const neighborStore = dependencies.neighborStore || defaultNeighborStore;
  const resolveIdentity = dependencies.resolveIdentity || resolveInboundContactPointIdentityAsync;
  const threadService = dependencies.threadService || connectShyftThreadServiceAsync;

  const normalizedTargetPhone = resolveNormalizedTargetPhone(input.targetPhone);
  if (!normalizedTargetPhone) {
    return buildPhoneInvalidRefusal();
  }

  let resolvedNeighborId = normalizeString(input.neighborId) || null;

  if (resolvedNeighborId) {
    const resolvedNeighbor = await neighborService.resolveNeighbor({
      actorRoles: input.actorRoles,
      tenantId: input.tenantId,
      neighborId: resolvedNeighborId,
    });

    if (!resolvedNeighbor.ok) {
      return {
        ok: false,
        code: resolvedNeighbor.code,
        message: resolvedNeighbor.message,
      };
    }

    const knownPhoneValues = resolvedNeighbor.data.neighbor.phones.map((phone) => phone.value);
    if (!targetBelongsToNeighbor(knownPhoneValues, normalizedTargetPhone)) {
      return buildTargetMismatchRefusal();
    }
  } else {
    const matchingNeighbors = await neighborStore.listActiveIdentityBoundaryNeighborsByPhoneValue(
      input.tenantId,
      normalizedTargetPhone,
    );

    if (matchingNeighbors.length > 1) {
      return buildAmbiguousTargetRefusal();
    }

    resolvedNeighborId = matchingNeighbors[0]?.neighborId || null;
  }

  const identity = await resolveIdentity({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    normalizedContactPointValue: normalizedTargetPhone,
    rawContactPointValue: input.targetPhone,
    contactPointType: 'phone',
    eventSource: 'connectshyft.conversation_launcher',
    relatedObjectType: resolvedNeighborId ? 'connectshyft_neighbor' : 'connectshyft_conversation_launcher',
    relatedObjectId: resolvedNeighborId || normalizedTargetPhone,
    requestedByUserId: input.actorUserId,
  });

  if (!resolvedNeighborId) {
    const createdNeighbor = await neighborService.createNeighborFromInbound({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      phone: normalizedTargetPhone,
    });

    if (!createdNeighbor.ok) {
      if (createdNeighbor.code === 'CONNECTSHYFT_PHONE_DUPLICATE') {
        const matchingNeighbors = await neighborStore.listActiveIdentityBoundaryNeighborsByPhoneValue(
          input.tenantId,
          normalizedTargetPhone,
        );
        resolvedNeighborId = matchingNeighbors[0]?.neighborId || null;
      } else {
        return {
          ok: false,
          code: createdNeighbor.code,
          message: createdNeighbor.message,
        };
      }
    } else {
      resolvedNeighborId = createdNeighbor.data.neighbor.neighborId;
    }
  }

  if (!resolvedNeighborId) {
    return buildAmbiguousTargetRefusal();
  }

  const ensuredThread = await threadService.ensureThread({
    actorRoles: input.actorRoles,
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    neighborId: resolvedNeighborId,
    personId: identity.personId,
    source: normalizeString(input.source) || CONNECTSHYFT_CONVERSATION_LAUNCH_SOURCE,
    lastInboundCsNumberId: normalizeString(input.lastInboundCsNumberId),
    preferredOutboundCsNumberId: normalizeString(input.preferredOutboundCsNumberId),
    actorUserId: input.actorUserId,
  });

  if (!ensuredThread.ok) {
    return {
      ok: false,
      code: ensuredThread.code,
      message: ensuredThread.message,
    };
  }

  return {
    ok: true,
    code: 'CONNECTSHYFT_CONVERSATION_LAUNCH_PREPARED',
    httpStatus: 201,
    data: {
      thread: ensuredThread.data.thread,
      lifecycle: ensuredThread.data.lifecycle,
      target: {
        neighborId: resolvedNeighborId,
        phone: normalizedTargetPhone,
      },
      identity: {
        outcome: identity.outcome,
        personId: identity.personId,
        provisionalPersonId: identity.provisionalPersonId,
        resolverReviewId: identity.resolverReviewId,
      },
    },
  };
};
