# CS-003a Telnyx Adapter Boundary Remediation (Guardrailed Spec)

## A. Outcome

Telnyx is fully isolated behind the provider-neutral telephony interface, and no provider-specific imports, field handling, deferred lifecycle gaps, or missing provider error classification remain above the infrastructure boundary.

This issue is a blocking remediation issue created from CS-003 architectural verification findings.

## B. Scope

This issue remediates the following verified deviations from CS-003:

1. direct Telnyx import still exists in `providerRegistry.ts`
2. app-layer Telnyx-specific field handling still exists in `connectshyft.ts`
3. `endCall` is still deferred
4. retryable vs non-retryable provider error classification is not implemented

This issue includes:

- refactoring provider registry to remove direct Telnyx dependency leakage
- normalizing app-facing provider outputs so app services no longer handle Telnyx-specific fields
- implementing `endCall` through the provider-neutral telephony interface
- implementing provider error classification sufficient to distinguish retryable vs non-retryable failures without leaking raw Telnyx semantics above infrastructure

## Governing Execution Contract

This issue is governed by:

- `/specs/connectshyft-recovery/developer_execution_packet.md`
- `/specs/connectshyft-recovery/ADR-00X_Communication_Infrastructure_Contract.md`
- `/specs/connectshyft-recovery/Canonical_Data_Model_Note_Communication_Infrastructure.md`

This remediation also responds directly to:

- CS-003 architectural verification findings
- PR #219 verification results

If implementation details conflict with the ADR or canonical data model note, those documents take precedence.

## C. Non-Goals

- no bridge orchestration redesign
- no UI redesign
- no reliability subsystem implementation beyond the provider classification hook required here
- no audit subsystem redesign
- no provider failover strategy
- no unrelated repo cleanup

## D. Implementation Guardrails

1. No Telnyx import may remain outside `/infrastructure/communications/telnyx`.
2. No app-layer service may interpret Telnyx-specific response fields directly.
3. App and domain layers must consume normalized provider-neutral outputs only.
4. `endCall` must be implemented through the telephony provider interface, not as a Telnyx-only app-layer call.
5. Provider error classification must distinguish retryable vs non-retryable failures, but classification output must be normalized and provider-neutral above the infrastructure layer.
6. This issue must not move domain boundaries or pull provider logic into `/apps`.
7. All persistence and service behavior must conform to ADR-00X and the Canonical Data Model Note.
8. No bridge-specific remediation should be bundled here unless required to remove direct fallout from these adapter leaks.

## E. Verified Blocking Findings

The following findings are blocking and must all be resolved before this issue is considered complete:

### 1. Direct Telnyx import in provider registry

Current state:

- direct Telnyx import exists in `providerRegistry.ts`

Required fix:

- provider registry must depend on provider-neutral interface/factory boundaries only
- Telnyx construction/wiring must remain isolated under infrastructure

### 2. App-layer Telnyx-specific field handling

Current state:

- Telnyx-specific field handling exists in `connectshyft.ts`

Required fix:

- normalize provider response shape before app-layer consumption
- app services must no longer know Telnyx-specific field names or payload semantics

### 3. Deferred `endCall`

Current state:

- `endCall` is deferred

Required fix:

- implement `endCall` on the provider-neutral telephony contract
- implement Telnyx-backed adapter support for it
- ensure upstream code depends on the interface, not Telnyx directly

### 4. Missing retryable/non-retryable provider error classification

Current state:

- provider errors are not yet classified

Required fix:

- introduce normalized provider error classification output
- support at minimum:
  - auth/configuration failure
  - rate limiting / temporary provider failure
  - invalid request / non-retryable failure
  - unknown provider failure
- classification must be usable by CS-005 without redesigning CS-003 again

## F. Acceptance Criteria

### Adapter Boundary

- no Telnyx import remains outside `/infrastructure/communications/telnyx`
- provider registry no longer depends directly on Telnyx

### App Boundary

- no Telnyx-specific field handling remains in app-layer services
- app-layer services consume normalized provider-neutral result objects only

### Lifecycle Completeness

- `endCall` exists on the telephony provider interface
- Telnyx adapter implements `endCall`
- upstream callers can terminate calls without provider-specific logic

### Error Classification

- provider failures are classified into normalized internal categories
- retryable vs non-retryable distinction exists
- raw Telnyx error semantics do not leak above infrastructure

### Regression Safety

- existing CS-003 tests still pass
- any affected CS-004 integrations still build and pass relevant focused tests

## G. Evidence Required in PR

- diff or proof showing removal of Telnyx imports outside infrastructure
- proof that app-layer Telnyx field handling has been removed
- tests covering `endCall`
- tests covering provider error classification
- updated architectural verification note or follow-up verification summary
- explicit note of any downstream CS-004 impact discovered during remediation

## H. Definition of Done

This issue is done when all four verified deviations are resolved and the adapter boundary is clean enough that CS-004 can be re-verified against it without ambiguity.

## I. ADR Compliance Check

Before merging, confirm:

- [ ] No Telnyx import exists outside infrastructure
- [ ] No app-layer Telnyx field handling remains
- [ ] `endCall` implemented via provider-neutral interface
- [ ] Retryable vs non-retryable provider classification implemented
- [ ] No new provider leakage introduced into bridge or app layers
