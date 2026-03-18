# Implementation Plan: CS-004 Call Bridge Flow

**Branch**: `004-cs-004-call-bridge-flow` | **Date**: 2026-03-11 | **Spec**: [spec.md](/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/cs-004-call-bridge-flow/spec.md)  
**Input**: Feature specification from `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/cs-004-call-bridge-flow/spec.md`  
**Source Input**: `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/CS-004_Call_Bridge_Guardrailed_Spec.md`

## Summary

Implement CS-004 by turning ConnectShyft call initiation into persisted bridge-session orchestration owned by `domains/communication/bridge`, backed by durable bridge session and bridge leg persistence, integrated into `connectshyft-api` thread call and webhook flows, and executed through provider-neutral telephony interfaces with Telnyx bridge control isolated in infrastructure. The design intentionally reuses existing provider-correlation and webhook-receipt primitives for event replay and correlation, but it does not expand into the full CS-005 reliability, idempotency, or audit epic.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20  
**Primary Dependencies**: Express, Knex, pg, Jest/ts-jest, shared communication domain modules under `domains/communication`, shared provider infrastructure under `infrastructure/communications`, existing ConnectShyft route, provider registry, provider correlation, and webhook receipt modules  
**Storage**: Shared PostgreSQL using persisted `bridge_session` and `bridge_leg` records in the `connectshyft` schema, plus existing `connectshyft.cs_provider_identifier_mappings` and unchanged `connectshyft.cs_webhook_receipts`. Webhook receipts remain the ingress deduplication layer; bridge-domain replay tolerance suppresses duplicate or out-of-order translated events after aggregate rehydration.  
**Testing**: Jest unit and integration coverage in the bridge domain, ConnectShyft module tests, route and webhook tests, infrastructure adapter tests, and TypeScript build validation  
**Target Platform**: Linux-hosted Shyft Nx monorepo with host-managed Nginx, Dockerized APIs, static frontends, and shared Postgres  
**Project Type**: Monolithic Nx web application with shared domain modules, shared infrastructure adapters, and lane API consumers  
**Performance Goals**: Duplicate translated or replayed provider events MUST NOT trigger more than one neighbor-dial or bridge-control side effect for the same session transition, and bridge state MUST remain reload-safe from persisted storage.  
**Minimum Persisted Fields**: `bridge_session(id, thread_id, state, failure_code, failure_message, created_at, updated_at, completed_at, failed_at)` and `bridge_leg(id, bridge_session_id, role, state, provider_call_id, started_at, answered_at, completed_at, failed_at)`  
**Constraints**: No provider-specific logic under `apps/`, no UI redesign, no architecture redesign outside the ADR, no moving domain boundaries, no bridge orchestration in frontend state, no full reliability epic expansion, no audit ledger, retry worker, reconciliation backfill, or webhook-receipt schema changes in CS-004, and no raw Telnyx types above infrastructure  
**Scale/Scope**: CS-004 only; one call action route, bridge domain orchestration, bridge persistence, webhook-driven progression, Telnyx bridge control, and targeted test coverage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial Gate Review**

- Platform shell authority preserved: PASS. CS-004 changes are limited to shared communication logic, shared infrastructure, and `connectshyft-api`; `admin-web` and `admin-api` remain shell/auth owners.
- Lane isolation preserved: PASS. The design keeps call orchestration in shared communication code and ConnectShyft lane APIs without introducing cross-lane service coupling.
- Routing delegation preserved: PASS. The existing ConnectShyft lane route for thread calls stays lane-owned, and `/api/v1/auth/*` plus `/api/v1/platform/admin/*` remain delegated to `admin-api`.
- Deployment topology preserved: PASS. No Nginx, container, or public-port topology changes are required.
- Database ownership preserved: CONDITIONAL. CS-004 requires new shared-Postgres persistence for bridge sessions and legs, but the plan preserves centralized production migration authority and avoids schema forks outside the shared model.
- Security boundaries preserved: PASS. Telnyx credentials remain server-side only, ingress stays Nginx-only, and no public API surface is added.
- Workflow compliance: PASS. This plan, research, data model, quickstart, and contracts are generated for the CS-004 issue scope and remain traceable to the governing ADR and data model note.
- Acceptance criteria present: CONDITIONAL. Feature acceptance is concrete, but implementation tasks must still carry route, persistence, webhook, and no-regression validation evidence.

**Post-Design Re-check**

- Platform shell authority preserved: PASS. No shell/auth ownership moved during design.
- Lane isolation preserved: PASS. Bridge orchestration remains in `domains/communication`, and provider control remains in `infrastructure/communications`.
- Routing delegation preserved: PASS. The design evolves ConnectShyft lane-owned call/webhook behavior without changing admin-owned routes.
- Deployment topology preserved: PASS. The solution is code and schema only.
- Database ownership preserved: PASS. The design adds bridge persistence compatible with the shared Postgres model and keeps centralized production migration execution intact.
- Security boundaries preserved: PASS. Provider secrets and raw provider payload handling remain server-side and infrastructure-scoped.
- Workflow compliance: PASS. The plan produces the expected planning artifacts and preserves a tasks-driven follow-on path.
- Acceptance criteria present: PASS. The design specifies start, progression, bridge control, failure, completion, persistence, and replay-safety checks.

## Project Structure

### Documentation (this feature)

```text
specs/connectshyft-recovery/issues/cs-004-call-bridge-flow/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── bridge-domain-service.md
    ├── connectshyft-call-route.md
    └── telephony-bridge-provider-interface.md
```

### Source Code (repository root)

```text
domains/
└── communication/
    ├── index.ts
    ├── telephony/
    │   └── index.ts
    └── bridge/
        ├── bridgeSessionTypes.ts
        ├── bridgeStateMachine.ts
        ├── startBridgeSession.ts
        ├── handleProviderBridgeEvent.ts
        ├── index.ts
        └── __tests__/

infrastructure/
└── communications/
    ├── telnyx/
    │   ├── index.ts
    │   └── __tests__/
    └── webhooks/

apps/
└── connectshyft-api/
    └── src/
        ├── migrations/
        ├── modules/
        │   └── connectshyft/
        │       ├── bridgeSessions.ts
        │       ├── providerCorrelationMappings.ts
        │       ├── providerRegistry.ts
        │       └── __tests__/
        └── routes/
            └── api/
                └── v1/
                    ├── connectshyft.ts
                    └── __tests__/
```

**Structure Decision**: Keep bridge lifecycle rules in `domains/communication/bridge`, keep provider control and bridge call execution in `infrastructure/communications/telnyx`, and let `apps/connectshyft-api` own only ConnectShyft thread-action routing, persistence adapters, and webhook integration. This preserves the ADR boundary while still allowing CS-004 to replace the current single-leg direct dispatch path.

## Complexity Tracking

No constitution violations are required for CS-004. This section is intentionally empty.
