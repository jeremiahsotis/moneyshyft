# Story 3.1: Core ConnectShyft Thread Schema and Lifecycle Constraints

Status: ready-for-dev

## Story

As a backend engineer,  
I want core ConnectShyft thread tables and indexes created with canonical constraints,  
so that thread lifecycle behavior is enforced at the persistence layer.

## Acceptance Criteria

1. Given ConnectShyft lifecycle migrations are applied, when thread entities are created or updated, then canonical state enum `UNCLAIMED | CLAIMED | CLOSED` and required metadata fields are present.
2. Given concurrent lifecycle operations, when active-thread uniqueness rules are evaluated, then partial unique constraints enforce one active thread per `(tenant_id, org_unit_id, neighbor_id)`.
3. Given scheduler queries run, when due-thread scans execute, then scheduler indexes support performant deterministic evaluation.

## Tasks / Subtasks

- [ ] Add/verify `connectshyft.cs_threads` schema fields including escalation and number metadata.
- [ ] Add partial unique active-thread index `(tenant_id, org_unit_id, neighbor_id)` where `state != 'CLOSED'`.
- [ ] Add due-evaluation index for escalation scans.
- [ ] Add migration tests and constraint behavior tests.
- [ ] Verify schema aligns with hour-based escalation baseline contract (`X` default 24, range 1-24 integer hours).

## Dev Notes

- Story is a dependency-root story and may start immediately.
- Keep migration strategy additive-first and ConnectShyft schema-scoped.
- Do not introduce non-canonical thread states.

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

- _bmad-output/implementation-artifacts/3-1-core-connectshyft-thread-schema-and-lifecycle-constraints.md
