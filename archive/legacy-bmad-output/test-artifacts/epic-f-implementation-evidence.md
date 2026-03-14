# Epic F Recommendation Implementation Evidence

- Captured at: `2026-03-02T03:49:39Z` (UTC)
- Scope: `TR Epic F` recommendation follow-through (deterministic IDs, suite split, runtime validation)

## Implemented Changes

1. Deterministic test ID utility added:
   - `tests/support/utils/deterministicTestIds.ts`
   - Replaces ad-hoc `Date.now()`-based IDs with stable, test-seeded values.

2. Epic F suites updated to use deterministic IDs:
   - `tests/api/platform/f-1-provider-adapter-interface-and-provider-registry.automate.api.spec.ts`
   - `tests/api/platform/f-2-canonical-comms-event-model-and-event-store.automate.read-model.api.spec.ts`
   - `tests/api/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.api.spec.ts`
   - `tests/e2e/platform/f-1-provider-adapter-interface-and-provider-registry.automate.spec.ts`
   - `tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.automate.spec.ts`
   - `tests/e2e/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.spec.ts`

3. Oversized suites split into concern-focused files:
   - `tests/api/platform/f-2-canonical-comms-event-model-and-event-store.automate.api.spec.ts`
   - `tests/api/platform/f-2-canonical-comms-event-model-and-event-store.automate.read-model.api.spec.ts` (new)
   - `tests/api/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.api.spec.ts`
   - `tests/api/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.guardrails.api.spec.ts` (new)
   - `tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.atdd.spec.ts`
   - `tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.atdd-read-model.spec.ts` (new)
   - `tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.automate.spec.ts`
   - `tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.automate.read-model.spec.ts` (new)

## Verification Results

1. `Date.now()` removed from Epic F test surfaces:
   - Command: `rg -n "Date\.now\(" tests/api/platform/f-[1-4]* tests/e2e/platform/f-[1-4]* -S`
   - Result: no matches.

2. Split suite line counts (all under 300):
   - `209` `tests/api/platform/f-2-canonical-comms-event-model-and-event-store.automate.api.spec.ts`
   - `252` `tests/api/platform/f-2-canonical-comms-event-model-and-event-store.automate.read-model.api.spec.ts`
   - `225` `tests/api/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.api.spec.ts`
   - `177` `tests/api/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.guardrails.api.spec.ts`
   - `184` `tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.atdd.spec.ts`
   - `253` `tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.atdd-read-model.spec.ts`
   - `168` `tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.automate.spec.ts`
   - `198` `tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.automate.read-model.spec.ts`

3. Targeted Playwright execution for changed Epic F specs:
   - Command:
     - `npm run test:e2e -- tests/api/platform/f-1-provider-adapter-interface-and-provider-registry.automate.api.spec.ts tests/api/platform/f-2-canonical-comms-event-model-and-event-store.automate.api.spec.ts tests/api/platform/f-2-canonical-comms-event-model-and-event-store.automate.read-model.api.spec.ts tests/api/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.api.spec.ts tests/api/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.guardrails.api.spec.ts tests/e2e/platform/f-1-provider-adapter-interface-and-provider-registry.automate.spec.ts tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.atdd.spec.ts tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.atdd-read-model.spec.ts tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.automate.spec.ts tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.automate.read-model.spec.ts tests/e2e/platform/f-4-telnyx-adapter-implementation-and-cutover-guardrails.automate.spec.ts`
   - Result:
     - `29 passed`
     - `unexpected: 0`
     - `duration: 3893.029 ms`
     - Source: `tests/artifacts/test-results/results.json`

4. Policy gate:
   - Command: `npm run policy:check`
   - Result: `Policy check passed`

