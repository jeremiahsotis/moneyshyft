# Implementation Plan: CS-005 Reliability / Idempotency / Audit

**Branch**: `005-reliability-idempotency-audit` | **Date**: 2026-03-12 | **Spec**: [spec.md](/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/spec.md)  
**Input**: Feature specification from `/Users/jeremiahotis/projects/connectshyft/specs/005-reliability-idempotency-audit/spec.md`  
**Source Input**: `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/CS-005_Reliability_Idempotency_Audit_Guardrailed_Spec.md`

## Summary

Add the minimum durable reliability layer for ConnectShyft outbound SMS, outbound call initiation, bridge-session creation, and provider webhook ingestion by persisting idempotency records before side effects, appending audit history for command and webhook outcomes, and recording bounded retry intent without redesigning bridge orchestration or the provider adapter boundary. The implementation will reuse the existing shared communication reliability/audit primitives, existing bridge-session persistence, and existing webhook receipt flow inside `apps/connectshyft-api`, extending them only where durable request safety and append-only audit evidence are still missing.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20  
**Primary Dependencies**: Express, Knex, `pg`, Jest, ts-jest, shared communication domain modules under `domains/communication`, ConnectShyft route/module services under `apps/connectshyft-api`, and repository boundary enforcement via `node scripts/enforce-workspace-boundaries.js`  
**Storage**: Shared PostgreSQL using existing ConnectShyft bridge-session, message, provider-correlation, and webhook-receipt tables plus new durable `communication_idempotency_record` and `communication_audit_log`-equivalent persistence and minimal retry metadata on reliability-owned records where required  
**Testing**: Targeted ConnectShyft route/module Jest suites, shared domain reliability/audit unit tests, `apps/connectshyft-api` build, and workspace boundary enforcement  
**Target Platform**: Linux-hosted Shyft Nx monorepo with ConnectShyft API running as a lane-specific Node/Express service behind host-managed Nginx  
**Project Type**: Monolithic Nx web application with lane-specific APIs/frontends plus shared domain and infrastructure packages  
**Performance Goals**: Exactly one outbound provider side effect occurs per idempotency scope for identical retries; duplicate webhook replays produce zero additional domain side effects; durability is achieved with indexed lookups and append-only writes rather than in-memory replay state  
**Constraints**: Minimal reliability hardening only. No bridge redesign, no provider adapter redesign, no UI changes, no broad schema redesign beyond minimal durable reliability persistence, no retry subsystem redesign, and no runtime changes outside ConnectShyft communication reliability and audit integration. Idempotency must happen before side effects, duplicate protection must happen before event application, audit must remain append-only, and retry logic must not bypass bridge or message domain rules.  
**Retry Execution Model**: CS-005 persists retry intent and exhausted state only. No worker, scheduler, automatic redial loop, or immediate provider re-dispatch cycle is introduced in this feature.  
**Scale/Scope**: ConnectShyft outbound mutation endpoints (`/threads/:threadId/messages`, `/threads/:threadId/call`), bridge-session initiation flow, provider webhook ingress, shared communication reliability/audit domain primitives, ConnectShyft persistence adapters, targeted migrations, and verification docs only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial Gate Review**

- Platform shell authority preserved: PASS. CS-005 changes ConnectShyft communication reliability only and does not alter `admin-web`/`admin-api` shell or auth authority.
- Lane isolation preserved: PASS. Telephony, bridge, and reliability work remains inside shared communication domain plus `connectshyft-api`; no implicit cross-lane service coupling is added.
- Routing delegation preserved: PASS. `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain delegated to `admin-api`; CS-005 only hardens lane-owned ConnectShyft communication routes and webhook ingress.
- Deployment topology preserved: PASS. Host-managed Nginx, localhost-only API bindings, Docker-hosted APIs, and static frontend serving remain unchanged.
- Database ownership preserved: PASS. Shared Postgres remains the storage model, and any new reliability migrations remain compatible with `admin-api` as the sole production migration owner.
- Security boundaries preserved: PASS. No public port exposure or ingress changes are introduced; provider webhook verification remains at infrastructure ingress.
- Workflow compliance: PASS. The numbered spec, plan, research, data model, contract, and quickstart artifacts derive directly from the CS-005 guardrailed spec and governing ADR/data model note.
- Acceptance criteria present: PASS. The design includes explicit verification for routing delegation, canonical ports, shared Postgres compatibility, reproducible runbook behavior, targeted ConnectShyft tests, and boundary enforcement.

**Post-Design Re-check**

- Platform shell authority preserved: PASS. The design leaves shell and auth ownership untouched.
- Lane isolation preserved: PASS. Domain/application/infrastructure responsibilities remain consistent with the ADR.
- Routing delegation preserved: PASS. Quickstart includes explicit no-topology-change validation for auth/admin delegation and lane-owned ConnectShyft routes.
- Deployment topology preserved: PASS. Quickstart includes explicit validation that canonical ports, localhost bindings, Docker topology, and static frontend serving remain unchanged.
- Database ownership preserved: PASS. Data model and quickstart explicitly preserve shared Postgres compatibility and `admin-api` production migration ownership.
- Security boundaries preserved: PASS. Webhook verification remains infrastructure-owned and no new public ingress is introduced.
- Workflow compliance: PASS. Research resolves design decisions, Phase 1 artifacts are generated, and the plan remains traceable to the numbered spec.
- Acceptance criteria present: PASS. The design defines measurable command-side, webhook-side, audit, build, and topology validation steps.

## Project Structure

### Documentation (this feature)

```text
specs/005-reliability-idempotency-audit/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── communication-reliability-contract.md
```

### Source Code (repository root)

```text
apps/
└── connectshyft-api/
    └── src/
        ├── migrations/
        │   └── 20260312120000_add_connectshyft_communication_reliability.ts
        ├── modules/
        │   └── connectshyft/
        │       ├── bridgeSessions.ts
        │       ├── communicationAuditLog.ts
        │       ├── communicationReliability.ts
        │       ├── providerCorrelationMappings.ts
        │       └── __tests__/
        │           ├── bridgeSessions.test.ts
        │           └── providerCorrelationMappings.test.ts
        └── routes/
            └── api/
                └── v1/
                    ├── connectshyft.ts
                    └── __tests__/
                        ├── connectshyft.bridge-flow.test.ts
                        └── connectshyft.outbound-dispatch.test.ts

domains/
└── communication/
    ├── audit/
    │   ├── auditTypes.ts
    │   ├── recordCommunicationAudit.ts
    │   └── __tests__/
    │       └── recordCommunicationAudit.test.ts
    ├── bridge/
    │   ├── handleProviderBridgeEvent.ts
    │   └── startBridgeSession.ts
    ├── reliability/
    │   ├── eventDeduper.ts
    │   ├── idempotencyService.ts
    │   ├── idempotencyTypes.ts
    │   ├── retryPolicy.ts
    │   └── __tests__/
    │       ├── eventDeduper.test.ts
    │       ├── idempotencyService.test.ts
    │       └── retryPolicy.test.ts
    └── telephony/
        └── __tests__/
            └── index.test.ts

infrastructure/
└── communications/
    ├── telnyx/
    │   └── index.ts
    └── webhooks/
```

**Structure Decision**: Keep reliability contracts and pure decision logic in `domains/communication`, keep provider translation and verification in `infrastructure/communications`, and wire durable persistence plus route/application orchestration in `apps/connectshyft-api`. This preserves provider neutrality and existing bridge state-machine ownership while limiting CS-005 to the minimum persistence and integration surfaces required for idempotency, replay safety, retry intent, and append-only audit.

**Boundary Validation Rule**: CS-005 route and module reliability code may consume only provider-neutral telephony results and provider-neutral webhook translation outputs. Any raw provider-field handling outside infrastructure is out of scope and invalid for this feature.

## Complexity Tracking

No constitution violations are required for CS-005. This section is intentionally empty.
