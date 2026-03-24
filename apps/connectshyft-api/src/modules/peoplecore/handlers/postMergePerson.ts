import { Request, Response } from 'express';
import {
  error as errorEnvelope,
  refusal,
  success,
} from '../../../platform/envelopes/response';
import {
  enforceConnectShyftCapability,
  resolveConnectShyftRequestedActorUserId,
  resolveConnectShyftRouteContextDecision,
  respondWithConnectShyftContextRefusal,
} from '../../connectshyft/http/accessContext';
import { PeopleCorePersistenceUnavailableError, peopleCoreServiceAsync } from '../service';
import {
  PeopleCoreMergeScopeViolationError,
  PeopleCorePersonAlreadyMergedError,
} from '../store';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const respondInvalidField = (
  res: Response,
  input: {
    code: string;
    field: string;
    message: string;
    reason?: string;
  },
) => refusal(res, {
  code: input.code,
  message: input.message,
  refusalType: 'client',
  httpStatus: 400,
  data: {
    fieldErrors: [
      {
        field: input.field,
        reason: input.reason ?? 'INVALID',
        message: input.message,
      },
    ],
  },
});

export const postMergePerson = async (req: Request, res: Response) => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return;
  }

  const provisionalPersonId = normalizeString(req.body?.provisionalPersonId);
  if (!UUID_PATTERN.test(provisionalPersonId)) {
    respondInvalidField(res, {
      code: 'PEOPLECORE_PROVISIONAL_PERSON_ID_INVALID',
      field: 'provisionalPersonId',
      message: 'provisionalPersonId must be a non-empty UUID.',
    });
    return;
  }

  const canonicalPersonId = normalizeString(req.body?.canonicalPersonId);
  if (!UUID_PATTERN.test(canonicalPersonId)) {
    respondInvalidField(res, {
      code: 'PEOPLECORE_CANONICAL_PERSON_ID_INVALID',
      field: 'canonicalPersonId',
      message: 'canonicalPersonId must be a non-empty UUID.',
    });
    return;
  }

  const actorUserId = normalizeString(resolveConnectShyftRequestedActorUserId(req));
  if (!actorUserId) {
    respondInvalidField(res, {
      code: 'PEOPLECORE_MERGE_ACTOR_REQUIRED',
      field: 'actorUserId',
      message: 'Authenticated actor attribution is required.',
      reason: 'REQUIRED',
    });
    return;
  }

  const contextDecision = await resolveConnectShyftRouteContextDecision(req);
  if (!contextDecision.ok) {
    respondWithConnectShyftContextRefusal(res, contextDecision);
    return;
  }

  try {
    const merged = await peopleCoreServiceAsync.mergePerson({
      tenantId: contextDecision.context.tenantId,
      orgUnitId: contextDecision.context.orgUnitId,
      provisionalPersonId,
      canonicalPersonId,
      performedByUserId: actorUserId,
      mergeReason: normalizeString(req.body?.mergeReason) || undefined,
    });

    return success(res, {
      code: 'PEOPLECORE_PERSON_MERGED',
      message: 'PeopleCore person merge complete',
      httpStatus: 200,
      data: {
        mergedProvisionalPersonId: merged.mergedProvisionalPersonId,
        canonicalPersonId: merged.canonicalPersonId,
        autoMergedContactPointLinkIds: merged.autoMergedContactPointLinkIds,
        reviewContactPointLinkIds: merged.reviewContactPointLinkIds,
        resolverReviewId: merged.resolverReviewId,
      },
    });
  } catch (error) {
    if (error instanceof PeopleCoreMergeScopeViolationError) {
      refusal(res, {
        code: error.code,
        message: error.message,
        refusalType: 'business',
        httpStatus: 200,
      });
      return;
    }

    if (error instanceof PeopleCorePersonAlreadyMergedError) {
      refusal(res, {
        code: error.code,
        message: error.message,
        refusalType: 'business',
        httpStatus: 200,
      });
      return;
    }

    if (error instanceof PeopleCorePersistenceUnavailableError) {
      errorEnvelope(res, {
        code: error.code,
        message: error.message,
        httpStatus: 503,
      });
      return;
    }

    throw error;
  }
};
