import {
  InMemoryTelephonyDispatchLedger,
  assertValidCallDispatchResult,
  assertValidSmsDispatchResult,
  buildTelephonyDispatchReplayKey,
} from '../index'
import * as communicationDomain from '../../index'

describe('communication telephony domain', () => {
  it('builds deterministic replay keys from explicit idempotency keys and request content', () => {
    const first = buildTelephonyDispatchReplayKey({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-f1-unclaimed-1001',
      providerKey: 'telnyx',
      action: 'message',
      idempotencyKey: 'idem-001',
      actorId: 'user-connectshyft-f1-primary-operator',
      body: 'Need assistance',
      targetPhone: '+12605550111',
    })

    const duplicate = buildTelephonyDispatchReplayKey({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-f1-unclaimed-1001',
      providerKey: 'telnyx',
      action: 'message',
      idempotencyKey: 'idem-001',
      actorId: 'user-connectshyft-f1-primary-operator',
      body: 'Need assistance',
      targetPhone: '+12605550111',
    })

    const changedPayload = buildTelephonyDispatchReplayKey({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-f1-unclaimed-1001',
      providerKey: 'telnyx',
      action: 'message',
      idempotencyKey: 'idem-001',
      actorId: 'user-connectshyft-f1-primary-operator',
      body: 'Changed copy',
      targetPhone: '+12605550111',
    })

    const changedActor = buildTelephonyDispatchReplayKey({
      tenantId: 'tenant-connectshyft-f1',
      orgUnitId: 'org-connectshyft-f1-east',
      threadId: 'thread-f1-unclaimed-1001',
      providerKey: 'telnyx',
      action: 'message',
      idempotencyKey: 'idem-001',
      actorId: 'user-connectshyft-f1-secondary-operator',
      body: 'Need assistance',
      targetPhone: '+12605550111',
    })

    expect(first).toBeTruthy()
    expect(first).toBe(duplicate)
    expect(changedPayload).not.toBe(first)
    expect(changedActor).not.toBe(first)
  })

  it('stores and replays dispatch snapshots in the in-memory ledger', () => {
    const ledger = new InMemoryTelephonyDispatchLedger<{ providerMessageId: string }>()
    ledger.remember('telephony-dispatch:test', { providerMessageId: 'msg-123' })

    expect(ledger.get('telephony-dispatch:test')).toEqual({ providerMessageId: 'msg-123' })

    ledger.clear()
    expect(ledger.get('telephony-dispatch:test')).toBeNull()
  })

  it('accepts valid SMS dispatch results and rejects malformed ones', () => {
    expect(
      assertValidSmsDispatchResult({
        providerKey: 'telnyx',
        channel: 'message',
        providerLegId: null,
        providerMessageId: 'msg-123',
        adapterInvoked: true,
        providerBranchingInDomain: false,
      }),
    ).toMatchObject({
      providerKey: 'telnyx',
      providerMessageId: 'msg-123',
    })

    expect(() =>
      assertValidSmsDispatchResult({
        providerKey: 'telnyx',
        channel: 'message',
        providerLegId: 'leg-123',
        providerMessageId: 'msg-123',
        adapterInvoked: true,
        providerBranchingInDomain: false,
      }),
    ).toThrow('SMS dispatch results must not include providerLegId.')
  })

  it('accepts valid outbound call results and rejects malformed ones', () => {
    expect(
      assertValidCallDispatchResult({
        providerKey: 'telnyx',
        channel: 'call',
        providerLegId: 'leg-123',
        providerMessageId: null,
        adapterInvoked: true,
        providerBranchingInDomain: false,
      }),
    ).toMatchObject({
      providerKey: 'telnyx',
      providerLegId: 'leg-123',
    })

    expect(() =>
      assertValidCallDispatchResult({
        providerKey: 'telnyx',
        channel: 'call',
        providerLegId: null,
        providerMessageId: null,
        adapterInvoked: true,
        providerBranchingInDomain: false,
      }),
    ).toThrow('Call dispatch results require providerLegId.')
  })

  it('exports telephony helpers from the root communication domain entrypoint', () => {
    expect(typeof communicationDomain.buildTelephonyDispatchReplayKey).toBe('function')
    expect(typeof communicationDomain.assertValidSmsDispatchResult).toBe('function')
    expect(typeof communicationDomain.assertValidCallDispatchResult).toBe('function')
  })
})
