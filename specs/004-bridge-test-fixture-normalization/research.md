# Research: CS-004b Bridge Test Fixture Normalization

## Decision 1

- **Decision**: Limit CS-004b fixture cleanup to the bridge-related Jest files that still carry vendor-labeled data: `connectshyft.bridge-flow.test.ts`, `connectshyft.outbound-dispatch.test.ts`, `bridgeSessions.test.ts`, and `providerCorrelationMappings.test.ts`.
- **Rationale**: Repository scans show the bridge-domain unit tests are already provider-neutral, while the remaining leakage is concentrated in those four bridge-facing route and module tests. This keeps the cleanup surgical and aligned with the issue guardrails.
- **Alternatives considered**: Sweep all ConnectShyft tests for `telnyx` and `twilio` strings. Rejected because it broadens scope beyond bridge-related coverage and would pull in provider registry, translation, and voicemail scenario tests that intentionally exercise provider-specific behavior.

## Decision 2

- **Decision**: Normalize bridge-facing fixture shapes to the existing CS-003a contract vocabulary: `providerLegId`, `providerMessageId`, `providerEventId`, and `providerNumber`, with neutral identifier values such as `provider-leg-*` and `provider-message-*`.
- **Rationale**: CS-003a already established the normalized telephony contract. Bridge tests should reflect that contract rather than implying vendor-specific semantics or legacy snake_case payload shapes in app-layer tests.
- **Alternatives considered**: Keep legacy snake_case fields such as `provider_leg_id` in bridge route tests or rename fixtures ad hoc per file. Rejected because both approaches dilute the normalized contract and make the test surface inconsistent.

## Decision 3

- **Decision**: Preserve provider-native payloads and headers only in infrastructure translation or signature-verification helpers and tests.
- **Rationale**: The ADR allows provider-native handling at the infrastructure edge. Helpers such as webhook signature builders are still correctly provider-specific because their job is to exercise translation and verification behavior, not bridge-domain neutrality.
- **Alternatives considered**: Remove all provider-native payloads from the repository. Rejected because it would damage valid adapter-edge coverage and exceed the issue scope.

## Decision 4

- **Decision**: Avoid runtime production code changes and validate success through targeted bridge Jest suites, targeted vendor-string scans, touched-file checks, and boundary enforcement.
- **Rationale**: CS-004b is explicitly test-only cleanup. The safest implementation path is to keep production code unchanged and prove that only tests and docs moved.
- **Alternatives considered**: Introduce runtime aliasing or compatibility shims to accommodate old fixture names. Rejected because runtime changes are unnecessary for the intended cleanup.

## Decision 5

- **Decision**: Prefer file-local fixture normalization instead of introducing new shared bridge test helper abstractions.
- **Rationale**: The remaining leakage is limited and localized. Updating the existing file-local mock builders and fixture literals keeps the change easy to review and avoids an unnecessary test-helper refactor.
- **Alternatives considered**: Extract a new shared bridge-fixture builder library under `tests/support`. Rejected because it adds abstraction without reducing enough duplication to justify the extra surface area.
