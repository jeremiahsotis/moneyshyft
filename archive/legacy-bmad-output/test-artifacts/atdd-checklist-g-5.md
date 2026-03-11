---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-03-07'
---

## Step 1 - Preflight & Context Loading

### Story Resolution

- story_file: `_bmad-output/implementation-artifacts/g-5-more-settings-volunteer-ia-and-admin-separation.md`
- story_id: `g-5`
- story_title: `More/Settings Volunteer IA and Admin Separation`
- story_status: `ready-for-dev`

### Prerequisites

- Story approval and acceptance criteria: PASS (4 explicit acceptance criteria present)
- Test framework configured: PASS (`playwright.config.ts` present)
- Development environment available: PASS (policy/workflow guard commands executed successfully)

### Mandatory Git Policy Gate

- `npm run policy:check` initial result on `codex/dev`: FAIL (protected default branch)
- Auto-remediation applied:
  - `npm run start:story-branch -- --lane connectshyft g-5 g-5-more-settings-volunteer-ia-and-admin-separation`
  - created branch: `codex/story-g-5-connectshyft-g-5-more-settings-volunteer-ia-and-admin-separation`
- `npm run policy:check` after remediation: PASS
- `npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/g-5-more-settings-volunteer-ia-and-admin-separation.md`: PASS

### Story Context Extracted

- Primary user role: volunteer
- Core outcome: volunteer-first More/Settings IA with admin controls separated and role-gated
- Key admin paths to protect:
  - `/app/connectshyft/settings/availability`
  - `/app/connectshyft/settings/numbers`
  - `/app/connectshyft/settings/escalation`
- Major acceptance dimensions:
  - volunteer IA composition
  - role/capability gating and refusal guidance
  - nav consistency under role/scope changes
  - responsive stability (mobile/tablet/desktop)

### Framework and Existing Pattern Scan

- Framework: Playwright (`playwright.config.ts`, `tests/` root)
- Existing ConnectShyft ATDD patterns reviewed:
  - `tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.atdd.spec.ts`
  - `tests/api/platform/g-4-add-neighbor-and-directory-rebuild.atdd.api.spec.ts`
  - `tests/e2e/platform/a-5-capability-based-route-access-and-envelope-contract-compliance.atdd.spec.ts`
  - `tests/api/platform/a-5-capability-based-route-access-and-envelope-contract-compliance.atdd.api.spec.ts`
  - `tests/support/factories/connectShyftStoryG4Factory.ts`
  - `tests/support/fixtures/connectShyftStoryG4.fixture.ts`
  - `tests/support/helpers/connectShyftStoryG4TestHelpers.ts`

### TEA Config Flags

- `tea_use_playwright_utils`: `true`
- `tea_browser_automation`: `auto`
- `test_framework`: `playwright`

### Knowledge Fragments Loaded

Core:
- `data-factories.md`
- `component-tdd.md`
- `test-quality.md`
- `test-healing-patterns.md`
- `selector-resilience.md`
- `timing-debugging.md`

Playwright Utils:
- `overview.md`
- `api-request.md`
- `network-recorder.md`
- `auth-session.md`
- `intercept-network-call.md`
- `recurse.md`
- `log.md`
- `file-utils.md`
- `network-error-monitor.md`
- `fixtures-composition.md`

Playwright CLI:
- `playwright-cli.md`

### Input Confirmation

All mandatory ATDD inputs for story `g-5` are loaded and validated. Proceeding to generation mode.

## Step 2 - Generation Mode Selection

### Mode Decision

- Chosen mode: `AI generation`
- Reason:
  - acceptance criteria are explicit and testable
  - scenario set is standard for ATDD decomposition (navigation IA, role gating, refusal behavior, responsive assertions)
  - repository already contains strong ConnectShyft ATDD patterns for API + E2E without requiring live recording first

### Recording Mode Evaluation

- `tea_browser_automation` is `auto`, so recording is available if needed
- Recording deferred for now; can be invoked later if selector uncertainty appears during implementation

### Step Outcome

Generation mode confirmed. Proceeding to test strategy.

## Step 3 - Test Strategy

### Acceptance Criteria to Scenario Map

1. AC1 Volunteer-first IA options
- Scenario S1 (positive): volunteer More/Settings shows `Directory`, volunteer `Settings`, notification/display preferences, `Sign Out`
- Scenario S2 (negative): volunteer More/Settings excludes admin configuration controls from primary IA surface

2. AC2 Admin controls role-gated and separated
- Scenario S3 (negative): volunteer user cannot see or invoke availability/number-mapping/escalation admin actions in primary IA
- Scenario S4 (positive): authorized admin can reach explicit admin paths outside volunteer-primary IA

3. AC3 Role/scope refresh and refusal guidance
- Scenario S5 (negative): unauthorized deep-link to admin settings route returns refusal guidance and withholds privileged controls
- Scenario S6 (state transition): role/scope context update refreshes nav and access outcomes consistently

4. AC4 Responsive stability
- Scenario S7 (responsive): mobile/tablet/desktop keep volunteer IA clear and stable without mixed admin clutter

### Selected Test Levels

- E2E tests (primary):
  - S1, S2, S3, S4, S6, S7
  - Rationale: IA composition, route rendering, nav-state behavior, and responsive presentation are user-journey concerns

- API tests:
  - S3, S4, S5, S6
  - Rationale: role/capability gating and refusal envelopes are contract-level behaviors that should be asserted at service boundary

- Component tests:
  - Not selected for this ATDD output (`0`) because no dedicated component-test runner baseline exists in this repo; coverage remains in API + E2E layers to avoid introducing non-standard test infrastructure in red phase

### Priority Assignment (P0-P3)

- P0:
  - S1 volunteer IA contract
  - S3 volunteer admin-control exclusion
  - S5 unauthorized deep-link refusal contract
  - S6 role/scope refresh consistency

- P1:
  - S4 authorized admin explicit-path access
  - S7 responsive IA stability across breakpoints

- P2/P3:
  - None in initial red-phase set

### Red Phase Requirements

- All generated tests are expected to fail before implementation because they assert:
  - new/updated IA testids and labels not yet guaranteed in current UI
  - explicit volunteer/admin path separation behavior not yet fully enforced
  - refusal guidance contract consistency for unauthorized admin path access
  - responsive IA markers for layout clarity across breakpoints

- Failure intent:
  - failures must point to missing implementation, not broken test harness
  - deterministic setup and explicit assertions to keep failures actionable

## Step 4 - Parallel Failing Test Generation (RED)

### Subprocess Orchestration

- Timestamp for subprocess artifacts: `2026-03-07T12-59-43-959Z`
- Subprocess A (API RED): `/tmp/tea-atdd-api-tests-2026-03-07T12-59-43-959Z.json`
- Subprocess B (E2E RED): `/tmp/tea-atdd-e2e-tests-2026-03-07T12-59-43-959Z.json`
- Execution mode: parallel (API + E2E)

### TDD Red-Phase Status

- API tests generated with `test.skip()`: PASS
- E2E tests generated with `test.skip()`: PASS
- Expected behavior assertions present (no placeholder assertions): PASS
- `expected_to_fail=true` flags present: PASS

### Performance Note

- Parallel generation completed both suites in a single orchestration cycle
- Equivalent sequential path would require running both generation lanes one after another

## Step 4C - Aggregation and File Generation

### Generated Test Files

- `tests/api/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.api.spec.ts`
- `tests/e2e/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.spec.ts`

### Generated Fixture Infrastructure

- `tests/support/factories/connectShyftStoryG5Factory.ts`
- `tests/support/fixtures/connectShyftStoryG5.fixture.ts`

### RED-Phase Summary

- Total generated tests: `10`
  - API: `5`
  - E2E: `5`
- All tests use `test.skip()`: `true`
- All tests marked expected-to-fail: `true`
- Aggregated summary artifact:
  - `/tmp/tea-atdd-summary-2026-03-07T12-59-43-959Z.json`

### Acceptance Criteria Coverage (Aggregated)

- Volunteer More/Settings shows volunteer-facing options
- Admin controls are role-gated outside volunteer IA
- Role/scope refresh re-evaluates pathway access with refusal guidance
- Volunteer IA options in More/Settings are volunteer-focused
- Admin settings are separated and role-gated
- Denied routes show refusal-style guidance
- Responsive IA remains stable across breakpoints

### Knowledge Fragments Applied During Generation

- `api-request`
- `data-factories`
- `api-testing-patterns`
- `fixture-architecture`
- `network-first`
- `selector-resilience`

## ATDD Checklist - Epic g, Story 5: More/Settings Volunteer IA and Admin Separation

**Date:** 2026-03-07
**Author:** Jeremiah
**Primary Test Level:** E2E (with API contract coverage)

---

## Story Summary

This story enforces volunteer-first information architecture in ConnectShyft More/Settings while separating admin configuration into explicit admin routes. The generated RED-phase suite captures role-gating, refusal guidance, route-context refresh behavior, and responsive stability.

**As a** volunteer  
**I want** More/Settings to focus on volunteer tools  
**So that** operational/admin configuration does not distract from communication work

---

## Acceptance Criteria

1. Given volunteer users open More/Settings, when IA options are rendered, then primary options are volunteer-facing (`Directory`, `Settings`, notification/display preferences, `Sign Out`).
2. Given admin controls exist (availability, number mappings, escalation configuration), when volunteer users browse More/Settings, then admin controls are role-gated or routed to explicit admin paths outside primary volunteer IA.
3. Given role and scope context changes, when navigation state is refreshed, then admin pathways are consistently shown only to authorized roles and denied paths return refusal-style guidance.
4. Given mobile/tablet/desktop breakpoints are used, when More/Settings surfaces render, then volunteer-first IA remains clear and stable without mixed admin clutter.

---

## Failing Tests Created (RED Phase)

### E2E Tests (5 tests)

**File:** `tests/e2e/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.spec.ts` (130 lines)

- ✅ **Test:** `[G5-ATDD-E2E-001][P0] volunteer More/Settings shows volunteer-first IA options and excludes admin controls`
  - **Status:** RED (intentionally skipped for pre-implementation phase)
  - **Verifies:** Volunteer IA composition and absence of admin controls in volunteer surface
- ✅ **Test:** `[G5-ATDD-E2E-002][P0] volunteer deep-link to admin settings path returns refusal guidance and withholds privileged controls`
  - **Status:** RED (intentionally skipped)
  - **Verifies:** Denial UX on unauthorized admin route access
- ✅ **Test:** `[G5-ATDD-E2E-003][P1] authorized admin deep-link to explicit admin settings path resolves with admin nav state and controls`
  - **Status:** RED (intentionally skipped)
  - **Verifies:** Admin explicit-path success behavior and nav-state contract
- ✅ **Test:** `[G5-ATDD-E2E-004][P0] role and scope context refresh updates pathway visibility and refuses admin settings access after downgrade`
  - **Status:** RED (intentionally skipped)
  - **Verifies:** Dynamic access reevaluation after actor-context change
- ✅ **Test:** `[G5-ATDD-E2E-005][P1] volunteer-first More/Settings IA remains clear and stable across mobile tablet and desktop breakpoints`
  - **Status:** RED (intentionally skipped)
  - **Verifies:** Responsive IA stability and no admin clutter across breakpoints

### API Tests (5 tests)

**File:** `tests/api/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.api.spec.ts` (165 lines)

- ✅ **Test:** `[G5-ATDD-API-001][P0] volunteer settings navigation profile resolves volunteer-first IA options and excludes admin controls`
  - **Status:** RED (intentionally skipped)
  - **Verifies:** Navigation contract for volunteer IA payload
- ✅ **Test:** `[G5-ATDD-API-002][P0] volunteer access to availability endpoint is refused with refusal envelope guidance`
  - **Status:** RED (intentionally skipped)
  - **Verifies:** Access-control refusal for availability endpoint
- ✅ **Test:** `[G5-ATDD-API-003][P0] volunteer access to number mapping and escalation config endpoints is refused without privileged payload leakage`
  - **Status:** RED (intentionally skipped)
  - **Verifies:** Refusal + data non-leakage for admin endpoints
- ✅ **Test:** `[G5-ATDD-API-004][P1] authorized admin role can resolve explicit admin settings pathways while volunteer pathways remain unchanged`
  - **Status:** RED (intentionally skipped)
  - **Verifies:** Authorized admin path success and volunteer/admin IA separation
- ✅ **Test:** `[G5-ATDD-API-005][P0] role and scope context refresh immediately re-evaluates admin pathway access and returns refusal after downgrade`
  - **Status:** RED (intentionally skipped)
  - **Verifies:** Access-control recomputation after role/scope downgrade

### Component Tests (0 tests)

Component lane intentionally omitted for this cycle; repository has no established component-test runner baseline.

---

## Data Factories Created

### ConnectShyft Story g.5 Factory

**File:** `tests/support/factories/connectShyftStoryG5Factory.ts` (167 lines)

**Exports:**

- `createStoryG5Context(overrides?)` - generates deterministic story context (tenant/orgUnit/users/paths/flags/breakpoints)
- `createStoryG5Headers(context, overrides?)` - builds role-aware scoped headers for API contracts
- `buildStoryG5UrlParams(context, actor)` - builds actor-context query parameters for UI route shaping
- `buildStoryG5MoreUrl(context, actor)` - creates More/Settings volunteer route URL
- `buildStoryG5AdminPathUrl(context, adminPath, actor)` - creates explicit admin-path URL with actor context

---

## Fixtures Created

### ConnectShyft Story g.5 Fixtures

**File:** `tests/support/fixtures/connectShyftStoryG5.fixture.ts` (49 lines)

**Fixtures:**

- `storyG5Context` - shared story-level context model
- `storyG5VolunteerHeaders` - ORGUNIT_MEMBER scoped headers
- `storyG5AdminHeaders` - ORGUNIT_ADMIN scoped headers
- `storyG5ViewerHeaders` - TENANT_VIEWER scoped headers (orgUnit removed)

---

## Mock Requirements

No external third-party provider mocking is required for this ATDD package. API contracts rely on existing ConnectShyft route surfaces and role headers.

### Settings Navigation Contract Mock (if backend not yet implemented)

**Endpoint:** `GET /api/v1/connectshyft/settings/navigation`

**Success Response (authorized):**

```json
{
  "ok": true,
  "code": "CONNECTSHYFT_SETTINGS_NAVIGATION_RESOLVED",
  "data": {
    "primaryOptions": [
      { "key": "directory" },
      { "key": "settings" },
      { "key": "notification-preferences" },
      { "key": "display-preferences" },
      { "key": "sign-out" }
    ],
    "adminOptions": [
      { "key": "availability" },
      { "key": "numbers" },
      { "key": "escalation" }
    ]
  }
}
```

**Failure Response (unauthorized):**

```json
{
  "ok": false,
  "code": "CONNECTSHYFT_SETTINGS_NAVIGATION_FORBIDDEN",
  "refusalType": "business",
  "message": "You need an authorized role to access admin settings pathways."
}
```

---

## Required data-testid Attributes

### ConnectShyft More/Settings Surface

- `connectshyft-more-surface` - root More/Settings container
- `connectshyft-more-option-directory` - volunteer directory entry
- `connectshyft-more-option-settings` - volunteer settings entry
- `connectshyft-more-option-notifications` - notification preference entry
- `connectshyft-more-option-display-preferences` - display preference entry
- `connectshyft-more-option-sign-out` - sign-out action
- `connectshyft-more-admin-option-availability` - admin availability entry
- `connectshyft-more-admin-option-numbers` - admin number-mappings entry
- `connectshyft-more-admin-option-escalation` - admin escalation entry

### Access-Refusal and Admin Settings Views

- `connectshyft-settings-refusal-guidance` - refusal guidance region
- `connectshyft-availability-config-form` - availability admin form
- `connectshyft-number-mapping-surface` - number mapping admin surface
- `connectshyft-admin-settings-context-chip` - admin-context indicator
- `connectshyft-escalation-settings-surface` - escalation settings surface
- `connectshyft-escalation-settings-form` - escalation settings form
- `connectshyft-primary-nav-more-active` - active nav state marker for More

### Responsive Layout Markers

- `connectshyft-more-layout-mobile` - mobile IA layout marker
- `connectshyft-more-layout-tablet` - tablet IA layout marker
- `connectshyft-more-layout-desktop` - desktop IA layout marker

---

## Implementation Checklist

### Test: G5-ATDD-API-001

**File:** `tests/api/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.api.spec.ts`

**Tasks to make this test pass:**

- [ ] Implement `GET /api/v1/connectshyft/settings/navigation` route contract
- [ ] Ensure volunteer payload includes required volunteer options
- [ ] Ensure volunteer payload omits admin options
- [ ] Run test: `npx playwright test tests/api/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.api.spec.ts -g "G5-ATDD-API-001"`
- [ ] ✅ Test passes (green phase)

### Test: G5-ATDD-API-002 and G5-ATDD-API-003

**File:** `tests/api/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.api.spec.ts`

**Tasks to make this test pass:**

- [ ] Enforce role/capability denial for volunteer access to availability, numbers, escalation endpoints
- [ ] Return refusal envelope codes and messages expected by tests
- [ ] Ensure no privileged data is returned on denied responses
- [ ] Run test group with `-g "G5-ATDD-API-00[23]"`
- [ ] ✅ Tests pass (green phase)

### Test: G5-ATDD-API-004 and G5-ATDD-API-005

**File:** `tests/api/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.api.spec.ts`

**Tasks to make this test pass:**

- [ ] Implement admin success-path payload for explicit admin options
- [ ] Implement role/scope refresh semantics that downgrade access immediately
- [ ] Return deterministic forbidden response on downgraded context
- [ ] Run test group with `-g "G5-ATDD-API-00[45]"`
- [ ] ✅ Tests pass (green phase)

### Test: G5-ATDD-E2E-001 through G5-ATDD-E2E-005

**File:** `tests/e2e/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Update `ConnectShyftMoreView` IA structure to be volunteer-first
- [ ] Move admin controls to explicit admin paths only
- [ ] Add denial guidance UX for unauthorized deep-links
- [ ] Ensure nav state reflects explicit admin-path visits by authorized users
- [ ] Implement responsive layout markers and stable IA at mobile/tablet/desktop widths
- [ ] Add required `data-testid` attributes listed above
- [ ] Run test: `npx playwright test tests/e2e/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.spec.ts`
- [ ] ✅ Tests pass (green phase)

---

## Running Tests

```bash
# Run all g-5 RED-phase tests
npx playwright test tests/api/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.api.spec.ts tests/e2e/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.spec.ts

# Run API file only
npx playwright test tests/api/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.api.spec.ts

# Run E2E file only (headed)
npx playwright test tests/e2e/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.spec.ts --headed

# Debug one scenario
npx playwright test tests/e2e/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.spec.ts -g "G5-ATDD-E2E-002" --debug
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ API and E2E tests generated for g-5
- ✅ Tests are intentionally marked with `test.skip()` per this ATDD red-phase policy
- ✅ Fixtures/factory infrastructure generated for DEV handoff
- ✅ Checklist and implementation tasks documented

### GREEN Phase (DEV Team Next)

1. Remove `test.skip()` for the scenario being implemented.
2. Implement minimal code to satisfy that one scenario.
3. Run that test and confirm it passes.
4. Repeat scenario-by-scenario.

### REFACTOR Phase (After Green)

1. Remove duplication in route-guard and IA composition logic.
2. Keep API and E2E tests green during refactors.
3. Confirm responsive/accessibility contracts remain intact.

---

## Test Execution Evidence

### Initial RED-Phase Verification Command

**Command:**

`npx playwright test tests/api/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.api.spec.ts tests/e2e/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.spec.ts`

**Results:**

- Total tests discovered: 10
- Skipped: 10
- Executed failures: 0 (expected for this workflow's skipped-red policy)

### Additional Validation Commands Run

- `npx playwright test --list ...` confirmed all 10 test cases are syntactically valid and discoverable.

---

## Validation and Completion Summary (Step 5)

### Checklist Validation Outcomes

- Prerequisites satisfied: ✅
- Story context loaded and mapped: ✅
- Test strategy produced and prioritized: ✅
- API and E2E test files generated in correct directories: ✅
- RED-phase compliance (`test.skip`, expected behavior assertions): ✅
- Factory and fixture infrastructure created: ✅
- CLI sessions cleaned up: ✅ (no CLI session opened for this run)
- Temp artifacts moved into `{test_artifacts}`: ✅
  - `_bmad-output/test-artifacts/atdd-subprocess/tea-atdd-api-tests-2026-03-07T12-59-43-959Z.json`
  - `_bmad-output/test-artifacts/atdd-subprocess/tea-atdd-e2e-tests-2026-03-07T12-59-43-959Z.json`
  - `_bmad-output/test-artifacts/atdd-subprocess/tea-atdd-summary-2026-03-07T12-59-43-959Z.json`

### Output Paths

- Main checklist: `_bmad-output/test-artifacts/atdd-checklist-g-5.md`
- Generated tests:
  - `tests/api/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.api.spec.ts`
  - `tests/e2e/platform/g-5-more-settings-volunteer-ia-and-admin-separation.atdd.spec.ts`
- Generated support infra:
  - `tests/support/factories/connectShyftStoryG5Factory.ts`
  - `tests/support/fixtures/connectShyftStoryG5.fixture.ts`

### Key Risks / Assumptions

- Assumption: new API contract `GET /api/v1/connectshyft/settings/navigation` will be introduced for IA payload enforcement.
- Risk: some existing endpoint refusal codes may differ from asserted target codes and require harmonization.
- Risk: required `data-testid` attributes are not guaranteed in current UI and must be implemented during green phase.

---

## Next Recommended Workflow

- Proceed to implementation workflow (`dev-story`) for Story g.5 and remove `test.skip()` test-by-test as each behavior is implemented.

