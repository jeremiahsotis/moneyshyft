# Research: ConnectShyft Duplicate Phone Uniqueness Enforcement

No open clarification markers remained after loading the `023` spec, reviewing the current ConnectShyft neighbor store and resolver code, and tracing the repository's shared migration authority rules. The decisions below resolve the planning inputs needed for implementation.

## Decision 1: Route schema changes through shared migration authority and mirror them into the lane-local migration tree

- **Decision**: Create the schema change in `shared/database/migrations` and mirror it in `apps/connectshyft-api/src/migrations` through the existing re-export pattern used by recent ConnectShyft schema work.
- **Rationale**: The constitution and the repository's migration-authority convergence work already make `shared/database/migrations` the canonical production source while preserving lane-local mirrors for app-local tooling. Feature `023` changes storage rules, so it must follow that canonical path.
- **Alternatives considered**:
  - Add a lane-local-only migration under `apps/connectshyft-api/src/migrations`: rejected because production schema authority is already shared and lane-local-only schema work is out of policy.
  - Avoid schema work entirely: rejected because the user explicitly asked for a DB safety net in addition to service validation.

## Decision 2: A direct unique partial index on current phone rows is not sufficient while legacy duplicates remain, so the safety net needs a narrow grandfathering marker

- **Decision**: Add a narrow phone-row uniqueness eligibility marker and build the partial unique index only over enforced current rows, while grandfathering existing legacy duplicate rows so they remain stored and readable.
- **Rationale**: The feature must simultaneously block new duplicates and tolerate old duplicates until cleanup. A direct unique partial index over all current phone rows would fail as soon as legacy duplicates exist, and the uniqueness predicate cannot rely on a cross-table deleted-neighbor filter alone. A narrow grandfathering marker preserves the legacy data without choosing a merge winner and still allows a DB safety net for forward-enforced rows.
- **Alternatives considered**:
  - Create a direct unique partial index on `normalized_e164` for all active rows immediately: rejected because it conflicts with the requirement to tolerate existing duplicate rows.
  - Rely only on a non-unique lookup index: rejected because the user explicitly requested a DB safety net and the feature would remain vulnerable to concurrent writes if service validation regressed.

## Decision 3: Service-level duplicate preflight remains the authoritative write gate

- **Decision**: Keep a canonical duplicate-owner preflight check in the neighbor service/store and use the DB constraint only as a race-condition safety net.
- **Rationale**: The service can evaluate the full business rule in one place: canonical E.164 only, same-tenant scope, phone row active, neighbor not deleted, and self-retaining updates excluded. The grandfathered-index strategy deliberately leaves legacy duplicate rows outside the unique index, so service validation must remain the authoritative blocker for clean UX and complete rule coverage.
- **Alternatives considered**:
  - Depend on the DB safety net alone: rejected because it cannot produce the desired refusal shape early and cannot fully cover grandfathered legacy duplicates.
  - Put duplicate detection in the route only: rejected because write-time duplicate prevention belongs with neighbor persistence rules and must also protect non-route callers such as inbound-created neighbors.

## Decision 4: Standardize one duplicate refusal across create, update, and replacement writes

- **Decision**: Introduce a single business refusal with code `CONNECTSHYFT_PHONE_DUPLICATE` and refusal reason `duplicate_phone`, and use it across create, update, and any phone replacement path that would assign another neighbor's current phone.
- **Rationale**: The feature requires deterministic failure and a structured refusal. A single refusal code keeps create, update, and DB-race mapping aligned and allows route responses, tests, and future caller surfaces to handle one stable contract.
- **Alternatives considered**:
  - Reuse `CONNECTSHYFT_NEIGHBOR_CREATE_CONFLICT`: rejected because it is currently tied to generic create conflict semantics and does not distinguish duplicate phone ownership from ID conflicts.
  - Return different duplicate codes for create and update: rejected because the business rule is the same and split codes would add avoidable drift.

## Decision 5: Preserve the existing subject resolver contract and hard-fail ambiguity semantics

- **Decision**: Keep `resolveSubjectByContactPoint(...)` returning `single_match`, `no_match`, and `multiple_matches`, and preserve the current ambiguity behavior instead of introducing any fallback or winner-selection logic.
- **Rationale**: The resolver already provides the deterministic identity contract required by the feature. The gap is write-time prevention, not resolver taxonomy. Feature `023` must ensure that legacy duplicates continue to surface ambiguity explicitly.
- **Alternatives considered**:
  - Add fallback selection logic after `multiple_matches`: rejected because the spec explicitly forbids arbitrary selection and silent fallback.
  - Replace the resolver with a new duplicate-specific adapter: rejected because the current boundary already matches the approved deterministic outcomes.

## Decision 6: Exclude soft-deleted neighbors through existing lifecycle state, not through heuristic phone filtering

- **Decision**: Duplicate detection and identity resolution will continue to exclude soft-deleted neighbors by consulting `cs_neighbors.is_deleted` together with current phone rows.
- **Rationale**: The repository already has lifecycle state for neighbors, and the business rule is explicitly about active non-deleted neighbors. Filtering only on phone-row activity would be insufficient because deleted and inactive are different concepts.
- **Alternatives considered**:
  - Treat inactive phone rows as equivalent to deleted neighbors: rejected because it would mix lifecycle meaning and could hide valid current ownership state.
  - Ignore deleted-neighbor exclusion in write-time checks: rejected because the spec explicitly allows reuse for soft-deleted neighbors.

## Decision 7: Keep rollback isolated to the migration/index seam and the validation seam

- **Decision**: Preserve two primary rollback levers: revert the shared migration and partial unique index, and revert or disable the service/store duplicate preflight plus unique-violation mapping.
- **Rationale**: Those are the two runtime seams that actually change behavior. Keeping them isolated allows incident response without reopening unrelated identity-resolution or routing work.
- **Alternatives considered**:
  - Add a permanent runtime feature flag for duplicate prevention: rejected because the approved spec does not authorize a new long-lived toggle surface.
  - Treat resolver ambiguity as a rollback seam: rejected because ambiguity behavior already exists and should remain stable.
