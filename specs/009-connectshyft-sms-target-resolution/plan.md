# Implementation Plan: ConnectShyft SMS Target Resolution in the Current Runtime Host

**Branch**: `009-connectshyft-sms-target-resolution` | **Date**: 2026-03-14 | **Spec**: [/Users/jeremiahotis/projects/connectshyft/specs/009-connectshyft-sms-target-resolution/spec.md](/Users/jeremiahotis/projects/connectshyft/specs/009-connectshyft-sms-target-resolution/spec.md)
**Input**: Feature specification from `/specs/009-connectshyft-sms-target-resolution/spec.md`

**Note**: The repo setup script resolves spec directories by numeric prefix and collides with an existing `009` directory, so the workflow used `SPECIFY_FEATURE=009-connectshyft-sms-target-resolution` to keep the requested feature artifacts together under `/specs/009-connectshyft-sms-target-resolution/`.

## Summary

Patch the current ConnectShyft runtime host in `apps/moneyshyft-api` so outbound thread-message dispatch resolves an SMS target deterministically before provider dispatch, refuses when `prefers_texting` is not `YES` or when neighbor phone selection is ambiguous, preserves explicit target precedence without redesigning provider adapters, and stops hard-coding reconstructed outbound thread state to `source: 'VOICE'` by using the actual outbound communication method for the dispatch.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20  
**Primary Dependencies**: Express, Knex, pg, Jest, Supertest, existing ConnectShyft runtime modules under `apps/moneyshyft-api/src/modules/connectshyft`  
**Storage**: Shared PostgreSQL, primarily `connectshyft.cs_threads`, `connectshyft.cs_neighbors`, `connectshyft.cs_neighbor_phones`, plus existing lifecycle/event metadata surfaces already used by the runtime  
**Testing**: Jest module tests, Supertest route tests, manual API/runtime verification for outbound thread sends  
**Target Platform**: Dockerized Node API behind host-managed Nginx in the current MoneyShyft-hosted ConnectShyft runtime  
**Project Type**: Backend web-service feature inside a lane-specific full-stack application  
**Performance Goals**: Preserve current outbound message dispatch flow and latency shape; no new provider hops or cross-service calls  
**Constraints**: Surgical patch in `apps/moneyshyft-api`, no lane-convergence refactor, no move into `apps/connectshyft-api`, no provider adapter redesign, explicit outbound target precedence must be preserved, automatic target resolution must be deterministic, outbound SMS requires `prefers_texting = YES`, reconstructed thread source must reflect the outbound communication method rather than a hard-coded `VOICE` default, current route ownership must remain unchanged, localhost-only API binding expectations must be preserved, shared PostgreSQL compatibility must be preserved, and the existing route-to-provider dispatch shape must remain intact  
**Scale/Scope**: One outbound thread-message route, one provider dispatch path, one linked-neighbor lookup path, one thread reconstruction path, and focused backend automated tests in the current ConnectShyft runtime host

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Platform shell authority preserved: PASS. No `admin-web` or `admin-api` ownership, shell, or auth changes are introduced.
- Lane isolation preserved: PASS. The plan remains inside the current `apps/moneyshyft-api` runtime host and its existing ConnectShyft module boundaries; no cross-lane service coupling is added.
- Routing delegation preserved: PASS. The work stays within the existing `/api/v1/connectshyft/*` route surface and does not alter auth or platform-admin delegation.
- Deployment topology preserved: PASS. No Docker, Nginx, port, hostname, or binding changes are required, and validation will explicitly check localhost-only binding expectations and existing route ownership.
- Database ownership preserved: PASS. The design uses the current shared Postgres runtime data already owned by the host and does not require migration-authority expansion to deliver deterministic dispatch behavior; validation will explicitly check shared PostgreSQL compatibility.
- Security boundaries preserved: PASS. No public ingress, cookie, session, or provider-secret boundary changes are introduced.
- Workflow compliance: PASS. This plan traces directly to the requested spec and produces research, data model, contracts, and quickstart artifacts for later task generation.
- Acceptance criteria present: PASS. The design covers explicit outbound target precedence, deterministic neighbor fallback, texting-permission refusal behavior, provider-boundary behavior, source fidelity, route ownership, shared DB compatibility, API binding and port validation, runbook verification, and regression checks without changing routing or deployment topology.

Post-design constitution re-check: PASS. The Phase 1 design remains inside the current runtime host, preserves lane isolation and topology, and avoids any provider-adapter or lane-convergence redesign.

## Project Structure

### Documentation (this feature)

```text
specs/009-connectshyft-sms-target-resolution/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── thread-message-dispatch.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/
└── moneyshyft-api/
    └── src/
        ├── routes/api/v1/connectshyft.ts
        ├── routes/api/v1/__tests__/connectshyft.provider-registry.guardrails.test.ts
        ├── modules/connectshyft/providerRegistry.ts
        ├── modules/connectshyft/neighbors.ts
        ├── modules/connectshyft/smsPreferenceOverrides.ts
        ├── modules/connectshyft/readContracts.ts
        ├── modules/connectshyft/threads.ts
        ├── modules/connectshyft/__tests__/readContracts.test.ts
        └── modules/connectshyft/__tests__/smsPreferenceOverrides.test.ts

architecture/
└── connectshyft/
    ├── runtime-host-reality-contract.md
    ├── sms-target-resolution-architecture.md
    ├── refusal-and-dispatch-requirements.md
    └── neighbor-texting-preference-contract.md
```

**Structure Decision**: Keep all runtime logic in `apps/moneyshyft-api`, add only route-local and existing-module-local seams needed for deterministic SMS target resolution and source fidelity, and leave `apps/connectshyft-api` untouched.

## Implementation Phases

1. Add a current-host SMS target resolution seam in the outbound thread-message route that operates before SMS preference gating and provider dispatch.
2. Read linked neighbor phone state deterministically from the current runtime host and classify pre-provider failures as explicit business refusals.
3. Preserve thread communication source fidelity by carrying the stored or action-derived method through the reconstructed thread object returned by outbound dispatch.
4. Verify behavior with route-level and module-level tests covering explicit outbound target precedence, deterministic fallback, refusal codes, and source fidelity.
5. Validate constitution-required routing ownership, localhost-only binding, shared PostgreSQL compatibility, deployment runbook coverage, and route-to-provider dispatch-shape preservation.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
