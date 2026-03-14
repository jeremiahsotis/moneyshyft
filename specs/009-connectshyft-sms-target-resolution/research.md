# Phase 0 Research

## Decision 1: Keep deterministic SMS target resolution in the current outbound route layer instead of pushing it into provider adapters

**Decision**: Resolve target phones and classify pre-provider failures inside `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts` before `dispatchOutboundMessage()` is called.

**Rationale**: The current provider registry is intentionally provider-neutral and only receives the already-selected `targetPhone`. The governing contracts explicitly reject provider-adapter redesign, and pre-provider business refusals must not collapse into generic dispatch failure.

**Alternatives considered**:
- Push target resolution into `providerRegistry.ts`: rejected because it hides business refusals behind the adapter boundary and redesigns the adapter contract.
- Move resolution into a new lane-shared module outside the current host: rejected because the runtime-host contract requires a surgical fix inside `apps/moneyshyft-api`.

## Decision 2: Treat the existing explicit outbound target request fields as the current runtime host's explicit SMS target source

**Decision**: The first resolution step uses the explicit outbound target fields already parsed by `parseOutboundMessagePolicyRequest()` (`targetPhone`, `targetPhoneE164`, `recipientPhone`, `target.phone`) and treats that value as the explicit thread SMS target for the current dispatch.

**Rationale**: The current runtime host has no persisted thread-level SMS target field in `connectshyft.cs_threads`, and this feature must remain surgical. Using the existing explicit outbound target input satisfies the precedence rule without expanding persistence scope or redesigning thread storage.

**Alternatives considered**:
- Add a new persisted `sms_target_phone_e164` field to `cs_threads`: rejected for this feature because it expands storage scope and migration surface beyond the minimal runtime-host patch.
- Infer explicit target from historical outbound event metadata only: rejected because it adds a more complex lookup path than required to fix the current failure mode.

## Decision 3: Define neighbor phone determinism from the current schema, not from missing future-state fields

**Decision**: In the current host, candidate neighbor phones are read from `connectshyft.cs_neighbor_phones`, where "active" means the row exists in scope and "valid" means a non-empty canonical E.164 value is present. Deterministic selection follows this order: one explicit target, else one primary candidate, else one total candidate, else refusal.

**Rationale**: The current neighbor phone schema has `value_e164`, `sort_order`, `is_primary`, `is_shared`, and `verification_status`, but no `is_active` flag. The design must reflect current runtime reality rather than invent new storage semantics.

**Alternatives considered**:
- Introduce a new active/inactive concept for this feature: rejected because it requires schema and write-path expansion outside the bug fix.
- Require `verification_status = verified` to dispatch: rejected because the feature spec only requires deterministic target resolution, not verification gating.

## Decision 4: Require `prefers_texting = YES` for outbound SMS dispatch and stop using override-based send permission for this path

**Decision**: Outbound SMS target resolution must read the canonical neighbor `prefers_texting` value and refuse dispatch unless it is exactly `YES`.

**Rationale**: The governing architecture and feature spec require `prefers_texting = YES`. The existing override service currently allows `NO` with an override reason, but that behavior conflicts with this feature's contract for deterministic refusal before provider dispatch.

**Alternatives considered**:
- Keep the current override-required behavior for `NO`: rejected because it violates the feature requirement that SMS send is allowed only when `prefers_texting = YES`.
- Treat `UNKNOWN` as allowed with warning: rejected because the contract requires an explicit refusal when texting permission is not allowed.

## Decision 5: Preserve thread source fidelity by carrying real communication method through read-contract reconstruction

**Decision**: The outbound runtime should stop hard-coding reconstructed thread state to `source: 'VOICE'` and instead use the actual communication method for the outbound action (`SMS` for thread-message sends, `VOICE` for thread-call sends), while also extending read-contract access to propagate stored `cs_threads.source` where available.

**Rationale**: `connectshyft.cs_threads` already stores `source`, and `ensureThread()` already persists it. The current hard-coded `VOICE` values in `buildSyntheticThread()` and `buildThreadFromDetailRecord()` erase existing fidelity and conflict with the requested runtime behavior.

**Alternatives considered**:
- Leave the hard-coded `VOICE` default in place: rejected because it produces incorrect thread state in outbound responses.
- Derive all source values exclusively from the stored DB record: rejected because synthetic and fallback threads still need a deterministic action-derived source when the detail contract does not carry it yet.

## Decision 6: Add explicit refusal contracts for pre-provider SMS failures in the route response envelope

**Decision**: Introduce explicit business refusals for no target phone available, multiple valid target phones, and texting not permitted, and return them directly from `performOutboundAction()`.

**Rationale**: The route already owns business refusal formatting through `respondConnectShyftBusinessRefusal()`. Reusing that mechanism keeps refusals actionable and prevents them from reaching the generic `CONNECTSHYFT_PROVIDER_DISPATCH_FAILED` fallback.

**Alternatives considered**:
- Throw generic provider dispatch errors and inspect them later: rejected because the failure is known before provider dispatch.
- Encode refusal state only in `data` while keeping `CONNECTSHYFT_PROVIDER_DISPATCH_FAILED`: rejected because the governing requirements explicitly prohibit collapsing known failures into a generic dispatch code.

## Decision 7: Cover the change with route-level tests plus read-contract/source-fidelity tests

**Decision**: Add Supertest route coverage for `/api/v1/connectshyft/threads/:threadId/messages` and focused module tests around read-contract/source behavior, rather than introducing new infrastructure.

**Rationale**: The failure occurs at the route orchestration boundary, and the repo already contains route and module test harnesses that can validate dispatch/refusal behavior without adding new tooling.

**Alternatives considered**:
- Rely on provider-registry unit tests only: rejected because the registry is intentionally downstream of the new business logic.
- Add frontend or end-to-end browser coverage as part of planning: rejected because this feature is runtime-host only and no UI changes are required to validate the dispatch rules.
