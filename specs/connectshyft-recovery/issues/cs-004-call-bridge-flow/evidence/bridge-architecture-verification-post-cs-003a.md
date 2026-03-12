# CS-004 Bridge Architecture Verification After CS-003a

Status: Verified with follow-up notes
Date: 2026-03-12
Verification Scope: CS-004 bridge architecture only, after CS-003a adapter boundary remediation

## Governing Documents

- `/specs/connectshyft-recovery/developer_execution_packet.md`
- `/specs/connectshyft-recovery/ADR-00X_Communication_Infrastructure_Contract.md`
- `/specs/connectshyft-recovery/Canonical_Data_Model_Note_Communication_Infrastructure.md`
- `/specs/connectshyft-recovery/issues/CS-004_Call_Bridge_Guardrailed_Spec.md`
- `/specs/connectshyft-recovery/issues/CS-003a_Telnyx_Adapter_Boundary_Remediation_Guardrailed_Spec.md`

## Verification Summary

CS-004 runtime bridge orchestration remains architecturally compatible with the Communication Infrastructure ADR after CS-003a.

Verified runtime outcomes:

- no Telnyx import remains outside `/infrastructure/communications/telnyx`
- bridge orchestration depends on provider-neutral bridge and telephony contracts
- webhook correlation enters the app layer as normalized provider metadata
- provider event translation occurs before bridge domain logic runs
- bridge session and bridge leg persistence remain the authoritative state model

Verification notes:

- `endCall` is available on the post-CS-003a provider interface and registry surface, but CS-004 bridge orchestration does not currently invoke it. This is not a new regression; it is simply not part of the current bridge flow.
- Bridge-related tests no longer mock Telnyx modules directly, but some fixtures still use concrete `telnyx` provider keys and identifier strings in assertions. Runtime boundaries are clean; some test data is still vendor-labeled.
- Unrelated legacy `twilioNumberE164` fields still exist elsewhere in `connectshyft.ts`, but they were not observed in the CS-004 bridge path reviewed here.

## Architecture Verification Checklist

### Provider Boundary Integrity

Status: Pass

Evidence:

- `providerRegistry.ts` imports the generic resolver from `/infrastructure/communications`, not Telnyx directly.
- `/infrastructure/communications/index.ts` loads provider modules generically by provider key.
- No Telnyx import scan matches were found outside `/infrastructure/communications/telnyx`.
- `connectshyft.ts` translates provider events before resolving bridge webhook progression.

Relevant files:

- `/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`
- `/infrastructure/communications/index.ts`
- `/infrastructure/communications/telnyx/index.ts`
- `/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`

### Telephony Interface Compliance

Status: Pass with applicability note

Evidence:

- Bridge orchestration uses `BridgeTelephonyProvider`, `TelephonyProviderAdapter`, and normalized provider results.
- `buildBridgeTelephonyProvider(...)` invokes `startOutboundCall` and `startBridgeSession` through the provider interface.
- Normalized provider correlation metadata (`providerLegId`, `providerMessageId`, `providerEventId`, `providerNumber`) is consumed in webhook routing before bridge handling.
- `endCall` exists on the provider interface and registry surface, but no current CS-004 bridge path calls it.

Relevant files:

- `/domains/communication/bridge/bridgeSessionTypes.ts`
- `/domains/communication/bridge/startBridgeSession.ts`
- `/domains/communication/bridge/handleProviderBridgeEvent.ts`
- `/domains/communication/telephony/index.ts`
- `/apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
- `/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`

### Domain Boundary Enforcement

Status: Pass

Evidence:

- Bridge orchestration logic remains in `/domains/communication/bridge` plus ConnectShyft application wiring.
- Provider adapter logic remains in `/infrastructure/communications/telnyx`.
- No provider-specific import or request/response handling was found in bridge domain files.
- Domain state transitions remain in `bridgeStateMachine.ts` and are applied through domain functions, not infrastructure callbacks.

Relevant files:

- `/domains/communication/bridge/bridgeStateMachine.ts`
- `/domains/communication/bridge/startBridgeSession.ts`
- `/domains/communication/bridge/handleProviderBridgeEvent.ts`
- `/apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`
- `/infrastructure/communications/telnyx/index.ts`

### Bridge Session State Integrity

Status: Pass

Evidence:

- `bridge_session` and `bridge_leg` remain the persisted authoritative model.
- Operator and neighbor legs are tracked separately in domain/application state.
- Provider events are mapped into `ProviderBridgeEvent` before state mutation.
- Persistence writes occur through the bridge repository after domain transition logic.

Relevant files:

- `/domains/communication/bridge/bridgeSessionTypes.ts`
- `/domains/communication/bridge/startBridgeSession.ts`
- `/domains/communication/bridge/handleProviderBridgeEvent.ts`
- `/apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts`

### Provider Error Handling

Status: Partial

Evidence:

- Outbound dispatch refusals now surface normalized `providerFailureClassification` in `connectshyft.ts`.
- No Telnyx-specific error handling was found in bridge orchestration code.
- The bridge domain does not currently branch on retryable vs non-retryable categories; provider failures bubble up and are normalized at the route/app boundary.

Interpretation:

- This is compatible with CS-003a remediation because no provider-specific handling leaked upward.
- If CS-005 wants bridge-specific retry behavior, it can build on the normalized classification already exposed by the provider boundary.

Relevant files:

- `/domains/communication/telephony/index.ts`
- `/infrastructure/communications/telnyx/index.ts`
- `/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `/domains/communication/bridge/handleProviderBridgeEvent.ts`

## Test Verification

Status: Pass with follow-up note

Reviewed files:

- `/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.bridge-flow.test.ts`
- `/apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
- `/domains/communication/bridge/__tests__/handleProviderBridgeEvent.test.ts`
- `/apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`

Results:

- No bridge test reviewed mocks a Telnyx module directly.
- Route-level bridge tests mock `/infrastructure/communications` and return provider-adapter-shaped doubles.
- Domain bridge tests mock generic provider methods such as `startOutboundCall` and `startBridgeSession`.
- `connectshyft.bridge-flow.test.ts` still passes after CS-003a.
- Some tests still use concrete `telnyx` provider keys and `telnyx-*` identifier strings in fixture data. That is a test-fixture neutrality gap, not a runtime boundary leak.

## Commands Run

### Boundary and build

- `node scripts/enforce-workspace-boundaries.js`
  - Result: passed
- `npm run build` in `apps/connectshyft-api`
  - Result: passed

### Focused ConnectShyft verification tests

- `env NODE_ENV=test MONEYSHYFT_TEST_DATABASE_URL=postgresql://jeremiahotis@127.0.0.1:5432/moneyshyft_ci ENABLE_TEST_CONNECTSHYFT_FLAGS=true npm run test:connectshyft`
  - Result: passed
  - Suites: 55 passed
  - Tests: 312 passed

### Targeted scans

- Telnyx import scan outside infrastructure:
  - `rg -n "from ['\\\"](?:[^'\\\"]*telnyx|@telnyx)|require\\(['\\\"][^'\\\"]*telnyx" apps domains tests infrastructure -g '!infrastructure/communications/telnyx/**'`
  - Result: no matches
- Bridge/app Telnyx field scan:
  - `rg -n "telnyx(CallControlId|MessageId|EventId|PhoneNumber|Payload|Response|Webhook)|telnyxPayload|telnyxHeaders|call_control_id|message_uuid|twilio" ...`
  - Result: no Telnyx-specific bridge-path matches; unrelated legacy `twilioNumberE164` matches remain elsewhere in `connectshyft.ts`

## Verification Conclusion

CS-004 bridge runtime architecture remains compliant with the Communication Infrastructure ADR after CS-003a remediation.

Open follow-up notes captured by this verification:

1. Bridge tests still contain some vendor-labeled fixture data even though they no longer mock Telnyx modules directly.
2. Bridge orchestration does not currently use `endCall`, so that contract addition is compatible but not exercised by CS-004 runtime behavior.
3. Retryable vs non-retryable provider classification is normalized at the route/app boundary, not inside bridge domain logic.
