import { resolveSenderNumber } from '../senderNumberResolver';
import type { ConnectShyftThread } from '../threads';

const buildThread = (overrides: Partial<ConnectShyftThread> = {}): ConnectShyftThread => ({
  threadId: overrides.threadId ?? 'thread-f1-unclaimed-1001',
  tenantId: overrides.tenantId ?? 'tenant-connectshyft-f1',
  orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-f1-east',
  neighborId: overrides.neighborId ?? 'neighbor-connectshyft-f1-1001',
  personId: overrides.personId ?? 'person-connectshyft-f1-1001',
  activityId: overrides.activityId ?? null,
  source: overrides.source ?? 'SMS',
  state: overrides.state ?? 'UNCLAIMED',
  lastInboundCsNumberId: overrides.lastInboundCsNumberId ?? '+12605550191',
  preferredOutboundCsNumberId: overrides.preferredOutboundCsNumberId ?? '+12605550191',
  lastInboundProviderNumberE164:
    overrides.lastInboundProviderNumberE164 !== undefined
      ? overrides.lastInboundProviderNumberE164
      : '+12605550191',
  preferredOutboundProviderNumberE164:
    overrides.preferredOutboundProviderNumberE164 !== undefined
      ? overrides.preferredOutboundProviderNumberE164
      : '+12605550191',
  claimedByUserId: overrides.claimedByUserId ?? null,
  claimedAtUtc: overrides.claimedAtUtc ?? null,
  closedByUserId: overrides.closedByUserId ?? null,
  closedAtUtc: overrides.closedAtUtc ?? null,
  createdAtUtc: overrides.createdAtUtc ?? '2026-03-19T12:00:00.000Z',
  updatedAtUtc: overrides.updatedAtUtc ?? '2026-03-19T12:00:00.000Z',
  escalation: overrides.escalation ?? {
    stage: 0,
    nextEvaluationAtUtc: '2026-03-19T12:00:00.000Z',
  },
});

describe('connectshyft senderNumberResolver', () => {
  it('resolves a mapped provider number from persisted thread alignment', async () => {
    const result = await resolveSenderNumber(
      {
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        channel: 'sms',
      },
      {
        loadThread: async () => buildThread(),
        numberMappingService: {
          resolveRoutingMappingByNumber: async () => ({
            status: 'found',
            mapping: {
              mappingId: 'mapping-f1-001',
              tenantId: 'tenant-connectshyft-f1',
              orgUnitId: 'org-connectshyft-f1-east',
              twilioNumberE164: '+12605550191',
              label: 'Front Desk',
              isActive: true,
              createdAtUtc: '2026-03-19T12:00:00.000Z',
              updatedAtUtc: '2026-03-19T12:00:00.000Z',
            },
          }),
        },
      },
    );

    expect(result).toMatchObject({
      ok: true,
      providerNumberE164: '+12605550191',
      mappingId: 'mapping-f1-001',
      routingMetadata: {
        deterministic: true,
        channel: 'sms',
        source: 'thread_alignment',
        preferredOutboundProviderNumberE164: '+12605550191',
        lastInboundProviderNumberE164: '+12605550191',
        alignedFrom: 'preferred_outbound',
      },
    });
  });

  it('refuses when thread alignment is missing instead of falling back to threadId or neighborId', async () => {
    const result = await resolveSenderNumber(
      {
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        channel: 'sms',
      },
      {
        loadThread: async () => buildThread({
          lastInboundProviderNumberE164: null,
          preferredOutboundProviderNumberE164: null,
          lastInboundCsNumberId: '',
          preferredOutboundCsNumberId: '',
        }),
        numberMappingService: {
          resolveRoutingMappingByNumber: async () => ({ status: 'not-found' }),
        },
      },
    );

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SENDER_ALIGNMENT_REQUIRED',
      reason: 'sender_alignment_missing',
      routingMetadata: {
        preferredOutboundProviderNumberE164: null,
        lastInboundProviderNumberE164: null,
        candidateProviderNumberE164: null,
      },
    });
  });

  it('cuts over symbolic legacy sender tokens to the sole active org-unit provider number', async () => {
    const result = await resolveSenderNumber(
      {
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        channel: 'sms',
      },
      {
        loadThread: async () => buildThread({
          lastInboundProviderNumberE164: null,
          preferredOutboundProviderNumberE164: null,
          lastInboundCsNumberId: 'cs-number-f1-401',
          preferredOutboundCsNumberId: 'cs-number-f1-401',
        }),
        numberMappingService: {
          listMappings: async () => [
            {
              mappingId: 'mapping-f1-sole',
              tenantId: 'tenant-connectshyft-f1',
              orgUnitId: 'org-connectshyft-f1-east',
              twilioNumberE164: '+12605550191',
              label: 'Sole Line',
              isActive: true,
              createdAtUtc: '2026-03-19T12:00:00.000Z',
              updatedAtUtc: '2026-03-19T12:00:00.000Z',
            },
          ],
          resolveRoutingMappingByNumber: async () => ({
            status: 'found',
            mapping: {
              mappingId: 'mapping-f1-sole',
              tenantId: 'tenant-connectshyft-f1',
              orgUnitId: 'org-connectshyft-f1-east',
              twilioNumberE164: '+12605550191',
              label: 'Sole Line',
              isActive: true,
              createdAtUtc: '2026-03-19T12:00:00.000Z',
              updatedAtUtc: '2026-03-19T12:00:00.000Z',
            },
          }),
        },
      },
    );

    expect(result).toMatchObject({
      ok: true,
      providerNumberE164: '+12605550191',
      mappingId: 'mapping-f1-sole',
      routingMetadata: {
        preferredOutboundProviderNumberE164: null,
        lastInboundProviderNumberE164: null,
        candidateProviderNumberE164: '+12605550191',
        alignedFrom: 'preferred_outbound',
      },
    });
  });

  it('refuses ambiguous scoped mappings deterministically', async () => {
    const result = await resolveSenderNumber(
      {
        tenantId: 'tenant-connectshyft-f1',
        orgUnitId: 'org-connectshyft-f1-east',
        threadId: 'thread-f1-unclaimed-1001',
        channel: 'voice',
      },
      {
        loadThread: async () => buildThread(),
        numberMappingService: {
          resolveRoutingMappingByNumber: async () => ({
            status: 'ambiguous',
            mappings: [
              {
                mappingId: 'mapping-f1-a',
                tenantId: 'tenant-connectshyft-f1',
                orgUnitId: 'org-connectshyft-f1-east',
                twilioNumberE164: '+12605550191',
                label: 'Front Desk',
                isActive: true,
                createdAtUtc: '2026-03-19T12:00:00.000Z',
                updatedAtUtc: '2026-03-19T12:00:00.000Z',
              },
              {
                mappingId: 'mapping-f1-b',
                tenantId: 'tenant-connectshyft-f1',
                orgUnitId: 'org-connectshyft-f1-east',
                twilioNumberE164: '+12605550191',
                label: 'Overflow',
                isActive: true,
                createdAtUtc: '2026-03-19T12:00:00.000Z',
                updatedAtUtc: '2026-03-19T12:00:00.000Z',
              },
            ],
          }),
        },
      },
    );

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SENDER_MAPPING_AMBIGUOUS',
      reason: 'sender_mapping_ambiguous',
      routingMetadata: {
        preferredOutboundProviderNumberE164: '+12605550191',
        lastInboundProviderNumberE164: '+12605550191',
        candidateMappings: [
          { mappingId: 'mapping-f1-a', providerNumberE164: '+12605550191' },
          { mappingId: 'mapping-f1-b', providerNumberE164: '+12605550191' },
        ],
      },
    });
  });
});
