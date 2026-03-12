# CS-004b Bridge Test Fixture Normalization (Guardrailed Spec)

## A. Outcome

Bridge-related tests use provider-neutral fixture names and payload shapes so the test suite reinforces the Communication Infrastructure ADR instead of implying vendor-specific coupling inside bridge or app-domain logic.

## B. Scope

This issue is limited to test and test-support cleanup for CS-004 bridge-related coverage after CS-004 architectural verification.

In scope:
- replace vendor-labeled fixture keys in bridge-related tests with provider-neutral names
- update test helpers, factories, mocks, and fixture builders accordingly
- keep runtime behavior unchanged
- preserve current test intent and coverage

Expected focus areas:
- `connectshyft.bridge-flow.test.ts`
- `connectshyft.outbound-dispatch.test.ts`
- any bridge-adjacent test helpers or fixture builders
- any additional bridge-related tests still carrying vendor-labeled payload fields

## Governing Execution Contract

This issue is governed by:

- `/specs/connectshyft-recovery/developer_execution_packet.md`
- `/specs/connectshyft-recovery/ADR-00X_Communication_Infrastructure_Contract.md`
- `/specs/connectshyft-recovery/Canonical_Data_Model_Note_Communication_Infrastructure.md`

This issue is informed by the CS-004 architecture verification result:
- bridge orchestration remains architecturally compatible
- bridge test fixtures still contain some vendor-labeled data even though direct Telnyx module mocking is gone

If implementation details conflict with the ADR or canonical data model note, those documents take precedence.

## C. Non-Goals

- no runtime code changes unless strictly required to keep tests compiling after fixture renaming
- no bridge orchestration redesign
- no provider adapter changes
- no UI changes
- no schema changes
- no retry/idempotency work
- no broad test refactor outside fixture normalization

## D. Implementation Guardrails

1. Runtime behavior must not change.
2. Provider-neutral test names must reflect the normalized contract already established by CS-003a.
3. Tests must not reintroduce direct Telnyx module mocking.
4. Test fixtures must prefer normalized names such as:
   - `providerCallId`
   - `providerMessageId`
   - `providerEventId`
   - `providerLegId`
   - `providerNumber`
5. No vendor-prefixed field names should remain in bridge-related tests unless they are explicitly testing infrastructure translation behavior inside the Telnyx adapter.
6. Bridge-domain and app-layer tests must consume provider-neutral shapes only.
7. Infrastructure adapter tests may still contain provider-native payloads where the purpose of the test is provider translation.

## E. Acceptance Criteria

### Fixture Neutrality
- bridge-related tests no longer use vendor-labeled fixture names where provider-neutral names are appropriate
- bridge and route-level tests use normalized correlation metadata

### Boundary Clarity
- no direct Telnyx module mocking in bridge-related tests
- bridge-domain tests do not imply provider-native event semantics above infrastructure

### Regression Safety
- bridge-related Jest suites still pass
- no runtime production files are modified unless strictly required for type alignment
- boundary enforcement still passes

## F. Evidence Required in PR

- list of tests updated
- example before/after fixture naming changes
- proof that bridge-related tests still pass
- statement confirming runtime behavior unchanged

## G. Definition of Done

This issue is done when bridge-related tests reinforce provider-neutral architecture and no vendor-labeled fixture naming remains outside provider adapter translation tests.

## H. Suggested Fixture Name Conversions

Examples:
- `telnyxCallControlId` -> `providerCallId`
- `telnyxMessageId` -> `providerMessageId`
- `telnyxEventId` -> `providerEventId`
- `telnyxTo` / `telnyxFrom` -> `providerNumber` or normalized correlation metadata fields as appropriate

Use normalized names that match the current telephony contract, not ad hoc replacements.
