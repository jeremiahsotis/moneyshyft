import type { ContactPoint } from '@shyft/contracts';
import { validatePhoneForChannel } from '../../../../../domains/communication';
import {
  AsyncPeopleCoreService,
  peopleCoreServiceAsync,
} from '../peoplecore/service';

type ResolveThreadSmsTargetService = Pick<
  AsyncPeopleCoreService,
  'getContactPoint' | 'listContactPointLinks'
>;

const ACTIVE_SMS_CONTACT_POINT_STATUSES = new Set<ContactPoint['status']>([
  'active_personal',
  'active_shared_possible',
  'active_shared_confirmed',
]);

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const buildMissingTargetRefusal = (): {
  ok: false;
  code: 'CONNECTSHYFT_SMS_TARGET_REQUIRED';
  message: string;
  reason: 'missing_target';
} => ({
  ok: false,
  code: 'CONNECTSHYFT_SMS_TARGET_REQUIRED',
  message: 'This conversation cannot send a text until a textable contact is ready.',
  reason: 'missing_target',
});

const buildAmbiguousTargetRefusal = (): {
  ok: false;
  code: 'CONNECTSHYFT_SMS_TARGET_AMBIGUOUS';
  message: string;
  reason: 'ambiguous_target';
} => ({
  ok: false,
  code: 'CONNECTSHYFT_SMS_TARGET_AMBIGUOUS',
  message: 'This conversation needs one clear textable contact before sending a text.',
  reason: 'ambiguous_target',
});

const buildInvalidTargetRefusal = (): {
  ok: false;
  code: 'CONNECTSHYFT_SMS_TARGET_INVALID';
  message: string;
  reason: 'invalid_target';
} => ({
  ok: false,
  code: 'CONNECTSHYFT_SMS_TARGET_INVALID',
  message: 'This conversation cannot send a text until the saved contact can receive texts.',
  reason: 'invalid_target',
});

const isSmsCapableContactPoint = (contactPoint: ContactPoint): boolean => {
  return contactPoint.type === 'phone'
    && ACTIVE_SMS_CONTACT_POINT_STATUSES.has(contactPoint.status)
    && validatePhoneForChannel(contactPoint.normalizedValue, 'sms').ok;
};

export const buildResolveThreadSmsTarget = (
  service: ResolveThreadSmsTargetService = peopleCoreServiceAsync,
) => {
  return async (input: {
    tenantId: string;
    orgUnitId: string;
    threadId: string;
    personId: string;
  }): Promise<
    | { ok: true; contactPointId: string; normalizedValue: string }
    | {
        ok: false;
        code:
          | 'CONNECTSHYFT_SMS_TARGET_REQUIRED'
          | 'CONNECTSHYFT_SMS_TARGET_AMBIGUOUS'
          | 'CONNECTSHYFT_SMS_TARGET_INVALID';
        message: string;
        reason: 'missing_target' | 'ambiguous_target' | 'invalid_target';
      }
  > => {
    const personId = normalizeString(input.personId);
    if (!personId) {
      return buildMissingTargetRefusal();
    }

    const currentLinks = await service.listContactPointLinks({
      tenantId: input.tenantId,
      subjectType: 'person',
      subjectId: personId,
      isCurrent: true,
    });
    const contactPointIds = Array.from(new Set(
      currentLinks
        .map((link) => normalizeString(link.contactPointId))
        .filter((contactPointId) => contactPointId.length > 0),
    ));

    if (contactPointIds.length === 0) {
      return buildMissingTargetRefusal();
    }

    const contactPoints = (
      await Promise.all(
        contactPointIds.map((contactPointId) => service.getContactPoint({
          tenantId: input.tenantId,
          contactPointId,
        })),
      )
    ).filter((contactPoint): contactPoint is ContactPoint => contactPoint !== null);

    const phoneContactPoints = contactPoints.filter((contactPoint) => contactPoint.type === 'phone');
    if (phoneContactPoints.length === 0) {
      return buildMissingTargetRefusal();
    }

    const smsCapableContactPoints = phoneContactPoints.filter(isSmsCapableContactPoint);
    if (smsCapableContactPoints.length === 1) {
      return {
        ok: true,
        contactPointId: smsCapableContactPoints[0].id,
        normalizedValue: smsCapableContactPoints[0].normalizedValue,
      };
    }

    if (smsCapableContactPoints.length > 1) {
      return buildAmbiguousTargetRefusal();
    }

    return buildInvalidTargetRefusal();
  };
};

export const resolveThreadSmsTarget = buildResolveThreadSmsTarget();
