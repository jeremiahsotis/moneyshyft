# CS-003 Architectural Integrity Verification

Date: March 12, 2026
Verification target: merged implementation PR `#216` (`Feat: implement CS-003 Telnyx outbound adapter`)

## Scope

This document verifies the current CS-003 Telnyx outbound adapter implementation against:

- `/specs/connectshyft-recovery/developer_execution_packet.md`
- `/specs/connectshyft-recovery/ADR-00X_Communication_Infrastructure_Contract.md`
- `/specs/connectshyft-recovery/Canonical_Data_Model_Note_Communication_Infrastructure.md`
- `/specs/connectshyft-recovery/issues/CS-003_Telnyx_Adapter_Guardrailed_Spec.md`

## Commands Executed

Executed locally on March 12, 2026:

```bash
cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api
npm run build

cd /Users/jeremiahotis/projects/connectshyft
node scripts/enforce-workspace-boundaries.js

cd /Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api
node /Users/jeremiahotis/projects/connectshyft/node_modules/.pnpm/jest@29.7.0_@types+node@20.19.37_babel-plugin-macros@3.1.0_ts-node@10.9.2_@types+node@20.19.37_typescript@5.9.3_/node_modules/jest/bin/jest.js \
  --runInBand \
  --config jest.config.js \
  --runTestsByPath \
  src/modules/connectshyft/__tests__/providerRegistry.test.ts \
  src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts \
  ../../domains/communication/telephony/__tests__/index.test.ts \
  ../../infrastructure/communications/telnyx/__tests__/index.test.ts
```

## Validation Results

| Check | Result | Notes |
|-------|--------|-------|
| `apps/connectshyft-api` TypeScript build | PASS | `npm run build` succeeded |
| Workspace boundary guard | PASS | `node scripts/enforce-workspace-boundaries.js` succeeded |
| CS-003 target Jest suites | PASS | `4` suites passed, `31` tests passed |
| Provider interface under `domains/communication/telephony` | PASS | See `/domains/communication/telephony/index.ts` |
| Telnyx adapter under `infrastructure/communications/telnyx` | PASS | See `/infrastructure/communications/telnyx/index.ts` |
| No Telnyx imports under `/domains/communication/bridge` | PASS | No matches found |
| Provider events translated before entering shared domain contracts | PASS | Telnyx adapter exposes `translateProviderEvent(...)` and returns sanitized provider-neutral events |
| No Telnyx imports under `/apps` | FAIL | `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts` imports `createTelnyxAdapter` directly |
| Telnyx request/payload handling exists only inside adapter | FAIL | app-layer webhook correlation and sanitization still reference Telnyx-specific field names |

## Verified Architecture Strengths

1. The provider-neutral contract exists and is exported from `/domains/communication/telephony/index.ts` and `/domains/communication/index.ts`.
2. The Telnyx implementation is concentrated in `/infrastructure/communications/telnyx/index.ts` with dedicated infrastructure tests in `/infrastructure/communications/telnyx/__tests__/index.test.ts`.
3. The adapter implements real `sendSms`, `startOutboundCall`, `startBridgeSession`, `verifyWebhook`, and `translateProviderEvent` entrypoints.
4. Webhook signature verification fails closed with provider-neutral refusal codes:
   - `WEBHOOK_SIGNATURE_NOT_CONFIGURED`
   - `WEBHOOK_SIGNATURE_MISSING`
   - `WEBHOOK_SIGNATURE_INVALID`
5. Provider event translation strips provider-specific fields before returning the event object to consumers.
6. The focused CS-003 tests cover interface assertions, adapter request/response mapping, outbound dispatch behavior, and webhook verification/translation.

## Architectural Deviations

### 1. Direct Telnyx adapter import under `/apps`

File:

- `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`

Current behavior:

- `providerRegistry.ts` imports `createTelnyxAdapter` directly from `/infrastructure/communications/telnyx`.
- This makes the application layer aware of the concrete provider implementation rather than resolving it through a provider-neutral composition boundary.

Impact:

- The implementation still avoids raw Telnyx request execution in app code, but the strict "no Telnyx imports under `/apps`" boundary is not satisfied.

### 2. App-layer references to Telnyx-specific webhook/correlation field names

Files:

- `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `/Users/jeremiahotis/projects/connectshyft/apps/connectshyft-api/src/modules/connectshyft/canonicalEvents.ts`

Current behavior:

- app-layer logic still recognizes keys such as `telnyxCallControlId`, `telnyxMessageId`, and related provider-specific webhook identifiers.
- This means some provider-shape awareness remains outside the infrastructure adapter.

Impact:

- The route/domain-adjacent application layer is still partially coupled to Telnyx payload conventions.
- The implementation is functionally correct, but it does not fully satisfy the strongest form of adapter isolation described in the PR template.

## Out-of-Scope Checks

| Constraint | Result | Notes |
|-----------|--------|-------|
| No bridge orchestration implemented as part of CS-003 | PASS | CS-003 limits itself to outbound SMS/call initiation and future-compatible bridge hooks |
| No UI changes included | PASS | merged implementation PR `#216` touched no `apps/connectshyft-web` files |
| No unrelated persistence schema work | PASS | merged implementation PR `#216` introduced no new migrations |
| No full reliability/retry subsystem | PASS | no retry worker or audit/idempotency subsystem was introduced; only minimal dispatch replay helpers required for outbound request safety exist |

## Conclusion

CS-003 is functionally verified and mostly aligned with the ADR/provider-boundary intent, but it is not perfectly isolated at the application boundary.

Current architectural status:

- Shared provider contract: compliant
- Infrastructure adapter placement: compliant
- Event translation and webhook verification: compliant
- Strict app-layer provider isolation: not fully compliant

Recommended follow-up:

1. Remove the direct `createTelnyxAdapter` import from `/apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts` by introducing a provider-neutral adapter registry/composition seam outside app code.
2. Move Telnyx-specific webhook identifier extraction and sanitization fully into infrastructure translation/correlation helpers so app code only consumes canonical provider-neutral fields.
