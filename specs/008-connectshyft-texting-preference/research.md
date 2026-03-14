# Phase 0 Research

## Decision 1: Default new neighbors to `YES` in the runtime write path instead of adding a schema migration in this feature

**Decision**: Update the current create flow in `apps/moneyshyft-api/src/modules/connectshyft/neighbors.ts` so the runtime explicitly writes `YES` when no valid preference is provided.

**Rationale**: The bug exists in the current runtime host, and the minimal surgical fix is to make the runtime write the correct canonical value without expanding migration-authority scope. The existing database constraint already allows `YES`, `NO`, and `UNKNOWN`, so no schema shape change is required for this feature.

**Alternatives considered**:
- Alter the column default in a new migration: more invasive and not required to fix the runtime bug.
- Edit the existing migration file: unsafe for already-applied migrations.
- Backfill historical `UNKNOWN` rows to `YES`: rejected because prior intent is ambiguous.

## Decision 2: Extend the existing create/update DTOs and route parsers instead of introducing a new serializer layer

**Decision**: Add `prefersTexting` to the existing frontend input types, API body parsers, and backend command/store inputs, using the current route and service surfaces.

**Rationale**: The current bug is caused by dropped request fields and a hardcoded `UNKNOWN` write. The existing response mapping already carries the stored enum correctly once persistence is fixed. Reusing current DTOs keeps the change bounded to the affected lane surfaces.

**Alternatives considered**:
- Introduce a new ConnectShyft neighbor serializer module: unnecessary indirection for a single-field fix.
- Move logic into `apps/connectshyft-api`: explicitly prohibited by the runtime-host contract.

## Decision 3: Keep API responses canonical and tolerate `prefers_texting` as an input/output compatibility alias only where already needed

**Decision**: The canonical API/UI field remains `prefersTexting`, while frontend parsing continues to tolerate `prefers_texting` and route parsing may accept `prefers_texting` as a compatibility alias.

**Rationale**: Current consumers already parse both shapes. Preserving that tolerance avoids accidental breakage while keeping the canonical field stable and aligned with the contract.

**Alternatives considered**:
- Require camelCase only everywhere immediately: higher regression risk for little gain.
- Standardize on snake_case in frontend state: inconsistent with existing UI code.

## Decision 4: Treat invalid incoming preference values as omission in the current runtime surface

**Decision**: Non-canonical incoming preference values are treated as omitted at the current route/runtime boundary.
Create behavior therefore defaults to `YES`, while update behavior preserves the existing stored canonical value.

**Rationale**: This preserves the minimal surgical fix already designed in the current runtime host, avoids introducing a larger validation/refusal path for this feature, and keeps `UNKNOWN` fallback limited to truly absent or invalid stored data.

**Alternatives considered**:
- Reject invalid incoming values with a new business/client error: more explicit, but larger in surface area than required for this fix.
- Coerce invalid incoming values directly to `UNKNOWN`: rejected because it would violate the canonical preference contract.

## Decision 5: Fix the current UI display at the shared presentation function

**Decision**: Update `resolveConnectShyftPreferenceChip()` in `apps/connectshyft-web/src/features/connectshyft/presentation.ts` to emit exact contract strings.

**Rationale**: The snapshot component used by inbox and thread detail already delegates label rendering to this single function. One change updates the current display surfaces consistently.

**Alternatives considered**:
- Change strings separately in each view or component: duplicates logic and risks drift.
- Leave current lowercase labels in place: violates the governing UI label contract.

## Decision 6: Cover persistence with backend tests and UI behavior with manual verification

**Decision**: Add Jest module tests in `neighbors.test.ts`, add Supertest route coverage under `apps/moneyshyft-api/src/routes/api/v1/__tests__`, and rely on manual verification for `apps/connectshyft-web`.

**Rationale**: The repository already has backend unit and route harnesses, but no established frontend test runner. This provides strong automated coverage for the failure point without adding new test infrastructure.

**Alternatives considered**:
- Introduce a new frontend test runner: out of scope for a minimal patch.
- Rely on manual testing only: insufficient for a persistence regression.
