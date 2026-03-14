import { randomUUID } from 'node:crypto'
import type { Knex } from 'knex'
import db from '../../config/knex'
import {
  buildHandleProviderBridgeEvent,
  buildStartBridgeSession,
  type BridgeSessionAggregate,
  type BridgeLegRecord,
  type BridgeSessionRecord,
  type BridgeSessionRepository,
  type BridgeTelephonyProvider,
  type ProviderBridgeEvent,
  type StartBridgeSessionCommand,
} from '../../../../../domains/communication'
import { recordConnectShyftBridgeLegProviderIdentifierMapping } from './providerCorrelationMappings'
import { isConnectShyftTestOverrideEnabled } from './featureFlags'
import type {
  ConnectShyftOutboundCallDispatchPolicy,
  ConnectShyftProviderAdapter,
} from './providerRegistry'

const BRIDGE_SESSIONS_TABLE = 'cs_bridge_sessions'
const BRIDGE_LEGS_TABLE = 'cs_bridge_legs'

type DbBridgeSessionRow = {
  id: string
  tenant_id: string
  org_unit_id: string
  thread_id: string
  operator_participant_id: string
  neighbor_participant_id: string
  operator_contact_point_id: string
  neighbor_contact_point_id: string
  selected_outbound_contact_point_id?: string | null
  bridge_status: string
  failure_code?: string | null
  failure_message?: string | null
  ended_by?: string | null
  idempotency_key?: string | null
  audit_correlation_id?: string | null
  created_at_utc: string | Date
  updated_at_utc: string | Date
  completed_at_utc?: string | Date | null
}

type DbBridgeLegRow = {
  id: string
  tenant_id: string
  org_unit_id: string
  bridge_session_id: string
  leg_role: 'operator' | 'neighbor'
  contact_point_id: string
  provider_call_id?: string | null
  leg_status: string
  started_at_utc?: string | Date | null
  answered_at_utc?: string | Date | null
  ended_at_utc?: string | Date | null
  failure_code?: string | null
  failure_message?: string | null
  created_at_utc: string | Date
  updated_at_utc: string | Date
}

type StartConnectShyftBridgeSessionInput = {
  tenantId: string
  orgUnitId: string
  threadId: string
  operatorParticipantId: string
  neighborParticipantId: string
  operatorContactPointId: string
  neighborContactPointId: string
  selectedOutboundContactPointId?: string | null
  providerKey: string
  providerAdapter: ConnectShyftProviderAdapter
  idempotencyKey?: string | null
  auditCorrelationId?: string | null
  callPolicy?: ConnectShyftOutboundCallDispatchPolicy
}

type HandleConnectShyftBridgeWebhookEventInput = {
  tenantId: string
  orgUnitId: string
  threadId: string
  providerKey: string
  providerAdapter: ConnectShyftProviderAdapter
  providerLegId: string | null
  eventType: string
  occurredAt?: Date
  reason?: string | null
  callPolicy?: ConnectShyftOutboundCallDispatchPolicy
}

type BridgeMappingStatus = 'created' | 'duplicate' | 'ignored' | 'error'

type BridgeMappingResult = {
  deterministic: true
  operatorLegMapping: BridgeMappingStatus
  neighborLegMapping: BridgeMappingStatus
  error: {
    code: 'CONNECTSHYFT_PROVIDER_CORRELATION_PERSISTENCE_UNAVAILABLE'
    message: string
  } | null
}

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

const toIsoString = (value: string | Date | null | undefined): string | null => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  const parsed = new Date(value)
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed.toISOString()
  }

  return normalizeString(value) || null
}

const toDate = (value: string | Date | null | undefined): Date | null => {
  const iso = toIsoString(value)
  return iso ? new Date(iso) : null
}

const isMissingPersistenceError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false
  }

  const candidate = error as { code?: string }
  return candidate.code === '42P01'
    || candidate.code === '3F000'
    || candidate.code === '42703'
}

const mapSessionRow = (row: DbBridgeSessionRow): BridgeSessionRecord => ({
  id: row.id,
  tenantId: row.tenant_id,
  orgUnitId: row.org_unit_id,
  threadId: row.thread_id,
  operatorParticipantId: row.operator_participant_id,
  neighborParticipantId: row.neighbor_participant_id,
  operatorContactPointId: row.operator_contact_point_id,
  neighborContactPointId: row.neighbor_contact_point_id,
  selectedOutboundContactPointId: normalizeString(row.selected_outbound_contact_point_id) || null,
  status: row.bridge_status as BridgeSessionRecord['status'],
  failureCode: normalizeString(row.failure_code) as BridgeSessionRecord['failureCode'],
  failureMessage: normalizeString(row.failure_message) || null,
  endedBy: normalizeString(row.ended_by) || null,
  idempotencyKey: normalizeString(row.idempotency_key) || null,
  auditCorrelationId: normalizeString(row.audit_correlation_id) || null,
  createdAt: new Date(toIsoString(row.created_at_utc) || new Date().toISOString()),
  updatedAt: new Date(toIsoString(row.updated_at_utc) || new Date().toISOString()),
  completedAt: toDate(row.completed_at_utc),
})

const mapLegRow = (row: DbBridgeLegRow): BridgeLegRecord => ({
  id: row.id,
  tenantId: row.tenant_id,
  orgUnitId: row.org_unit_id,
  bridgeSessionId: row.bridge_session_id,
  legRole: row.leg_role,
  contactPointId: row.contact_point_id,
  providerCallId: normalizeString(row.provider_call_id) || null,
  status: row.leg_status as BridgeLegRecord['status'],
  startedAt: toDate(row.started_at_utc),
  answeredAt: toDate(row.answered_at_utc),
  endedAt: toDate(row.ended_at_utc),
  failureCode: normalizeString(row.failure_code) as BridgeLegRecord['failureCode'],
  failureMessage: normalizeString(row.failure_message) || null,
  createdAt: new Date(toIsoString(row.created_at_utc) || new Date().toISOString()),
  updatedAt: new Date(toIsoString(row.updated_at_utc) || new Date().toISOString()),
})

const sessionToRow = (session: BridgeSessionRecord) => ({
  id: session.id,
  tenant_id: session.tenantId,
  org_unit_id: session.orgUnitId,
  thread_id: session.threadId,
  operator_participant_id: session.operatorParticipantId,
  neighbor_participant_id: session.neighborParticipantId,
  operator_contact_point_id: session.operatorContactPointId,
  neighbor_contact_point_id: session.neighborContactPointId,
  selected_outbound_contact_point_id: session.selectedOutboundContactPointId ?? null,
  bridge_status: session.status,
  failure_code: session.failureCode ?? null,
  failure_message: session.failureMessage ?? null,
  ended_by: session.endedBy ?? null,
  idempotency_key: session.idempotencyKey ?? null,
  audit_correlation_id: session.auditCorrelationId ?? null,
  created_at_utc: session.createdAt.toISOString(),
  updated_at_utc: session.updatedAt.toISOString(),
  completed_at_utc: session.completedAt ? session.completedAt.toISOString() : null,
})

const legToRow = (leg: BridgeLegRecord) => ({
  id: leg.id,
  tenant_id: leg.tenantId,
  org_unit_id: leg.orgUnitId,
  bridge_session_id: leg.bridgeSessionId,
  leg_role: leg.legRole,
  contact_point_id: leg.contactPointId,
  provider_call_id: leg.providerCallId ?? null,
  leg_status: leg.status,
  started_at_utc: leg.startedAt ? leg.startedAt.toISOString() : null,
  answered_at_utc: leg.answeredAt ? leg.answeredAt.toISOString() : null,
  ended_at_utc: leg.endedAt ? leg.endedAt.toISOString() : null,
  failure_code: leg.failureCode ?? null,
  failure_message: leg.failureMessage ?? null,
  created_at_utc: leg.createdAt.toISOString(),
  updated_at_utc: leg.updatedAt.toISOString(),
})

class InMemoryConnectShyftBridgeSessionStore implements BridgeSessionRepository {
  private sessions = new Map<string, BridgeSessionRecord>()
  private legsBySessionId = new Map<string, Map<'operator' | 'neighbor', BridgeLegRecord>>()
  private sessionIdByProviderCallId = new Map<string, string>()

  createSession(session: BridgeSessionRecord): Promise<void> {
    this.sessions.set(session.id, { ...session })
    return Promise.resolve()
  }

  createLeg(leg: BridgeLegRecord): Promise<void> {
    const current = this.legsBySessionId.get(leg.bridgeSessionId) || new Map()
    current.set(leg.legRole, { ...leg })
    this.legsBySessionId.set(leg.bridgeSessionId, current)
    if (leg.providerCallId) {
      this.sessionIdByProviderCallId.set(leg.providerCallId, leg.bridgeSessionId)
    }
    return Promise.resolve()
  }

  saveAggregate(aggregate: BridgeSessionAggregate): Promise<void> {
    this.sessions.set(aggregate.session.id, { ...aggregate.session })
    const legs = new Map<'operator' | 'neighbor', BridgeLegRecord>()
    legs.set('operator', { ...aggregate.operatorLeg })
    legs.set('neighbor', { ...aggregate.neighborLeg })
    this.legsBySessionId.set(aggregate.session.id, legs)
    if (aggregate.operatorLeg.providerCallId) {
      this.sessionIdByProviderCallId.set(aggregate.operatorLeg.providerCallId, aggregate.session.id)
    }
    if (aggregate.neighborLeg.providerCallId) {
      this.sessionIdByProviderCallId.set(aggregate.neighborLeg.providerCallId, aggregate.session.id)
    }
    return Promise.resolve()
  }

  getAggregateBySessionId(sessionId: string): Promise<BridgeSessionAggregate | null> {
    const session = this.sessions.get(sessionId)
    const legs = this.legsBySessionId.get(sessionId)
    const operatorLeg = legs?.get('operator')
    const neighborLeg = legs?.get('neighbor')
    if (!session || !operatorLeg || !neighborLeg) {
      return Promise.resolve(null)
    }

    return Promise.resolve({
      session: { ...session },
      operatorLeg: { ...operatorLeg },
      neighborLeg: { ...neighborLeg },
    })
  }

  getAggregateByProviderCallId(input: {
    tenantId?: string | null
    providerCallId: string
  }): Promise<BridgeSessionAggregate | null> {
    const sessionId = this.sessionIdByProviderCallId.get(input.providerCallId)
    if (!sessionId) {
      return Promise.resolve(null)
    }

    return this.getAggregateBySessionId(sessionId)
  }

  getAggregateByThreadId(input: {
    tenantId?: string | null
    threadId: string
  }): Promise<BridgeSessionAggregate | null> {
    const tenantId = normalizeString(input.tenantId || null)
    const latestSession = Array.from(this.sessions.values())
      .filter((session) => {
        if (session.threadId !== input.threadId) {
          return false
        }
        return !tenantId || session.tenantId === tenantId
      })
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0]

    if (!latestSession) {
      return Promise.resolve(null)
    }

    return this.getAggregateBySessionId(latestSession.id)
  }

  reset(): void {
    this.sessions.clear()
    this.legsBySessionId.clear()
    this.sessionIdByProviderCallId.clear()
  }
}

class KnexConnectShyftBridgeSessionStore implements BridgeSessionRepository {
  constructor(private readonly knexClient: Knex = db) {}

  async createSession(session: BridgeSessionRecord): Promise<void> {
    await this.knexClient
      .withSchema('connectshyft')
      .table(BRIDGE_SESSIONS_TABLE)
      .insert(sessionToRow(session))
  }

  async createLeg(leg: BridgeLegRecord): Promise<void> {
    await this.knexClient
      .withSchema('connectshyft')
      .table(BRIDGE_LEGS_TABLE)
      .insert(legToRow(leg))
  }

  async saveAggregate(aggregate: BridgeSessionAggregate): Promise<void> {
    await this.knexClient.transaction(async (trx) => {
      await trx
        .withSchema('connectshyft')
        .table(BRIDGE_SESSIONS_TABLE)
        .insert(sessionToRow(aggregate.session))
        .onConflict(['id'])
        .merge()

      await trx
        .withSchema('connectshyft')
        .table(BRIDGE_LEGS_TABLE)
        .insert([legToRow(aggregate.operatorLeg), legToRow(aggregate.neighborLeg)])
        .onConflict(['id'])
        .merge()
    })
  }

  async getAggregateBySessionId(sessionId: string): Promise<BridgeSessionAggregate | null> {
    const sessionRow = await this.knexClient
      .withSchema('connectshyft')
      .table(BRIDGE_SESSIONS_TABLE)
      .where({ id: sessionId })
      .first<DbBridgeSessionRow>()

    if (!sessionRow) {
      return null
    }

    const legRows = await this.knexClient
      .withSchema('connectshyft')
      .table(BRIDGE_LEGS_TABLE)
      .where({ bridge_session_id: sessionId })
      .select<DbBridgeLegRow[]>([
        'id',
        'tenant_id',
        'org_unit_id',
        'bridge_session_id',
        'leg_role',
        'contact_point_id',
        'provider_call_id',
        'leg_status',
        'started_at_utc',
        'answered_at_utc',
        'ended_at_utc',
        'failure_code',
        'failure_message',
        'created_at_utc',
        'updated_at_utc',
      ])

    const operatorLeg = legRows.find((row) => row.leg_role === 'operator')
    const neighborLeg = legRows.find((row) => row.leg_role === 'neighbor')
    if (!operatorLeg || !neighborLeg) {
      return null
    }

    return {
      session: mapSessionRow(sessionRow),
      operatorLeg: mapLegRow(operatorLeg),
      neighborLeg: mapLegRow(neighborLeg),
    }
  }

  async getAggregateByProviderCallId(input: {
    tenantId?: string | null
    providerCallId: string
  }): Promise<BridgeSessionAggregate | null> {
    const legQuery = this.knexClient
      .withSchema('connectshyft')
      .table(`${BRIDGE_LEGS_TABLE} as bl`)
      .join(`${BRIDGE_SESSIONS_TABLE} as bs`, 'bs.id', 'bl.bridge_session_id')
      .where('bl.provider_call_id', input.providerCallId)

    const tenantId = normalizeString(input.tenantId || null)
    if (tenantId) {
      legQuery.andWhere('bs.tenant_id', tenantId)
    }

    const legRow = await legQuery
      .first<{ bridgeSessionId?: string }>('bl.bridge_session_id as bridgeSessionId')

    const sessionId = normalizeString(legRow?.bridgeSessionId)
    if (!sessionId) {
      return null
    }

    return this.getAggregateBySessionId(sessionId)
  }

  async getAggregateByThreadId(input: {
    tenantId?: string | null
    threadId: string
  }): Promise<BridgeSessionAggregate | null> {
    const sessionQuery = this.knexClient
      .withSchema('connectshyft')
      .table(BRIDGE_SESSIONS_TABLE)
      .where({ thread_id: input.threadId })
      .orderBy('updated_at_utc', 'desc')

    const tenantId = normalizeString(input.tenantId || null)
    if (tenantId) {
      sessionQuery.andWhere('tenant_id', tenantId)
    }

    const sessionRow = await sessionQuery.first<DbBridgeSessionRow>()
    if (!sessionRow) {
      return null
    }

    return this.getAggregateBySessionId(sessionRow.id)
  }
}

const inMemoryBridgeSessionStore = new InMemoryConnectShyftBridgeSessionStore()
const knexBridgeSessionStore = new KnexConnectShyftBridgeSessionStore()

const callPolicyOrDefault = (
  callPolicy?: ConnectShyftOutboundCallDispatchPolicy,
): ConnectShyftOutboundCallDispatchPolicy => ({
  transport: normalizeString(callPolicy?.transport) || 'bridge',
  autoRetry: callPolicy?.autoRetry === true,
  redialPolicy: normalizeString(callPolicy?.redialPolicy) || 'manual_only',
})

const buildBridgeTelephonyProvider = (input: {
  tenantId: string
  orgUnitId: string
  threadId: string
  providerKey: string
  providerAdapter: ConnectShyftProviderAdapter
  idempotencyKey?: string | null
  callPolicy?: ConnectShyftOutboundCallDispatchPolicy
}): BridgeTelephonyProvider => ({
  async startOutboundCall(command) {
    const startBridgeOutboundCall = input.providerAdapter.startBridgeOutboundCall
    const dispatchResult = startBridgeOutboundCall
      ? await startBridgeOutboundCall({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        threadId: input.threadId,
        providerKey: input.providerKey,
        bridgeSessionId: command.bridgeSessionId,
        legId: command.legId,
        legRole: command.legRole,
        targetPhone: command.toContactPointId,
        fromContactPointId: command.fromContactPointId ?? null,
        idempotencyKey: input.idempotencyKey ?? undefined,
      })
      : await input.providerAdapter.startOutboundCall({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        threadId: input.threadId,
        providerKey: input.providerKey,
        targetPhone: command.toContactPointId,
        idempotencyKey: input.idempotencyKey ?? undefined,
        callPolicy: callPolicyOrDefault(input.callPolicy),
      })

    const providerCallId = normalizeString(dispatchResult.providerLegId)
    if (!providerCallId) {
      throw new Error('Bridge outbound call requires a provider call id.')
    }

    return {
      providerCallId,
    }
  },
  async startBridgeSession(command) {
    if (!input.providerAdapter.startBridgeSession) {
      throw new Error(`Provider ${input.providerKey} does not support bridge control.`)
    }

    await input.providerAdapter.startBridgeSession({
      providerKey: input.providerKey,
      bridgeSessionId: command.bridgeSessionId,
      operatorProviderCallId: command.operatorProviderCallId,
      neighborProviderCallId: command.neighborProviderCallId,
      idempotencyKey: input.idempotencyKey ?? undefined,
    })
  },
})

const persistLegMapping = async (input: {
  tenantId: string
  orgUnitId: string
  threadId: string
  providerName: string
  leg: BridgeLegRecord
}): Promise<BridgeMappingStatus> => {
  if (!input.leg.providerCallId) {
    return 'ignored'
  }

  const result = await recordConnectShyftBridgeLegProviderIdentifierMapping({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    threadId: input.threadId,
    providerName: input.providerName,
    providerIdentifier: input.leg.providerCallId,
    bridgeLegId: input.leg.id,
    db: isConnectShyftTestOverrideEnabled() ? undefined : db,
  })

  return result.status
}

const persistBridgeProviderMappings = async (input: {
  aggregate: BridgeSessionAggregate
  providerName: string
}): Promise<BridgeMappingResult> => {
  try {
    const operatorLegMapping = await persistLegMapping({
      tenantId: input.aggregate.session.tenantId,
      orgUnitId: input.aggregate.session.orgUnitId,
      threadId: input.aggregate.session.threadId,
      providerName: input.providerName,
      leg: input.aggregate.operatorLeg,
    })
    const neighborLegMapping = await persistLegMapping({
      tenantId: input.aggregate.session.tenantId,
      orgUnitId: input.aggregate.session.orgUnitId,
      threadId: input.aggregate.session.threadId,
      providerName: input.providerName,
      leg: input.aggregate.neighborLeg,
    })

    return {
      deterministic: true,
      operatorLegMapping,
      neighborLegMapping,
      error: null,
    }
  } catch (error) {
    return {
      deterministic: true,
      operatorLegMapping: 'error',
      neighborLegMapping: 'error',
      error: {
        code: 'CONNECTSHYFT_PROVIDER_CORRELATION_PERSISTENCE_UNAVAILABLE',
        message: error instanceof Error
          ? error.message
          : 'Provider correlation mapping persistence unavailable.',
      },
    }
  }
}

const resolveBridgeWebhookEvent = (input: {
  aggregate: BridgeSessionAggregate
  providerLegId: string
  eventType: string
  occurredAt?: Date
  reason?: string | null
}): ProviderBridgeEvent | null => {
  const normalizedEventType = normalizeString(input.eventType).toLowerCase()
  const legRole = input.aggregate.operatorLeg.providerCallId === input.providerLegId
    ? 'operator'
    : input.aggregate.neighborLeg.providerCallId === input.providerLegId
      ? 'neighbor'
      : null

  if (normalizedEventType === 'callanswered' || normalizedEventType === 'voiceanswered') {
    if (legRole === 'operator') {
      return {
        type: 'operator_answered',
        bridgeSessionId: input.aggregate.session.id,
        providerCallId: input.providerLegId,
        occurredAt: input.occurredAt,
      }
    }

    if (legRole === 'neighbor') {
      return {
        type: 'neighbor_answered',
        bridgeSessionId: input.aggregate.session.id,
        providerCallId: input.providerLegId,
        occurredAt: input.occurredAt,
      }
    }
  }

  if (
    normalizedEventType === 'callbridged'
    || normalizedEventType === 'callconnected'
  ) {
    return {
      type: 'bridge_connected',
      bridgeSessionId: input.aggregate.session.id,
      occurredAt: input.occurredAt,
    }
  }

  if (
    normalizedEventType === 'callhangup'
    || normalizedEventType === 'callcompleted'
    || normalizedEventType === 'callended'
  ) {
    if (input.aggregate.session.status === 'bridged' || input.aggregate.session.status === 'completed') {
      return {
        type: 'completed',
        bridgeSessionId: input.aggregate.session.id,
        providerCallId: input.providerLegId,
        occurredAt: input.occurredAt,
      }
    }

    if (legRole === 'operator') {
      return {
        type: 'operator_failed',
        bridgeSessionId: input.aggregate.session.id,
        providerCallId: input.providerLegId,
        reason: input.reason || 'call_hangup',
        occurredAt: input.occurredAt,
      }
    }

    if (legRole === 'neighbor') {
      return {
        type: 'neighbor_failed',
        bridgeSessionId: input.aggregate.session.id,
        providerCallId: input.providerLegId,
        reason: input.reason || 'call_hangup',
        occurredAt: input.occurredAt,
      }
    }
  }

  if (
    normalizedEventType === 'callfailed'
    || normalizedEventType === 'callfailure'
    || normalizedEventType === 'callrejected'
  ) {
    if (legRole === 'operator') {
      return {
        type: 'operator_failed',
        bridgeSessionId: input.aggregate.session.id,
        providerCallId: input.providerLegId,
        reason: input.reason || 'call_failed',
        occurredAt: input.occurredAt,
      }
    }

    if (legRole === 'neighbor') {
      return {
        type: 'neighbor_failed',
        bridgeSessionId: input.aggregate.session.id,
        providerCallId: input.providerLegId,
        reason: input.reason || 'call_failed',
        occurredAt: input.occurredAt,
      }
    }
  }

  return null
}

const repositoryProxy: BridgeSessionRepository = {
  async createSession(session) {
    if (isConnectShyftTestOverrideEnabled()) {
      await inMemoryBridgeSessionStore.createSession(session)
      return
    }

    try {
      await knexBridgeSessionStore.createSession(session)
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error
      }
      await inMemoryBridgeSessionStore.createSession(session)
    }
  },
  async createLeg(leg) {
    if (isConnectShyftTestOverrideEnabled()) {
      await inMemoryBridgeSessionStore.createLeg(leg)
      return
    }

    try {
      await knexBridgeSessionStore.createLeg(leg)
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error
      }
      await inMemoryBridgeSessionStore.createLeg(leg)
    }
  },
  async saveAggregate(aggregate) {
    if (isConnectShyftTestOverrideEnabled()) {
      await inMemoryBridgeSessionStore.saveAggregate(aggregate)
      return
    }

    try {
      await knexBridgeSessionStore.saveAggregate(aggregate)
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error
      }
      await inMemoryBridgeSessionStore.saveAggregate(aggregate)
    }
  },
  async getAggregateBySessionId(sessionId) {
    if (isConnectShyftTestOverrideEnabled()) {
      return inMemoryBridgeSessionStore.getAggregateBySessionId(sessionId)
    }

    try {
      return await knexBridgeSessionStore.getAggregateBySessionId(sessionId)
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error
      }
      return inMemoryBridgeSessionStore.getAggregateBySessionId(sessionId)
    }
  },
  async getAggregateByThreadId(input) {
    if (isConnectShyftTestOverrideEnabled()) {
      return inMemoryBridgeSessionStore.getAggregateByThreadId(input)
    }

    try {
      return await knexBridgeSessionStore.getAggregateByThreadId(input)
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error
      }
      return inMemoryBridgeSessionStore.getAggregateByThreadId(input)
    }
  },
  async getAggregateByProviderCallId(input) {
    if (isConnectShyftTestOverrideEnabled()) {
      return inMemoryBridgeSessionStore.getAggregateByProviderCallId(input)
    }

    try {
      return await knexBridgeSessionStore.getAggregateByProviderCallId(input)
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error
      }
      return inMemoryBridgeSessionStore.getAggregateByProviderCallId(input)
    }
  },
}

export const resetConnectShyftBridgeSessionStateForTests = (): void => {
  inMemoryBridgeSessionStore.reset()
}

export const loadConnectShyftBridgeAggregateBySessionId = async (
  sessionId: string,
): Promise<BridgeSessionAggregate | null> => repositoryProxy.getAggregateBySessionId(sessionId)

export const loadConnectShyftBridgeAggregateByThreadId = async (input: {
  tenantId?: string | null
  threadId: string
}): Promise<BridgeSessionAggregate | null> => repositoryProxy.getAggregateByThreadId(input)

export const loadConnectShyftBridgeAggregateByProviderCallId = async (input: {
  tenantId?: string | null
  providerCallId: string
}): Promise<BridgeSessionAggregate | null> => repositoryProxy.getAggregateByProviderCallId(input)

export const startConnectShyftBridgeSession = async (
  input: StartConnectShyftBridgeSessionInput,
): Promise<{
  aggregate: BridgeSessionAggregate
  correlationMapping: BridgeMappingResult
}> => {
  const telephonyProvider = buildBridgeTelephonyProvider({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    threadId: input.threadId,
    providerKey: input.providerKey,
    providerAdapter: input.providerAdapter,
    idempotencyKey: input.idempotencyKey ?? null,
    callPolicy: input.callPolicy,
  })
  const startBridgeSession = buildStartBridgeSession({
    repository: repositoryProxy,
    telephonyProvider,
    idGenerator: randomUUID,
  })

  const aggregate = await startBridgeSession({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    threadId: input.threadId,
    operatorParticipantId: input.operatorParticipantId,
    neighborParticipantId: input.neighborParticipantId,
    operatorContactPointId: input.operatorContactPointId,
    neighborContactPointId: input.neighborContactPointId,
    selectedOutboundContactPointId: input.selectedOutboundContactPointId ?? undefined,
    idempotencyKey: input.idempotencyKey ?? undefined,
    auditCorrelationId: input.auditCorrelationId ?? undefined,
  } satisfies StartBridgeSessionCommand)

  return {
    aggregate,
    correlationMapping: await persistBridgeProviderMappings({
      aggregate,
      providerName: input.providerKey,
    }),
  }
}

export const handleConnectShyftBridgeWebhookEvent = async (
  input: HandleConnectShyftBridgeWebhookEventInput,
): Promise<{
  handled: boolean
  aggregate: BridgeSessionAggregate | null
  domainEvent: ProviderBridgeEvent | null
  correlationMapping: BridgeMappingResult | null
}> => {
  const providerLegId = normalizeString(input.providerLegId)
  if (!providerLegId) {
    return {
      handled: false,
      aggregate: null,
      domainEvent: null,
      correlationMapping: null,
    }
  }

  const existingAggregate = await repositoryProxy.getAggregateByProviderCallId({
    tenantId: input.tenantId,
    providerCallId: providerLegId,
  })
  if (!existingAggregate) {
    return {
      handled: false,
      aggregate: null,
      domainEvent: null,
      correlationMapping: null,
    }
  }

  const domainEvent = resolveBridgeWebhookEvent({
    aggregate: existingAggregate,
    providerLegId,
    eventType: input.eventType,
    occurredAt: input.occurredAt,
    reason: input.reason ?? null,
  })
  if (!domainEvent) {
    return {
      handled: false,
      aggregate: existingAggregate,
      domainEvent: null,
      correlationMapping: null,
    }
  }

  const telephonyProvider = buildBridgeTelephonyProvider({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    threadId: input.threadId,
    providerKey: input.providerKey,
    providerAdapter: input.providerAdapter,
    callPolicy: input.callPolicy,
  })
  const handleProviderBridgeEvent = buildHandleProviderBridgeEvent({
    repository: repositoryProxy,
    telephonyProvider,
  })
  const aggregate = await handleProviderBridgeEvent(domainEvent)
  if (!aggregate) {
    return {
      handled: false,
      aggregate: null,
      domainEvent,
      correlationMapping: null,
    }
  }

  return {
    handled: true,
    aggregate,
    domainEvent,
    correlationMapping: await persistBridgeProviderMappings({
      aggregate,
      providerName: input.providerKey,
    }),
  }
}
