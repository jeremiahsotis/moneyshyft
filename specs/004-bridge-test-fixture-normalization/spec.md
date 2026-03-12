# Feature Specification: CS-004b Bridge Test Fixture Normalization

**Feature Branch**: `004-bridge-test-fixture-normalization`  
**Created**: 2026-03-12  
**Status**: Draft  
**Input**: `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/CS-004b_Bridge_Test_Fixture_Normalization_Guardrailed_Spec.md`  
**Source Input**: `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/CS-004b_Bridge_Test_Fixture_Normalization_Guardrailed_Spec.md`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Normalize Bridge Route and Module Fixtures (Priority: P1)

As a maintainer, I can read bridge-related route and module tests without seeing vendor-labeled fixture names that imply app-layer or bridge-layer provider coupling.

**Why this priority**: The CS-004 architecture verification already passed, so the remaining risk is misleading test data that contradicts the normalized provider boundary established by CS-003a.

**Independent Test**: Run the targeted bridge Jest suites and confirm the bridge route, bridge session, and provider-correlation tests still pass while their fixtures use provider-neutral names and normalized correlation shapes.

**Acceptance Scenarios**:

1. **Given** a bridge route or bridge-session test currently using vendor-labeled fixture identifiers, **When** the fixture data is normalized, **Then** the test asserts the same runtime behavior through provider-neutral names such as `providerLegId`, `providerMessageId`, and `providerEventId`.
2. **Given** bridge-adjacent provider-correlation tests, **When** provider identifiers are rewritten to neutral fixture values, **Then** the tests still prove the same uniqueness, replay-safety, and mapping behavior.

---

### User Story 2 - Preserve Allowed Provider-Native Translation Coverage (Priority: P2)

As a maintainer, I can keep provider-native payloads only in infrastructure translation and webhook-signature tests so bridge-domain and app-layer tests stay architecturally neutral.

**Why this priority**: CS-004b must clean up bridge-facing tests without overreaching into adapter translation tests where provider-native payloads are still the correct test surface.

**Independent Test**: Scan the updated bridge-related test files for vendor-labeled fields and confirm any remaining provider-native payloads live only in infrastructure translation or signature-verification tests.

**Acceptance Scenarios**:

1. **Given** a bridge-domain or app-layer test, **When** fixture cleanup is complete, **Then** it no longer depends on vendor-prefixed field names or vendor-labeled identifier values.
2. **Given** an infrastructure translation or signature-verification test, **When** the cleanup is complete, **Then** provider-native payloads may remain only where translation behavior is the explicit subject under test.

### Edge Cases

- Bridge tests that assert normalized provider failure classification may still carry a concrete `providerKey` value when the provider classification itself is the behavior under test.
- Infrastructure translation and signature helpers may retain provider-native headers or payload keys when they are explicitly testing adapter-edge behavior.
- No runtime behavior or production contract may change as a side effect of fixture renaming.
- Bridge route tests must prefer normalized camelCase correlation fields instead of legacy snake_case webhook fixture keys unless the test is explicitly about translation compatibility at the infrastructure edge.

## Scope Guardrails

In scope:
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/bridgeSessions.test.ts`
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts`
- `tests/support/helpers/connectShyftWebhookTestHelpers.ts` only if needed to document the allowed provider-native exception surface

Out of scope unless a direct import dependency forces a change:
- `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`
- story fixtures and factories under `tests/support/fixtures/` and `tests/support/factories/` for `F1`, `F2`, `F3`, `E4`, and `G6`
- runtime bridge, adapter, UI, schema, routing, or migration files

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Bridge-related route, module, and domain-adjacent tests MUST replace vendor-labeled fixture identifier values with provider-neutral values where provider choice is not the behavior under test.
- **FR-002**: Bridge and app-layer tests MUST prefer normalized correlation field names such as `providerLegId`, `providerMessageId`, `providerEventId`, and `providerNumber`.
- **FR-003**: Bridge-related tests MUST NOT reintroduce direct Telnyx module mocking.
- **FR-004**: Bridge-domain and app-layer tests MUST consume provider-neutral shapes only.
- **FR-005**: Provider-native headers or payloads MAY remain only in infrastructure translation or webhook-signature tests where translation behavior is the explicit subject under test.
- **FR-006**: Runtime production code MUST remain unchanged unless a minimal type-alignment adjustment is strictly required to keep tests compiling.
- **FR-007**: Bridge-related Jest suites and boundary enforcement MUST continue to pass after fixture normalization.
- **FR-008**: System MUST preserve lane boundaries and deployment compatibility by keeping `/api/v1/auth/*` and `/api/v1/platform/admin/*` delegated to `admin-api`, keeping all other lane `/api` routes lane-owned, and keeping shared-Postgres migration ownership with `admin-api`.

## Compatibility Acceptance Scenarios

1. **Given** CS-004b is implemented as test-only cleanup, **When** route ownership is reviewed, **Then** `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain delegated to `admin-api` and `/api/v1/connectshyft/*` remains lane-owned.
2. **Given** CS-004b changes no runtime deployment files, **When** deployment topology is reviewed, **Then** host Nginx routing, localhost-only API bindings, and static frontend serving remain unchanged.
3. **Given** CS-004b changes no schema or migration code, **When** database ownership is reviewed, **Then** shared Postgres compatibility remains intact and `admin-api` remains the sole production migration owner.

### Key Entities *(include if feature involves data)*

- **Normalized Bridge Route Fixture**: The request/response and resolver-mock data used by bridge route tests, carrying provider-neutral identifiers and normalized correlation fields.
- **Normalized Bridge Session Fixture**: The provider adapter return values and persisted-state expectations used by bridge session application tests.
- **Provider Correlation Fixture**: The provider identifier mapping data used in bridge-adjacent correlation tests, expressed with neutral provider and identifier names.
- **Provider Translation Exception Fixture**: The explicitly allowed provider-native payloads that remain in infrastructure translation or signature-verification tests only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Targeted bridge-related Jest suites pass with no runtime production file changes required beyond any minimal test-compilation type alignment.
- **SC-002**: A targeted repository scan finds no vendor-labeled fixture values or vendor-prefixed correlation keys in bridge-related app-layer or bridge-domain tests after cleanup.
- **SC-003**: `node scripts/enforce-workspace-boundaries.js` passes after the cleanup.
- **SC-004**: All touched source files for CS-004b are limited to tests, test-support assets, and planning documentation; no schema, UI, provider adapter, or bridge runtime behavior changes are introduced.
