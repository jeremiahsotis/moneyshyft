---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04-generate-tests'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-03-07T10:46:58.519Z'
---

# ATDD Checklist - Epic g, Story 4: Add Neighbor and Directory Rebuild

**Date:** 2026-03-07  
**Author:** Jeremiah  
**Primary Test Level:** E2E

---

## Workflow Progress (TEA)

- ✅ Step 01 preflight/context completed
  - Policy gate passed: `npm run policy:check`
  - Branch workflow gate passed: `npm run branch:ensure-workflow -- --workflow _bmad/tea/workflows/testarch/atdd/workflow.yaml --story _bmad-output/implementation-artifacts/g-4-add-neighbor-and-directory-rebuild.md`
  - Story, framework config, existing test patterns, and required knowledge fragments loaded.
- ✅ Step 02 generation mode selected: **AI Generation**
  - Mode rationale: ACs are explicit and existing ConnectShyft patterns provide stable contracts for RED-phase test drafting.
- ✅ Step 03 test strategy completed
  - Primary level: E2E for volunteer-facing add/search/start/mobile behavior.
  - Supporting level: API contracts for deterministic create/search/ensure semantics.
- ✅ Step 04 parallel subprocess generation completed
  - API subprocess output: `/tmp/tea-atdd-api-tests-2026-03-07T10-46-58-519Z.json`
  - E2E subprocess output: `/tmp/tea-atdd-e2e-tests-2026-03-07T10-46-58-519Z.json`
- ✅ Step 04C aggregation completed
  - RED assets written to repository and summary written to `/tmp/tea-atdd-summary-2026-03-07T10-46-58-519Z.json`.
- ✅ Step 05 validation completed
  - Local verification command result: `npx playwright test tests/api/platform/g-4-add-neighbor-and-directory-rebuild.atdd.api.spec.ts tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.atdd.spec.ts --reporter=line`
  - Result: **11 skipped** (RED handoff intentionally staged with `test.skip()`).

---

## Story Summary

Story g.4 rebuilds ConnectShyft Add Neighbor and Directory flows for volunteer speed, clarity, and mobile ergonomics. The contract requires complete identity intake fields, actionable validation refusals without partial writes, conference-scoped directory search, and deterministic conversation start/open behavior from directory entries.

**As a** volunteer  
**I want** Add Neighbor and Directory flows to be clear and mobile-friendly  
**So that** I can create/find people quickly and start the right conversation

---

## Acceptance Criteria

1. Given Add Neighbor is opened, when the form is presented, then the flow supports first name, last name, primary phone, additional phone, email, address, prefers texting, shared phone, and optional notes.
2. Given Add Neighbor validation runs, when required contact constraints fail, then refusal messaging is clear and actionable with no partial writes.
3. Given Directory is used, when users search by name/phone, then results remain conference-scoped for volunteer workflows.
4. Given users select a directory entry, when conversation is started, then the app opens an existing active thread if present or starts a new conversation via deterministic ensure behavior.
5. Given mobile and tablet workflows are used, when users navigate Add Neighbor and Directory flows, then layouts remain touch-friendly and preserve context visibility.

---

## Failing Tests Created (RED Phase)

### E2E Tests (6 tests)

**File:** `tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.atdd.spec.ts` (216 lines)

- ✅ **Test:** [G4-ATDD-E2E-001][P0] add-neighbor flow exposes all required intake fields and actions for volunteer conversation-first onboarding @P0
  - **Status:** RED - Expected g.4 UI selectors and layout are not fully implemented (test intentionally `test.skip()` in RED handoff).
  - **Verifies:** Complete field/control presence for Add Neighbor intake.

- ✅ **Test:** [G4-ATDD-E2E-002][P0] validation refusal for missing required contact constraints is clear actionable and blocks partial writes @P0
  - **Status:** RED - Expected refusal feedback contract/UI behavior not implemented yet (test intentionally `test.skip()`).
  - **Verifies:** Actionable validation refusal and blocked success path.

- ✅ **Test:** [G4-ATDD-E2E-003][P0] directory search supports name and phone modes and keeps conference-scoped results for volunteer workflows @P0
  - **Status:** RED - Directory mode controls and scope signals are not fully aligned with g.4 contract (test intentionally `test.skip()`).
  - **Verifies:** Name/phone directory search and conference-scoped result guarantees.

- ✅ **Test:** [G4-ATDD-E2E-004][P0] selecting a directory entry with an active thread opens that thread via deterministic ensure behavior and shows contextual reuse notice @P0
  - **Status:** RED - Existing-thread deterministic routing/notice expectations not fully implemented yet (test intentionally `test.skip()`).
  - **Verifies:** Existing-thread reuse path from directory start action.

- ✅ **Test:** [G4-ATDD-E2E-005][P1] selecting a directory entry without an active thread starts a new conversation and surfaces deterministic creation feedback @P1
  - **Status:** RED - New-thread ensure feedback/routing behavior not fully implemented yet (test intentionally `test.skip()`).
  - **Verifies:** Deterministic thread creation path from directory entry.

- ✅ **Test:** [G4-ATDD-E2E-006][P1] mobile and tablet layouts remain touch-friendly while preserving add-neighbor and directory context visibility @P1
  - **Status:** RED - Responsive layout/context test IDs and behavior are not fully implemented yet (test intentionally `test.skip()`).
  - **Verifies:** Mobile/tablet layout fidelity and context visibility.

### API Tests (5 tests)

**File:** `tests/api/platform/g-4-add-neighbor-and-directory-rebuild.atdd.api.spec.ts` (272 lines)

- ✅ **Test:** [G4-ATDD-API-001][P0] add-neighbor create contract accepts primary additional phone email address prefers-texting shared-phone and optional notes in one atomic write @P0
  - **Status:** RED - Expanded create contract facets are not fully satisfied yet (test intentionally `test.skip()`).
  - **Verifies:** Full add-neighbor create envelope with all required fields.

- ✅ **Test:** [G4-ATDD-API-002][P0] add-neighbor refusal for missing contact constraints returns actionable messaging and guarantees no partial writes @P0
  - **Status:** RED - Validation refusal/no-partial-write behavior not fully implemented yet (test intentionally `test.skip()`).
  - **Verifies:** Deterministic refusal envelope and write-atomicity guard.

- ✅ **Test:** [G4-ATDD-API-003][P0] directory search by name and phone remains conference scoped for volunteer workflows @P0
  - **Status:** RED - Directory scope filtering/search contract requires implementation updates (test intentionally `test.skip()`).
  - **Verifies:** Conference/orgUnit scoping under both search modes.

- ✅ **Test:** [G4-ATDD-API-004][P0] deterministic thread ensure reuses existing active thread when directory starts a conversation for a known neighbor @P0
  - **Status:** RED - Deterministic existing-thread reuse contract not fully met yet (test intentionally `test.skip()`).
  - **Verifies:** Idempotent ensure behavior for neighbors with active threads.

- ✅ **Test:** [G4-ATDD-API-005][P1] directory start-conversation creates a new deterministic thread when no active thread exists @P1
  - **Status:** RED - Deterministic new-thread ensure path contract not fully implemented yet (test intentionally `test.skip()`).
  - **Verifies:** New thread creation + immediate detail retrieval contract.

### Component Tests (0 tests)

**File:** `N/A` (0 lines)

- ✅ **Test:** N/A for this ATDD cycle
  - **Status:** RED - Coverage intentionally concentrated in E2E and API layers for cross-surface flow behavior.
  - **Verifies:** Component-level behaviors are indirectly captured by user-flow + contract tests.

---

## Data Factories Created

### ConnectShyft Story G4 Factory

**File:** `tests/support/factories/connectShyftStoryG4Factory.ts`

**Exports:**

- `createStoryG4Context(overrides?)` - Creates deterministic story context (tenant/orgUnit scope, IDs, paths, breakpoints, required test IDs).
- `createStoryG4Headers(context, overrides?)` - Creates scoped request headers (role, memberships, flags).
- `createStoryG4NeighborCreatePayload(context, overrides?)` - Creates Add Neighbor payload with faker-backed contact and address data.
- `createStoryG4ThreadEnsurePayload(context, overrides?)` - Creates deterministic ensure payload for existing/new thread start paths.

**Example Usage:**

```typescript
const context = createStoryG4Context();
const headers = createStoryG4Headers(context, {
  role: 'ORGUNIT_MEMBER',
  orgUnitMemberships: [context.orgUnitId],
});
const payload = createStoryG4NeighborCreatePayload(context);
```

---

## Fixtures Created

### ConnectShyft Story G4 Fixtures

**File:** `tests/support/fixtures/connectShyftStoryG4.fixture.ts`

**Fixtures:**

- `storyG4Context` - Canonical g.4 IDs, paths, scope markers, breakpoints, and selector contracts.
- `storyG4VolunteerHeaders` - Volunteer scoped headers for primary orgUnit workflow paths.
- `storyG4CrossScopeHeaders` - Cross-scope header variant for negative scoping scenarios.
- `storyG4DirectoryQuery` - Deterministic directory querystring helper.
- `storyG4NeighborCreatePayload` - Valid Add Neighbor create payload.
- `storyG4NeighborCreateWithoutPrimaryPhonePayload` - Invalid payload variant used for refusal assertions.
- `storyG4EnsureExistingThreadPayload` - Ensure payload for known active-thread neighbor.
- `storyG4EnsureNewThreadPayload` - Ensure payload for neighbor without active thread.

---

## Mock Requirements

### Add Neighbor Create + Validation Mock

**Endpoint:** `POST /api/v1/connectshyft/neighbors`

**Success Response:**

```json
{
  "ok": true,
  "code": "CONNECTSHYFT_NEIGHBOR_CREATED",
  "data": {
    "neighbor": {
      "neighborId": "neighbor-g4-...",
      "orgUnitId": "orgunit-alpha-east",
      "phones": [
        { "label": "mobile", "isShared": false },
        { "label": "home", "isShared": true }
      ]
    }
  }
}
```

**Failure Response:**

```json
{
  "ok": false,
  "code": "CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED",
  "message": "Primary phone/contact is required"
}
```

**Notes:** Refusal path must not create any partial neighbor record.

### Directory Search Scope Mock

**Endpoint:** `GET /api/v1/connectshyft/neighbors?query=<term>&mode=name|phone`

**Success Response:**

```json
{
  "ok": true,
  "data": {
    "neighbors": [
      {
        "neighborId": "neighbor-g4-existing-1001",
        "orgUnitId": "orgunit-alpha-east"
      }
    ]
  }
}
```

**Failure Response:**

```json
{
  "ok": false,
  "code": "CONNECTSHYFT_DIRECTORY_QUERY_INVALID",
  "message": "Query must include a searchable value"
}
```

**Notes:** Results must never include `crossScopeOrgUnitId` members in volunteer flow.

### Deterministic Thread Ensure Mock

**Endpoint:** `POST /api/v1/connectshyft/threads`

**Success Response (existing active):**

```json
{
  "ok": true,
  "code": "CONNECTSHYFT_THREAD_ENSURED",
  "data": {
    "thread": {
      "threadId": "thread-g4-existing-1001",
      "neighborId": "neighbor-g4-existing-1001",
      "state": "UNCLAIMED"
    }
  }
}
```

**Success Response (new):**

```json
{
  "ok": true,
  "code": "CONNECTSHYFT_THREAD_ENSURED",
  "data": {
    "thread": {
      "threadId": "thread-g4-new-...",
      "neighborId": "neighbor-g4-new-1002"
    }
  }
}
```

**Notes:** Ensure operation must be deterministic/idempotent for same active neighbor and retrievable via `GET /api/v1/connectshyft/threads/:threadId`.

---

## Required data-testid Attributes

### Add Neighbor Surface

- `connectshyft-add-neighbor-surface` - Primary Add Neighbor page container.
- `connectshyft-neighbor-first-name-input` - First name input.
- `connectshyft-neighbor-last-name-input` - Last name input.
- `connectshyft-neighbor-primary-phone-input` - Primary phone input.
- `connectshyft-neighbor-additional-phone-input` - Additional phone input.
- `connectshyft-neighbor-email-input` - Email input.
- `connectshyft-neighbor-address-line1-input` - Address line 1 input.
- `connectshyft-neighbor-address-city-input` - Address city input.
- `connectshyft-neighbor-address-state-input` - Address state input.
- `connectshyft-neighbor-address-postal-input` - Address postal code input.
- `connectshyft-neighbor-prefers-texting-toggle` - Prefers texting control.
- `connectshyft-neighbor-shared-phone-toggle` - Shared phone control.
- `connectshyft-neighbor-notes-textarea` - Optional notes field.
- `connectshyft-neighbor-submit-action` - Submit action.
- `connectshyft-neighbor-validation-error` - Validation refusal banner/message.
- `connectshyft-neighbor-create-success` - Success signal element (expected absent on refusal).

### Directory Surface

- `connectshyft-directory-surface` - Directory page container.
- `connectshyft-directory-search-input` - Search input.
- `connectshyft-directory-search-mode-name` - Name-mode selector.
- `connectshyft-directory-search-mode-phone` - Phone-mode selector.
- `connectshyft-directory-result-card` - Generic result card locator.
- `connectshyft-directory-result-card-<neighborId>` - Deterministic result card ID per neighbor.
- `connectshyft-directory-result-conference-chip` - Conference/orgUnit scope badge.
- `connectshyft-directory-start-conversation-action` - Start conversation action within result card.
- `connectshyft-directory-existing-thread-notice` - Existing-thread reuse notice.
- `connectshyft-directory-new-thread-notice` - New-thread creation notice.

### Responsive Layout and Context Visibility

- `connectshyft-add-neighbor-layout-mobile`
- `connectshyft-add-neighbor-layout-tablet`
- `connectshyft-directory-layout-mobile`
- `connectshyft-directory-layout-tablet`
- `connectshyft-add-neighbor-context-panel`
- `connectshyft-directory-context-panel`

---

## Implementation Checklist

### Test: [G4-ATDD-E2E-001][P0] Add Neighbor full intake surface

**File:** `tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Expand Add Neighbor form model with all required fields and toggles from AC1.
- [ ] Render all required field/action test IDs in stable order.
- [ ] Ensure volunteer entry route loads `connectshyft-add-neighbor-surface` deterministically.
- [ ] Run test: `npx playwright test tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.atdd.spec.ts -g "G4-ATDD-E2E-001"`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 2.0 hours

### Test: [G4-ATDD-API-002][P0] Validation refusal + no partial writes

**File:** `tests/api/platform/g-4-add-neighbor-and-directory-rebuild.atdd.api.spec.ts`

**Tasks to make this test pass:**

- [ ] Enforce required contact constraints in neighbor create service.
- [ ] Return refusal envelope `CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED` with actionable message text.
- [ ] Guarantee create flow is atomic so invalid payloads do not persist partial data.
- [ ] Run test: `npx playwright test tests/api/platform/g-4-add-neighbor-and-directory-rebuild.atdd.api.spec.ts -g "G4-ATDD-API-002"`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 1.5 hours

### Test: [G4-ATDD-E2E-003][P0] Directory search modes + scope safety

**File:** `tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Build/refresh Directory UI with explicit name/phone search mode controls.
- [ ] Surface conference/orgUnit scope badge for each result.
- [ ] Enforce scoped result filtering in query pipeline and UI list rendering.
- [ ] Run test: `npx playwright test tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.atdd.spec.ts -g "G4-ATDD-E2E-003"`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 2.5 hours

### Test: [G4-ATDD-API-004][P0] Deterministic ensure existing-thread reuse

**File:** `tests/api/platform/g-4-add-neighbor-and-directory-rebuild.atdd.api.spec.ts`

**Tasks to make this test pass:**

- [ ] Ensure `POST /api/v1/connectshyft/threads` is idempotent for neighbors with active threads.
- [ ] Return canonical `CONNECTSHYFT_THREAD_ENSURED` with stable `threadId` reuse.
- [ ] Guarantee returned state remains aligned to active-thread contract (`UNCLAIMED` for this scenario).
- [ ] Run test: `npx playwright test tests/api/platform/g-4-add-neighbor-and-directory-rebuild.atdd.api.spec.ts -g "G4-ATDD-API-004"`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 1.5 hours

### Test: [G4-ATDD-E2E-006][P1] Mobile/tablet touch-friendly context visibility

**File:** `tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Implement responsive layout wrappers for Add Neighbor and Directory (`mobile` + `tablet`).
- [ ] Preserve context panels in both flows at configured breakpoints.
- [ ] Ensure touch targets and spacing remain usable without hiding required context.
- [ ] Run test: `npx playwright test tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.atdd.spec.ts -g "G4-ATDD-E2E-006"`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 2.0 hours

---

## Running Tests

```bash
# Run all failing tests for this story
npx playwright test tests/api/platform/g-4-add-neighbor-and-directory-rebuild.atdd.api.spec.ts tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.atdd.spec.ts

# Run specific API file
npx playwright test tests/api/platform/g-4-add-neighbor-and-directory-rebuild.atdd.api.spec.ts

# Run specific E2E file
npx playwright test tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.atdd.spec.ts

# Run headed mode (E2E)
npx playwright test tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.atdd.spec.ts --headed

# Debug one test
npx playwright test tests/e2e/platform/g-4-add-neighbor-and-directory-rebuild.atdd.spec.ts -g "G4-ATDD-E2E-004" --debug
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ Failing API and E2E tests generated for Story g.4
- ✅ Tests intentionally staged as `test.skip()` for controlled RED handoff
- ✅ Story-specific factory and fixture infrastructure created
- ✅ Mock requirements and required `data-testid` contracts documented
- ✅ ATDD checklist and subprocess outputs generated

### GREEN Phase (DEV Team - Next Steps)

1. Remove `test.skip()` from one highest-priority scenario.
2. Implement minimal code to satisfy only that scenario.
3. Re-run targeted test until green.
4. Update checklist task items and continue to next failing test.

### REFACTOR Phase (DEV Team - After All Tests Pass)

1. Consolidate shared Add Neighbor/Directory UI primitives and validation helpers.
2. Reduce duplicated scope/ensure logic across service and view layers.
3. Re-run full g.4 API+E2E set and adjacent ConnectShyft smoke coverage.

---

## Knowledge Fragments Applied

- `data-factories.md`
- `component-tdd.md`
- `test-quality.md`
- `test-healing-patterns.md`
- `selector-resilience.md`
- `timing-debugging.md`
- `api-testing-patterns.md`
- `utils/api-request.md`
- `utils/network-recorder.md`
- `utils/auth-session.md`
- `utils/intercept-network-call.md`
- `utils/recurse.md`
- `utils/log.md`
- `utils/file-utils.md`
- `utils/network-error-monitor.md`
- `utils/fixtures-composition.md`
- `cli/playwright-cli.md`

---

## Handoff Summary

- Story ID: `g-4`
- Primary level: `E2E`
- Total tests generated: `11` (`6` E2E + `5` API + `0` component)
- Infrastructure generated: `1` factory file + `1` fixture file
- RED verification: command executed, `11 skipped` confirmed
- Checklist output: `_bmad-output/test-artifacts/atdd-checklist-g-4.md`
