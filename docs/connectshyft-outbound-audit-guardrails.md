# ConnectShyft Outbound Audit and Envelope Guardrails

This guardrail defines the outbound/governance traceability contract for ConnectShyft thread actions.

## Required Event Names

- `connectshyft.thread_reopened_by_user`
- `connectshyft.thread.outbound_call_dispatched`
- `connectshyft.thread.outbound_message_dispatched`

## Required Metadata Fields

Every outbound lifecycle audit/outbox payload must include:

- `tenant_id`
- `org_unit_id`
- `thread_id`
- `actor_user_id`
- `action`
- `prior_state`
- `new_state`

When outbound action reopens a closed thread, payload must also include:

- `thread_reopened_by_user`
- `lifecycle_lineage` with `prior_state`, `new_state`, and `thread_reopened_by_user`

## Refusal Envelope Contract

Business-policy or validation refusals must:

- Use canonical envelope shape (`ok=false`, `code`, `message`, `refusalType`, `correlationId`, `tenantId`)
- Use deterministic refusal codes/messages per route contract
- Avoid partial writes (domain mutation, `platform.events`, and `platform.outbox_events` all remain unchanged)

Client-validation refusals must:

- Use `refusalType='client'`
- Return 4xx status only when request shape is invalid

## Route-Level Drift Prevention

- Route handlers must use shared refusal responders instead of ad hoc refusal payload shape changes.
- Route handlers must use shared metadata builders for lifecycle and outbound event payloads.
- Route handlers must use `executePlatformMutation` for any outbound/governance mutation that requires durable audit/outbox writes.
