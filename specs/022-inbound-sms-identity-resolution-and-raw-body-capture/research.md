# Research: ConnectShyft Inbound SMS Identity Resolution and Raw Body Capture

No open clarification markers remained after loading the `022` spec and tracing the active ConnectShyft webhook, neighbor, and identity-boundary paths. The decisions below resolve the planning inputs needed for implementation.

## Decision 1: Capture `rawBody` at the JSON parser boundary in both runtime and route tests

- **Decision**: Replace plain `express.json()` with `express.json({ verify })` in `apps/connectshyft-api/src/app.ts` and mirror the same behavior in `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.shared.ts`.
- **Rationale**: The current webhook route already passes `req.rawBody` into provider verification, but the main app and the integration test harness both discard the original bytes. Signature validation must use the exact received body rather than a reconstructed object.
- **Alternatives considered**:
  - Reconstruct the JSON string from `req.body`: rejected because JSON serialization order and whitespace can differ from the signed request.
  - Add route-local raw parsing only for the webhook path: rejected because the test harness would still diverge from runtime behavior and the route already expects `req.rawBody` on the shared request shape.

## Decision 2: Add a thin `resolveSubjectByContactPoint(...)` adapter over the existing async identity boundary

- **Decision**: Create `apps/connectshyft-api/src/modules/connectshyft/identityResolver.ts` with a replaceable interface `resolveSubjectByContactPoint({ tenantId, orgUnitId, contactPoint })`; the first implementation delegates to the async identity boundary and uses phone matching only.
- **Rationale**: The repository already has tenant-scoped exact phone matching in `identityBoundary.ts`. Wrapping it behind a new resolver interface provides the approved PeopleCore-compatible boundary without inventing a new identity engine.
- **Alternatives considered**:
  - Call `connectShyftNeighborServiceAsync.evaluateIdentityMatch(...)` directly from the webhook route: rejected because the spec requires a replaceable subject-resolution boundary and forbids route-owned DB logic.
  - Add phone matching directly inside the route: rejected because it would duplicate normalization and hard-code a local identity strategy into the webhook handler.

## Decision 3: Map identity-boundary outcomes by unique neighbor count, not auto-merge eligibility

- **Decision**: Treat both `CONNECTSHYFT_IDENTITY_MATCH_AUTO_MERGE_ALLOWED` and single-neighbor `CONNECTSHYFT_IDENTITY_MATCH_NO_AUTO_MERGE` outcomes as `single_match`; treat `CONNECTSHYFT_IDENTITY_MATCH_NO_MATCH` as `no_match`; treat `IDENTITY_MATCH_AMBIGUOUS` as `multiple_matches`.
- **Rationale**: The inbound SMS feature needs deterministic identity resolution, not merge authorization. The approved business rule is `1 match -> use neighbor`, `0 matches -> create new neighbor`, `>1 matches -> fail`.
- **Alternatives considered**:
  - Treat `NO_AUTO_MERGE` as `no_match`: rejected because a unique exact phone match would then create unnecessary duplicate neighbors and violate the approved match-count rule.
  - Expose identity-boundary auto-merge reasons directly to the webhook route: rejected because the new subject-resolution boundary should collapse local adapter detail into the stable single/no/multiple contract.

## Decision 4: Keep the route-owned resolution order, but move all mutations behind neighbor service methods

- **Decision**: The webhook route remains the owner of the resolution chain order, but it calls new neighbor service methods for inbound-specific create and texting-preference mutation rather than writing through stores directly.
- **Rationale**: The route already owns payload metadata, thread correlation, signature verification, and provider refusal shaping. The neighbor service already owns phone normalization and persistence behavior. Keeping order in the route and mutations in the service preserves both boundaries.
- **Alternatives considered**:
  - Move the entire resolution chain into `neighbors.ts`: rejected because the route still needs to combine webhook metadata, thread correlation, and provider refusal semantics before phone resolution begins.
  - Keep using the generic `createNeighbor(...)` and `updateNeighbor(...)` methods from the route: rejected because the generic create path defaults `prefersTexting` to `YES`, which would violate the inbound-create requirement.

## Decision 5: Use inbound-specific neighbor methods to protect texting preference semantics

- **Decision**: Add `createNeighborFromInbound(...)` and `applyInboundSmsTextingPreference(...)` to `neighbors.ts`.
- **Rationale**: Inbound-created neighbors must start with `prefersTexting: 'UNKNOWN'`, and accepted inbound SMS must only promote `UNKNOWN -> YES`. Existing generic create/update behavior cannot enforce both rules cleanly.
- **Alternatives considered**:
  - Reuse generic create with an explicit `UNKNOWN` override and reuse generic update from the route: rejected because it would leave route code responsible for phone-shape construction, policy drift, and accidental `YES` or `NO` overrides.
  - Set new inbound-created neighbors directly to `YES`: rejected because the approved spec requires `UNKNOWN` at creation time and a separate post-resolution promotion step.

## Decision 6: Reuse the existing communication audit log for inbound-created neighbor audit records

- **Decision**: Record inbound-created neighbor audit entries through `appendConnectShyftCommunicationAuditEntry(...)`.
- **Rationale**: The audit-log module already provides a stable persistence surface for ConnectShyft business events and supports in-memory operation during tests. This avoids inventing a new audit table or route-local audit implementation.
- **Alternatives considered**:
  - Add a new neighbor-specific audit table: rejected because it expands schema and ownership without need.
  - Skip audit persistence and rely only on the webhook receipt: rejected because the spec explicitly requires a neighbor-creation audit record.

## Decision 7: Preserve `IDENTITY_MATCH_AMBIGUOUS` as the hard-fail code for multiple phone matches

- **Decision**: Reuse `IDENTITY_MATCH_AMBIGUOUS` when phone subject resolution finds multiple active matches and refuse before any new-neighbor creation.
- **Rationale**: The codebase already treats ambiguity as a first-class business refusal in both module and route tests. Reusing that refusal avoids introducing a redundant webhook-specific ambiguity taxonomy.
- **Alternatives considered**:
  - Introduce a new inbound-webhook ambiguity code: rejected because it would duplicate existing semantics and widen the refusal surface without added business value.
  - Choose one of the matched neighbors deterministically: rejected because the approved spec forbids heuristic guessing and silent fallbacks.

## Decision 8: Treat deleted-neighbor exclusion as lifecycle-aware resolution, and surface a minimal lifecycle marker if production data lacks one

- **Decision**: Subject resolution and explicit neighbor reuse must exclude soft-deleted neighbors. If the active ConnectShyft neighbor persistence layer does not already expose lifecycle state, add the smallest shared-schema lifecycle marker needed to identify soft-deleted neighbors and keep them ineligible for reuse.
- **Rationale**: The approved spec requires `DO NOT resurrect`, `DO NOT fail`, `CREATE NEW neighbor` when a match points only to deleted records. The current `cs_neighbors` migration does not expose a delete marker, so a deterministic implementation needs lifecycle state somewhere explicit.
- **Alternatives considered**:
  - Ignore the deleted-neighbor rule until delete tooling exists: rejected because it would leave an approved business requirement unimplemented.
  - Infer deletion from phone inactivity alone: rejected because inactive phones and deleted neighbors are different concepts and would create silent heuristic behavior.

## Decision 9: Keep rollback isolated to three reversible seams, not new feature flags

- **Decision**: Preserve three clean rollback seams in the implementation plan: the JSON parser verify hook, the subject-resolver insertion in the webhook route, and the replacement of the old `neighbor_unresolved` branch.
- **Rationale**: The user already identified those as the operational rollback levers. Keeping them isolated reduces incident response complexity without introducing new long-lived toggle architecture.
- **Alternatives considered**:
  - Add a permanent configuration flag for phone resolution: rejected because the approved spec does not authorize a new runtime toggle surface.
  - Roll back the full feature in one revert only: rejected because raw-body capture and identity resolution have different risk profiles and should remain independently reversible during an incident.
