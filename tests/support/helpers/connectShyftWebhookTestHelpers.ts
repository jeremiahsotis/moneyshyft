import { generateKeyPairSync, sign as signPayload } from 'node:crypto';
import type { TestInfo } from '@playwright/test';
import {
  deterministicToken,
  deterministicUnixTimestamp,
} from '../utils/deterministicTestIds';

export const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

export const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

const { publicKey: webhookPublicKey, privateKey: webhookPrivateKey } = generateKeyPairSync('ed25519');
const webhookPublicKeyPem = webhookPublicKey.export({
  type: 'spki',
  format: 'pem',
}).toString();
const webhookPublicKeyHeader = Buffer.from(
  webhookPublicKeyPem,
  'utf8',
).toString('base64');

export const buildSignatureEnforcementHeaders = (): Record<string, string> => ({
  'x-test-connectshyft-enforce-webhook-signature': 'true',
  'x-test-connectshyft-telnyx-public-key': webhookPublicKeyHeader,
});

const signWebhookBody = (
  payload: Record<string, unknown>,
  timestamp: string,
): string =>
  signPayload(
    null,
    Buffer.from(`${timestamp}|${JSON.stringify(payload)}`),
    webhookPrivateKey,
  ).toString('base64');

export const buildSignedWebhookHeaders = (
  payload: Record<string, unknown>,
  testInfo: TestInfo,
  label = 'signed',
): Record<string, string> => {
  const timestamp = deterministicUnixTimestamp(testInfo, `e1-webhook:${label}:timestamp`);
  return {
    ...buildSignatureEnforcementHeaders(),
    'telnyx-timestamp': timestamp,
    'telnyx-signature-ed25519': signWebhookBody(payload, timestamp),
  };
};

export const buildInvalidSignedWebhookHeaders = (
  payload: Record<string, unknown>,
  testInfo: TestInfo,
  label = 'invalid',
): Record<string, string> => {
  const timestamp = deterministicUnixTimestamp(testInfo, `e1-webhook:${label}:timestamp`);
  const tamperedPayload = {
    ...payload,
    eventType: `${String(payload.eventType || 'event')}.tampered`,
    tamperToken: deterministicToken(testInfo, `e1-webhook:${label}:tamper`),
  };

  return {
    ...buildSignatureEnforcementHeaders(),
    'telnyx-timestamp': timestamp,
    'telnyx-signature-ed25519': signWebhookBody(tamperedPayload, timestamp),
  };
};

type SmsWebhookPayloadInput = {
  providerKey: string;
  to: string;
  from: string;
  providerMessageId: string;
  providerEventId: string;
  providerLegId?: string;
};

export const buildSmsWebhookPayload = (input: SmsWebhookPayloadInput) => ({
  eventType: 'sms.delivered' as const,
  providerKey: input.providerKey,
  providerEventId: input.providerEventId,
  providerPayload: {
    to: input.to,
    from: input.from,
    message_uuid: input.providerMessageId,
    ...(input.providerLegId ? { call_control_id: input.providerLegId } : {}),
  },
});

type VoiceWebhookPayloadInput = {
  providerKey: string;
  providerLegId: string;
  providerEventId: string;
  threadId?: string;
};

export const buildVoiceWebhookPayload = (input: VoiceWebhookPayloadInput) => ({
  eventType: 'voice.connected' as const,
  providerKey: input.providerKey,
  providerEventId: input.providerEventId,
  providerLegId: input.providerLegId,
  ...(input.threadId ? { threadId: input.threadId } : {}),
});
