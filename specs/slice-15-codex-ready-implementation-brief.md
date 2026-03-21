# SLICE 15 — OPS VISIBILITY (READ-ONLY SURFACES)

## STATUS: READY FOR IMPLEMENTATION

## TYPE: EXECUTION BRIEF (AUTHORITATIVE)

---

## OBJECTIVE

Expose operational visibility for identity + telephony state WITHOUT introducing any write paths or behavioral mutations.

This slice is strictly read-only.

---

## SCOPE

### INCLUDED

1. Identity Resolution Visibility
   - ambiguity state
   - resolution path taken
   - PeopleCore vs legacy decision

2. Telephony Runtime Visibility
   - bridge session state
   - call leg status (operator / neighbor)
   - provider state (Telnyx)

3. Ops-Facing Endpoints
   - read-only endpoints under `/api/v1/connectshyft/ops/*`

4. Structured Logging + Telemetry

---

### EXCLUDED (HARD BLOCK)

- NO mutation endpoints
- NO retry logic
- NO resolution overrides
- NO lifecycle actions (close/reopen/escalate)
- NO telephony control (no call manipulation)

---

## POLICY: OPS VISIBILITY (LOCKED)

Decision:

- Ops visibility is read-only and non-interventionist

Rules:

- No endpoint may trigger state mutation
- No endpoint may call write services
- No endpoint may invoke provider actions
- All responses must reflect current system state only

Enforcement:

- All handlers must be pure read adapters
- Service layer calls must be read-only functions
- Type system must prevent mutation imports

Telemetry:

- Emit `ops.visibility.requested`
- Emit `ops.visibility.response_returned`

---

## MODULES

### 1. Ops Visibility Router

Path:
`apps/connectshyft-api/src/routes/api/v1/connectshyft/ops.routes.ts`

Responsibilities:

- Define all ops endpoints
- Enforce read-only contract
- Map to service layer

Endpoints:

GET `/ops/identity/:phone`
GET `/ops/threads/:threadId`
GET `/ops/bridge/:bridgeId`

---

### 2. Identity Visibility Service

Path:
`apps/connectshyft-api/src/modules/connectshyft/ops/identityVisibility.service.ts`

Responsibilities:

- Surface identity resolution outcome
- Include ambiguity state
- Include PeopleCore decision path

Output shape:

```ts
{
  phone: string,
  resolution: 'single_match' | 'ambiguous' | 'no_match',
  source: 'peoplecore' | 'legacy',
  candidates?: Array<{ id: string, confidence: number }>,
  selectedId?: string
}
```

---

### 3. Bridge Session Visibility Service

Path:
`apps/connectshyft-api/src/modules/connectshyft/ops/bridgeVisibility.service.ts`

Dependencies:

- bridgeSessions runtime seam

Responsibilities:

- Surface bridge state
- Show both call legs
- Reflect provider status

Output shape:

```ts
{
  bridgeId: string,
  status: 'initiated' | 'ringing' | 'connected' | 'failed' | 'ended',
  operatorLeg: {
    phone: string,
    status: string
  },
  neighborLeg: {
    phone: string,
    status: string
  },
  provider: 'telnyx',
  lastEventAt: string
}
```

---

### 4. Thread Visibility Adapter

Path:
`apps/connectshyft-api/src/modules/connectshyft/ops/threadVisibility.service.ts`

Responsibilities:

- Read-only thread lookup
- Surface existence vs not-found
- No mutation

---

## ROUTE HANDLERS

Path:
`apps/connectshyft-api/src/modules/connectshyft/http/ops.handlers.ts`

Rules:

- No business logic
- No mutation
- Only call visibility services

---

## CONTRACT ENFORCEMENT

- No import of:
  - create\*
  - update\*
  - resolve\*
  - provider outbound calls

- Allowed:
  - store.get\*
  - service.read\*
  - adapters

---

## TESTS

Create:

```
__tests__/ops.identity.test.ts
__tests__/ops.bridge.test.ts
__tests__/ops.thread.test.ts
```

Coverage:

- identity ambiguity surfaced correctly
- no-match path surfaced correctly
- bridge state reflects runtime seam
- thread not-found vs found behavior

---

## VALIDATION COMMANDS

pnpm nx run connectshyft-api:test

pnpm --dir apps/connectshyft-api exec jest --runInBand \
 src/modules/connectshyft/ops/**tests**/\*.test.ts

---

## ACCEPTANCE CRITERIA

- All endpoints return without mutation
- No provider calls triggered
- Identity ambiguity visible
- Bridge session visible
- Tests pass clean

---

## STOP CONDITIONS

STOP if:

- Any write path is introduced
- Any provider call is triggered
- Any ambiguity is auto-resolved

---

## COMPLETION SIGNAL

Slice 15 is complete when:

- Ops endpoints exist
- Tests pass
- No mutation paths exist
- PR merged to `codex/dev`
