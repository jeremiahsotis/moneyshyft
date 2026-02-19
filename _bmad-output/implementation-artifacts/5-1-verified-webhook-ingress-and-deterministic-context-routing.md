# Story 5.1: Verified Webhook Ingress and Deterministic Context Routing

Status: ready-for-dev

## Story

As a platform operator,  
I want every inbound webhook verified and mapped to the correct tenant/orgUnit via number mapping,  
so that spoofed or misrouted events cannot create operational artifacts.

## Acceptance Criteria

1. Given Twilio webhook requests reach ConnectShyft endpoints, when signature validation runs, then only valid signed requests are processed.
2. Given accepted webhook payloads, when number mapping resolution runs, then each event resolves deterministic `(tenant_id, org_unit_id)` context before downstream handling.
3. Given invalid signatures or unresolved mappings, when processing is attempted, then requests are refused with no domain writes.

## Tasks / Subtasks

- [ ] Implement/verify Twilio signature validation middleware on ConnectShyft webhook routes.
- [ ] Implement deterministic `(tenant_id, org_unit_id)` mapping resolution from configured numbers.
- [ ] Add refusal/error handling for invalid signature and unresolved mapping paths.
- [ ] Add tests for valid/invalid signature and deterministic routing behavior.

## Dev Notes

- Story is a dependency-root story and may start immediately.
- Maintain replay-safe foundations compatible with Story 5.5 follow-on work.
- Keep all logic ConnectShyft-scoped; no cross-module direct imports.

## References

- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md
- /Users/jeremiahotis/moneyshyft/_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Story file generated from approved ConnectShyft epic baseline.

### File List

- _bmad-output/implementation-artifacts/5-1-verified-webhook-ingress-and-deterministic-context-routing.md
