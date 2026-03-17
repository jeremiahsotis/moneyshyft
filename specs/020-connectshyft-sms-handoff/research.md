# Research: ConnectShyft SMS Dispatch Handoff

No open clarification markers remained after loading the `020` spec, inspecting the live ConnectShyft runtime, and applying the Step 2 route-guard and instrumentation guidance. The decisions below control implementation.

## Decision 1: The route owns the non-null SMS dispatch invariant

- **Decision**: Enforce the dispatch-ready `targetPhone` invariant inside `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`, in `performOutboundAction`, through a route-local helper that normalizes the resolved target and refuses before provider dispatch when the value is missing or non-dispatchable.
- **Rationale**: The spec makes `performOutboundAction` the owner of the pre-dispatch invariant. This is also the narrowest place to prevent missing-target conditions from surfacing as provider failures.
- **Alternatives considered**:
  - Rely on the Telnyx adapter assertion alone: rejected because that preserves the wrong boundary ownership and the wrong operator-facing failure semantics.
  - Add the invariant in `providerRegistry.sendSms()`: rejected because the wrapper is explicitly required to remain a transparent pass-through.

## Decision 2: Reuse the existing SMS-target refusal family instead of inventing a new domain error contract

- **Decision**: The route guard will reuse the existing SMS-target refusal family and return `CONNECTSHYFT_SMS_TARGET_REQUIRED` with the current refusal envelope and target-resolution metadata shape when the route cannot hold a dispatch-ready target before SMS provider dispatch.
- **Rationale**: The operator-facing problem is still “no valid SMS target is available,” and reusing the established refusal family keeps the fix narrow, UI-compatible, and consistent with the resolver contract.
- **Alternatives considered**:
  - Introduce a new invariant-specific refusal code: rejected because it widens taxonomy and would require new UI semantics without changing operator actionability.
  - Rewrap the failure as `CONNECTSHYFT_PROVIDER_DISPATCH_FAILED`: rejected by the spec and architectural requirements.

## Decision 3: The permanent fix outside the route, if any, is limited to the first proven divergent boundary

- **Decision**: Slice 2 instrumentation will determine whether any permanent change is needed outside `connectshyft.ts`. If route, wrapper, and Telnyx entry logs all preserve the same target, no permanent wrapper or adapter change is allowed. If a first divergence is proven, only that first divergent boundary may be patched.
- **Rationale**: This keeps the implementation surgical while still allowing the composer success path to be restored if the actual loss occurs after the route.
- **Alternatives considered**:
  - Preemptively edit both `providerRegistry.ts` and `telnyx/index.ts`: rejected because it increases risk and violates the narrow-scope constraint.
  - Assume the bug is route-only based on likelihood: rejected because the spec still requires the success path to work, not just the failure semantics to improve.

## Decision 4: Temporary instrumentation stays at exactly six handoff points and is removed before closure

- **Decision**: Add temporary logs only at:
  1. after SMS target resolution,
  2. immediately before `adapter.sendSms()`,
  3. `providerRegistry.sendSms()` entry,
  4. Telnyx `sendSms()` entry,
  5. immediately before Telnyx payload dispatch,
  6. the Telnyx adapter `catch` path.
- **Rationale**: These are the validated proof points from the handoff materials. More logging would widen scope and make the final cleanup harder.
- **Alternatives considered**:
  - Add logs inside `buildSmsPayload()` or other helper layers: rejected because the user explicitly limited instrumentation to the validated handoff points.
  - Keep logs behind a permanent feature flag: rejected because the spec requires temporary, removable scaffolding rather than a new observability design.

## Decision 5: The invariant-refusal regression needs a route-local test seam, not a new shared module

- **Decision**: Export the route-local invariant helper with a `ForTests` alias from `connectshyft.ts`, similar to `resolveConnectShyftSmsTargetForTests`, so the invariant-refusal case can be tested directly.
- **Rationale**: A successful resolver does not naturally produce an empty target through the full route harness, so the failure path is otherwise difficult to drive without contrived runtime mutations or new shared code.
- **Alternatives considered**:
  - Create a new shared helper module: rejected because it widens ownership and is unnecessary for a single-route invariant.
  - Skip the invariant-refusal test and rely on success-path coverage: rejected because the spec explicitly requires regression coverage for the refusal path.

## Decision 6: Extend existing route, provider-registry, and Telnyx tests instead of adding new harnesses

- **Decision**: Add or tighten coverage in:
  - `apps/connectshyft-api/src/routes/api/v1/__tests__/connectshyft.outbound-dispatch.test.ts`
  - `apps/connectshyft-api/src/modules/connectshyft/__tests__/providerRegistry.test.ts`
  - `infrastructure/communications/telnyx/__tests__/index.test.ts`
- **Rationale**: These files already own the relevant route, wrapper, and adapter behavior. No frontend rewrite or new test framework is required for this feature.
- **Alternatives considered**:
  - Add new frontend tests for composer behavior: rejected because the composer request contract is intentionally unchanged and the fix is backend-boundary work.
  - Rely only on manual verification: rejected because the spec requires durable regression coverage.
