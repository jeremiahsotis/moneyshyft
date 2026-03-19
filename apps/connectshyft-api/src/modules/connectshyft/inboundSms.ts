import { normalizePhone } from '../../../../../domains/communication';
import { resolveConnectShyftPhoneNormalizationContext } from './phoneIdentityContext';

const CONNECTSHYFT_INBOUND_SMS_MESSAGE_BODY_KEYS = [
  'body',
  'message',
  'text',
  'content',
] as const;

const CONNECTSHYFT_INBOUND_SMS_FROM_KEYS = [
  'from',
  'fromNumber',
  'from_number',
  'sender',
  'senderNumber',
  'sender_number',
] as const;

const CONNECTSHYFT_INBOUND_SMS_TO_KEYS = [
  'to',
  'toNumber',
  'to_number',
  'recipient',
  'recipientNumber',
  'recipient_number',
] as const;

const CONNECTSHYFT_INBOUND_SMS_NEIGHBOR_KEYS = [
  'neighborId',
] as const;

export const CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME = 'connectshyft.inbound.sms_appended' as const;

export type ConnectShyftInboundSmsSenderPhoneResult =
  | {
    ok: true;
    rawPhone: string;
    normalizedPhone: string;
  }
  | {
    ok: false;
    code: 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED' | 'CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT';
    message: string;
  };

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const readFromSources = (
  sources: Array<Record<string, unknown> | null>,
  keys: readonly string[],
): string | null => {
  for (const source of sources) {
    if (!source) {
      continue;
    }

    for (const key of keys) {
      const normalized = normalizeString(source[key]);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
};

const readWebhookSources = (
  webhookBody: unknown,
): Array<Record<string, unknown> | null> => {
  const payload = asRecord(webhookBody);
  const providerPayload = asRecord(payload?.providerPayload);
  const data = asRecord(payload?.data);
  const dataPayload = asRecord(data?.payload);

  return [payload, providerPayload, dataPayload, data];
};

export type ConnectShyftInboundSmsArtifact = {
  channel: 'sms';
  direction: 'inbound';
  providerEventId: string | null;
  providerMessageId: string | null;
  providerLegId: string | null;
  body: string;
  from: string | null;
  to: string | null;
};

export type ConnectShyftInboundSmsDomainEvent = {
  eventName: typeof CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME;
  routingDecision: 'accepted';
  deterministicOrdering: true;
  canonicalEventType: string;
  actor: 'neighbor';
  inboundMessageArtifact: ConnectShyftInboundSmsArtifact;
};

export const extractConnectShyftInboundSmsNeighborId = (
  webhookBody: unknown,
): string | null => {
  return readFromSources(
    readWebhookSources(webhookBody),
    CONNECTSHYFT_INBOUND_SMS_NEIGHBOR_KEYS,
  );
};

export const resolveConnectShyftInboundSmsSenderPhone = (
  webhookBody: unknown,
): ConnectShyftInboundSmsSenderPhoneResult => {
  const rawPhone = readFromSources(
    readWebhookSources(webhookBody),
    CONNECTSHYFT_INBOUND_SMS_FROM_KEYS,
  );

  if (!rawPhone) {
    return {
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED',
      message: 'Inbound SMS processing requires a sender phone number.',
    };
  }

  const normalizedPhone = normalizePhone(
    rawPhone,
    resolveConnectShyftPhoneNormalizationContext('system_generated'),
  );
  if (!normalizedPhone.ok) {
    return {
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT',
      message: 'Inbound SMS processing requires a valid sender phone number.',
    };
  }

  return {
    ok: true,
    rawPhone,
    normalizedPhone: normalizedPhone.phone.normalizedE164,
  };
};

export const mapConnectShyftInboundSmsWebhookToDomainEvent = (input: {
  webhookBody: unknown;
  canonicalEventType: string;
  providerEventId: string | null;
  providerMessageId: string | null;
  providerLegId: string | null;
}): ConnectShyftInboundSmsDomainEvent => {
  const sources = readWebhookSources(input.webhookBody);
  const body = readFromSources(sources, CONNECTSHYFT_INBOUND_SMS_MESSAGE_BODY_KEYS) || '';
  const from = readFromSources(sources, CONNECTSHYFT_INBOUND_SMS_FROM_KEYS);
  const to = readFromSources(sources, CONNECTSHYFT_INBOUND_SMS_TO_KEYS);

  return {
    eventName: CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME,
    routingDecision: 'accepted',
    deterministicOrdering: true,
    canonicalEventType: normalizeString(input.canonicalEventType) || 'MessageDelivered',
    actor: 'neighbor',
    inboundMessageArtifact: {
      channel: 'sms',
      direction: 'inbound',
      providerEventId: input.providerEventId,
      providerMessageId: input.providerMessageId,
      providerLegId: input.providerLegId,
      body,
      from,
      to,
    },
  };
};

export const buildConnectShyftInboundSmsCanonicalPayload = (input: {
  domainEvent: ConnectShyftInboundSmsDomainEvent;
  threadState: string;
}): Record<string, unknown> => ({
  direction: 'inbound',
  channel: 'sms',
  eventType: input.domainEvent.canonicalEventType,
  eventName: input.domainEvent.eventName,
  actor: input.domainEvent.actor,
  routingDecision: input.domainEvent.routingDecision,
  deterministicOrdering: input.domainEvent.deterministicOrdering,
  threadState: input.threadState,
  autoClaimApplied: false,
  inboundMessageArtifact: input.domainEvent.inboundMessageArtifact,
});
