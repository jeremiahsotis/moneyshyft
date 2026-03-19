# PR 026 — Sender Number Architecture

## Summary

Centralizes sender-number selection for ConnectShyft so every SMS sender decision, and future voice sender decision, is resolved from the same tenant-scoped thread context. This removes synthetic sender identifiers, removes thread or neighbor fallback sender logic, and keeps sender identity stable per thread.

## Changes

- Introduced a single `resolveSenderNumber({ tenantId, orgUnitId, threadId, channel })` contract for sender-number selection.
- Routed sender selection through tenant-scoped number mappings and returned `providerNumberE164`, optional `mappingId`, and routing metadata.
- Removed sender-selection behavior that depended on synthetic identifiers, `sms-inbound:*` or `sms-outbound:*` persistence, synthetic thread derivation, or neighbor/thread fallback logic.
- Normalized thread persistence and read-contract displays so sender alignment is stored and surfaced as mapped provider numbers.
- Aligned inbound and outbound routing expectations so the same thread keeps the same sender number.
- Enforced deterministic refusal when no unique mapping is available and carried routing metadata into audit and idempotency summaries.

## Why

Stable sender identity is required for conversational continuity, safe routing, and tenant isolation. The existing behavior can derive sender identity indirectly or switch numbers based on fallback conditions, which makes replies and audits unreliable.

## Testing

- `npm run policy:check`
- `bash scripts/verify-connectshyft-route-ownership.sh`
- `bash scripts/lint-or-discovery.sh`
- `bash scripts/ci-run-playwright-stack.sh bash scripts/backend-jest-ci.sh`
- `bash scripts/ci-run-playwright-stack.sh bash scripts/test-changed.sh origin/codex/dev`
- `bash scripts/ci-run-playwright-stack.sh bash scripts/burn-in.sh 3 origin/codex/dev`
- `bash scripts/quality-gates.sh`
- `cd apps/connectshyft-api && npm run build`
- 3 backend CI-equivalent burn-in iterations using `bash scripts/ci-run-playwright-stack.sh bash scripts/backend-jest-ci.sh`

## Risks

- Existing threads that relied on implicit fallback behavior may now refuse dispatch until valid mappings are configured.
- Inbound routing can surface hidden mapping ambiguity that was previously masked by guess-based behavior.
- Operational teams will need clear routing metadata to diagnose refusal outcomes quickly.

## Rollback

- Revert the centralized sender-resolution feature as one unit if necessary.
- Do not reintroduce synthetic sender identifiers, neighbor/thread-based sender selection, or alternate fallback sender assignment as a rollback shortcut.
