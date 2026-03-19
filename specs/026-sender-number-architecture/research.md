# Research: Sender Number Architecture

No open clarification markers remained after loading the `026` spec, reviewing the current ConnectShyft route flow, and tracing the number-mapping, thread-persistence, and voice seams. The decisions below resolve the remaining design choices needed for implementation.

## Decision 1: Introduce a ConnectShyft-lane `senderNumberResolver.ts` module

- **Decision**: Add `apps/connectshyft-api/src/modules/connectshyft/senderNumberResolver.ts` and make `resolveSenderNumber({ tenantId, orgUnitId, threadId, channel })` the only approved sender-selection entrypoint.
- **Rationale**: Outbound SMS, inbound alignment, and the partial voice flow all need the same deterministic sender decision. A lane-local module is broad enough to be shared inside ConnectShyft but narrow enough to avoid inventing a new cross-lane architecture.
- **Alternatives considered**:
  - Keep sender resolution route-local in `connectshyft.ts`: rejected because both inbound and voice paths need the same policy.
  - Move sender resolution into shared telephony or provider modules: rejected because sender ownership must be settled before provider dispatch and is ConnectShyft-domain specific.

## Decision 2: Persist thread sender alignment in the existing thread number fields using normalized provider numbers

- **Decision**: Reuse `lastInboundCsNumberId` and `preferredOutboundCsNumberId` as the current durable storage seam for sender alignment, but store normalized provider-number values instead of synthetic `sms-inbound:*`, `sms-outbound:*`, or `cs-number-*` tokens.
- **Rationale**: The feature requires same-thread stability without adding new schema, and the existing `connectshyft.cs_threads` columns are already updated on inbound or lifecycle flows. Persisting the real provider number gives the resolver a durable per-thread anchor.
- **Alternatives considered**:
  - Add a new thread-to-mapping join table: rejected because the slice does not authorize new schema or migration work.
  - Store mapping IDs only: rejected because the mandated lookup is `resolveRoutingMappingByNumber(...)`, which validates by provider number.
  - Keep synthetic identifiers and translate them later: rejected because the spec explicitly forbids synthetic sender identifiers.

## Decision 3: Use `resolveRoutingMappingByNumber(...)` as the authoritative validator for every sender decision

- **Decision**: The resolver reads the thread’s aligned provider number, then validates it with `connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber({ tenantId, twilioNumberE164 })`.
- **Rationale**: The user explicitly requires this service to be the source of truth, and it already returns deterministic `found`, `not-found`, or `ambiguous` outcomes plus the mapping metadata needed by the new resolver contract.
- **Alternatives considered**:
  - Continue choosing outbound senders from `listMappings(...)` when an org unit has a single active number: rejected because that bypasses the required centralized contract and does not prove thread alignment.
  - Resolve by read-contract labels or thread metadata: rejected because labels are descriptive text, not authoritative routing keys.

## Decision 4: Inbound number-mapping fallback resolves sender scope, not a synthetic thread ID

- **Decision**: Remove the current synthetic thread derivation from inbound number-mapping fallback and let number mapping resolve tenant or org-unit scope only; the existing neighbor or thread ensure flow remains responsible for selecting or creating the real thread.
- **Rationale**: The current `resolveDeterministicThreadIdForNumberMapping(...)` path fabricates thread identity from provider number data, which violates the new no-synthetic rule. Inbound SMS already has an ensured-thread path after neighbor resolution, so thread selection can remain there.
- **Alternatives considered**:
  - Keep deterministic thread generation from provider number as a “safe” fallback: rejected because it still invents thread identity from routing data rather than real thread ownership.
  - Refuse every inbound webhook unless provider identifiers already resolve a thread: rejected because inbound neighbor or thread ensure behavior is already part of the approved operational flow.

## Decision 5: Partial voice work reuses the same sender resolver but does not widen into provisioning or contact-point redesign

- **Decision**: Any voice flow that needs an outbound ConnectShyft sender line will call `resolveSenderNumber(..., channel: 'voice')`; unresolved sender numbers refuse deterministically.
- **Rationale**: The feature explicitly includes partial voice support, but provisioning, pooling, and broader bridge redesign remain out of scope. Reusing the same resolver keeps voice consistent with SMS without widening the slice.
- **Alternatives considered**:
  - Leave voice on raw thread fields or bridge fallback behavior: rejected because it would create a second sender-selection path.
  - Fully redesign voice contact-point ownership: rejected because it exceeds the approved scope.

## Decision 6: Update read-contract and seeded-thread semantics as part of the slice

- **Decision**: Replace seeded or read-model values that currently assume synthetic `cs-number-*` sender identifiers when those fields represent thread sender alignment.
- **Rationale**: The resolver cannot validate synthetic tokens through `resolveRoutingMappingByNumber(...)`, and the plan must keep tests and read-model hints honest after alignment semantics change.
- **Alternatives considered**:
  - Leave seeded read data untouched and special-case it in the resolver: rejected because it would keep synthetic semantics alive inside the new design.
  - Rewrite read contracts to use brand-new field names now: rejected because that would widen the contract surface beyond this slice.

## Decision 7: Rollback is code reversion, not a steady-state synthetic fallback path

- **Decision**: The forward design will not ship a normal-path “temporary synthetic fallback” escape hatch. Emergency rollback should happen by reverting the feature as a unit or by using an explicit time-bound operational exception outside the steady-state contract.
- **Rationale**: The approved spec requires deterministic refusal and explicitly forbids synthetic identifiers and fallback sender assignment. Keeping a dormant synthetic fallback inside the normal design would undermine the architecture immediately.
- **Alternatives considered**:
  - Re-enable synthetic fallback temporarily as part of the normal rollback plan: rejected because it violates the feature requirements and would mask the very errors this slice is intended to expose.
  - Ignore rollback planning entirely: rejected because the slice still needs an operationally safe reversal path.

## Decision 8: Extend existing ConnectShyft backend tests rather than introducing new harnesses

- **Decision**: Add coverage to the existing thread, read-contract, outbound dispatch, inbound webhook, bridge, and voice suites already closest to the affected behavior.
- **Rationale**: These tests already own the impacted flows and fixtures. The change is backend-only and does not require frontend or new end-to-end harness work.
- **Alternatives considered**:
  - Add frontend or browser automation coverage: rejected because the request contract is unchanged and the feature is domain-routing focused.
  - Depend on manual verification only: rejected because the spec requires stable same-thread sender behavior and deterministic refusal coverage.
