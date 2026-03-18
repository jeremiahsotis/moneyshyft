# ConnectShyft Telnyx Outbound and Bridge Spec

## Best-practice recommendation

Keep the current provider-neutral adapter contract, but replace the current synthetic adapter behavior with real Telnyx outbound SMS and voice implementation backed by durable local records.

That gives you the right split:

- domain remains provider-neutral
- adapter becomes real
- route contracts stop lying about production readiness

## Current repo reality

The repo already has useful scaffolding:

- provider resolution and adapter registry
- bridge-only/manual-retry policy enforcement
- webhook signature validation support using `TELNYX_PUBLIC_KEY`
- provider correlation mapping
- outbound audit guardrails
- webhook replay/refusal handling patterns

What it does not have yet is real outbound dispatch.

The current adapter returns synthetic dispatch results rather than actually calling Telnyx.

## Required environment

Add and use:

- `TELNYX_API_KEY`
- `TELNYX_PUBLIC_KEY`
- `CONNECTSHYFT_WEBHOOK_SIGNATURE_MAX_AGE_SECONDS`
- `CONNECTSHYFT_ENABLED_PROVIDERS=telnyx`

Optional but recommended:

- `TELNYX_API_BASE_URL` defaulting to the standard Telnyx API base
- `TELNYX_CONNECTION_ID` if required by your account setup for voice/call control flows
- `TELNYX_APPLICATION_ID` or equivalent app/call-control identifier if your voice flow requires it

## SMS dispatch contract

## Route

`POST /api/v1/connectshyft/threads/:threadId/messages`

Required request fields:

- `body`
- `idempotencyKey`

Optional request fields:

- `targetPhone`
- `providerKey`

## Execution steps

1. resolve tenant, orgUnit, thread, and target neighbor phone
2. enforce messaging policy and texting preference policy
3. normalize optional target override if present
4. reserve idempotency record
5. create local outbound message record in `queued`
6. call Telnyx messages API with `TELNYX_API_KEY`
7. persist provider message ID and correlation mapping
8. persist canonical event, audit event, and outbox event
9. return dispatch result

## Voice dispatch contract

## Route

`POST /api/v1/connectshyft/threads/:threadId/call`

Required request fields:

- `idempotencyKey`

Optional request fields:

- `targetPhone`
- `operatorPhoneId`
- `providerKey`

Policy must remain locked to:

- `transport=bridge`
- `autoRetry=false`
- `redialPolicy=manual_only`

## Durable state model

## Table: `connectshyft.cs_call_sessions`

Recommended columns:

- `id UUID PRIMARY KEY`
- `tenant_id TEXT NOT NULL`
- `org_unit_id TEXT NOT NULL`
- `thread_id UUID NOT NULL`
- `neighbor_id UUID NULL`
- `operator_user_id UUID NOT NULL`
- `operator_user_phone_id UUID NOT NULL`
- `from_number_e164 TEXT NOT NULL`
- `to_number_e164 TEXT NOT NULL`
- `provider_key TEXT NOT NULL DEFAULT 'telnyx'`
- `state TEXT NOT NULL`
- `operator_leg_id TEXT NULL`
- `neighbor_leg_id TEXT NULL`
- `bridge_id TEXT NULL`
- `hangup_cause TEXT NULL`
- `idempotency_key TEXT NOT NULL`
- `correlation_id TEXT NOT NULL`
- `reconciliation_required BOOLEAN NOT NULL DEFAULT FALSE`
- `created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Unique:

- `(tenant_id, idempotency_key)`

Recommended states:

- `initiated`
- `operator_dialing`
- `operator_answered`
- `neighbor_dialing`
- `neighbor_answered`
- `bridged`
- `completed`
- `failed`
- `canceled`

## Webhook-driven bridge flow

### Step 1: request accepted

Server creates the call session and resolves:

- verified operator callback number
- outbound ConnectShyft caller ID number
- target neighbor number

### Step 2: dial operator leg

Adapter calls Telnyx voice API to dial the operator callback number first.

Persist:

- local session `operator_dialing`
- provider operator leg mapping

### Step 3: operator answers

Telnyx webhook arrives.

Server:

- verifies signature
- resolves call session by provider leg mapping and metadata
- transitions session to `operator_answered`
- initiates neighbor leg creation through Telnyx
- persists neighbor leg mapping
- transitions to `neighbor_dialing`

### Step 4: neighbor answers

Telnyx webhook arrives.

Server:

- verifies signature
- resolves session
- transitions to `neighbor_answered`
- sends Telnyx call-control bridge command using operator and neighbor leg IDs
- transitions to `bridged`
- emits canonical connected event and audit trail

### Step 5: completion or hangup

Further webhooks:

- update ended legs
- set final session state to `completed`, `failed`, or `canceled`
- persist hangup cause and timestamps

## Idempotency rules

## Client requests

Every outbound SMS and voice request must carry an `idempotencyKey`.

If the key repeats with the same request hash:

- return prior response snapshot
- do not redispatch provider calls

If the key repeats with a different request hash:

- refuse with conflict

## Provider webhooks

Use provider event identity plus existing provider correlation mapping rules.

Duplicate webhook events must be acknowledged without applying state twice.

## Transition guards

Transitions must be monotonic.

Examples:

- `bridged` cannot go back to `operator_dialing`
- duplicate answer event after answered does nothing
- duplicate hangup on ended leg does nothing

## Error handling

### Pre-dispatch refusal

Examples:

- no verified operator callback number
- no valid target phone
- no outbound mapping number
- invalid texting policy override

Required behavior:

- no provider call made
- no fake success
- refusal envelope remains deterministic

### Provider dispatch failure

Required behavior:

- persist local failure state
- include provider refusal/failure classification
- return truthful failure

### Post-dispatch persistence degradation

This is the hard case.

If Telnyx accepted dispatch, but local audit or canonical persistence partially failed:

- return `ok=true`
- set `sideEffectsPersisted=false`
- include `postDispatchWarnings[]`
- mark local session or outbound message `reconciliation_required=true`

## Audit requirements

Persist enough to answer:

- who initiated the call or message
- which operator phone was used
- which ConnectShyft outbound number was used
- which neighbor number was targeted
- which provider IDs were returned
- whether the thread reopened because of outbound activity
- what final state the call or message reached

## Reconciliation worker

Required scans:

- provider-dispatched messages missing canonical event linkage
- call sessions stuck in `initiated` or `operator_dialing` beyond timeout
- bridged sessions missing completion after an abnormal interval
- provider leg mappings missing corresponding session linkage

## Naming cleanup required during this work

The repo still contains `twilio*` naming in number mapping surfaces and migrations.

This remediation must not deepen that debt.

Recommended approach:

- introduce provider-neutral read/write names now
- keep compatibility aliasing only where needed
- stop generating new Twilio-named code immediately

## Acceptance criteria

- outbound SMS makes a real Telnyx API call and persists provider message correlation
- outbound voice makes a real Telnyx operator-leg call first
- neighbor leg is not dialed until operator answers
- bridge command executes only after both legs are live
- duplicate request keys do not double-send
- duplicate webhooks do not double-transition
- audit and timeline truthfully reflect what happened

## Counterpoint

You could shortcut this by dispatching a single outbound call directly to the neighbor and hoping to add operator bridge logic later.

That would be a product and audit failure.

The operator-leg-first bridge flow is the actual requirement.
