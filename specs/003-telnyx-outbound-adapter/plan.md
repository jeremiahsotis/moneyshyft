# Implementation Plan: CS-003 Telnyx Outbound Adapter

**Branch**: `003-telnyx-outbound-adapter` | **Date**: 2026-03-11 | **Spec**: [spec.md](/Users/jeremiahotis/projects/connectshyft/specs/003-telnyx-outbound-adapter/spec.md)  
**Input**: Feature specification from `/specs/003-telnyx-outbound-adapter/spec.md`

## Summary

Implement CS-003 by introducing a shared provider-neutral telephony contract under `domains/communication/telephony`, replacing the Telnyx stub in `infrastructure/communications/telnyx` with a real outbound SMS and outbound call-initiation adapter, and refactoring ConnectShyft provider resolution so lane code continues to own rollout/policy behavior without owning Telnyx request shapes. The design is intentionally limited to outbound SMS and outbound voice initiation; bridge-session orchestration remains deferred to CS-004, while existing provider correlation and webhook receipt persistence stay in place as the current shared-Postgres-compatible equivalents of canonical provider-reference and webhook-receipt entities.

## Technical Context

**Language/Version**: TypeScript (ES2022) on Node.js >=20  
**Primary Dependencies**: Express, Knex, pg, Jest/ts-jest, root shared communication domain source under `domains/communication`, root infrastructure adapter source under `infrastructure/communications`, existing ConnectShyft provider registry and outbound route contracts  
**Storage**: Shared PostgreSQL; current ConnectShyft provider correlation and webhook receipt tables (`connectshyft.cs_provider_identifier_mappings`, `connectshyft.cs_webhook_receipts`) remain the CS-003 persistence equivalents for provider references and replay-safe receipts  
**Testing**: Jest unit/integration coverage in `apps/connectshyft-api/src/**/__tests__`, shared-domain and infrastructure adapter tests, TypeScript build validation, and documented Telnyx sandbox verification steps  
**Target Platform**: Linux-hosted Shyft monorepo with host-managed Nginx, Dockerized lane APIs, static lane frontends, and shared Postgres  
**Project Type**: Monolithic Nx web application with shared domain modules, shared infrastructure modules, and lane API consumers  
**Performance Goals**: Constant-time provider resolution, no additional route/deployment hops, truthful outbound dispatch within existing ConnectShyft request latency envelopes, and no duplicate provider side effects for idempotent retries  
**Constraints**: No provider-specific logic under `apps/`, no UI redesign, no bridge-session orchestration in CS-003, preserve admin route delegation and deployment topology, keep production migration ownership with `admin-api`, require `TELNYX_API_KEY`, preserve webhook verification compatibility, and avoid schema shortcuts that would block later canonical communication entities  
**Scale/Scope**: CS-003 only; shared telephony contract, Telnyx outbound adapter, ConnectShyft API adoption for outbound message and call initiation, adapter documentation, and sandbox verification path

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial Gate Review**

- Platform shell authority preserved: PASS. CS-003 changes are limited to shared communication/infrastructure code and `connectshyft-api`; `admin-web` and `admin-api` remain the shell/auth authority.
- Lane isolation preserved: PASS. The feature adds a shared telephony contract and infrastructure adapter but no new lane-to-lane service calls or frontend ownership drift.
- Routing delegation preserved: PASS. Existing ConnectShyft thread outbound routes remain lane-owned by `connectshyft-api`; `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain delegated to `admin-api`.
- Deployment topology preserved: PASS. No Nginx, public-port, or container-topology changes are required for the adapter boundary.
- Database ownership preserved: PASS. CS-003 reuses shared-Postgres-compatible ConnectShyft provider correlation/webhook receipt persistence and does not change `admin-api` production migration ownership.
- Security boundaries preserved: PASS. No public API exposure or cookie-scope changes are introduced.
- Workflow compliance: CONDITIONAL. This plan is traceable to CS-003 and the recovery ADR, but the generated tasks must carry explicit routing, port, shared-Postgres, and runbook validation work.
- Acceptance criteria present: CONDITIONAL. CS-003 acceptance is concrete for outbound SMS/call initiation and adapter boundaries, but tasks must preserve explicit deploy/routing/database validation evidence for all lanes.

**Post-Design Re-check**

- Platform shell authority preserved: PASS. The design stays below the shell/auth boundary and does not move frontend ownership.
- Lane isolation preserved: PASS. Domain and infrastructure boundaries are explicit and lane APIs continue to call shared contracts rather than each other.
- Routing delegation preserved: PASS. The design keeps the current outbound routes in `connectshyft-api` and does not add new admin-owned or public routes.
- Deployment topology preserved: PASS. The design requires code-level and env-level changes only.
- Database ownership preserved: PASS. The design reuses current shared-Postgres-compatible persistence and documents bridge-session persistence as deferred to CS-004 rather than invented ad hoc in CS-003.
- Security boundaries preserved: PASS. Telnyx credentials remain server-side only and ingress stays Nginx-only.
- Workflow compliance: CONDITIONAL. The feature artifacts are aligned to CS-003, but explicit implementation tasks still need to carry the constitution-required no-regression validation work.
- Acceptance criteria present: CONDITIONAL. Feature acceptance and sandbox evidence are concrete; cross-lane deploy/routing/shared-DB validation must remain explicit in tasks and final execution evidence.

## Project Structure

### Documentation (this feature)

```text
specs/003-telnyx-outbound-adapter/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── connectshyft-outbound-dispatch.md
│   └── telephony-provider-interface.md
└── tasks.md
```

### Source Code (repository root)

```text
domains/
└── communication/
    ├── index.ts
    ├── phone/
    └── telephony/
        ├── index.ts
        └── __tests__/

infrastructure/
└── communications/
    ├── README.md
    ├── telnyx/
    │   ├── index.ts
    │   └── __tests__/
    └── webhooks/

apps/
└── connectshyft-api/
    ├── src/
    │   ├── modules/
    │   │   └── connectshyft/
    │   │       ├── providerRegistry.ts
    │   │       ├── providerCorrelationMappings.ts
    │   │       └── __tests__/
    │   └── routes/
    │       └── api/
    │           └── v1/
    │               └── connectshyft.ts
    ├── package.json
    └── tsconfig.json
```

**Structure Decision**: Keep the provider-neutral telephony contract in the root shared communication domain, keep Telnyx implementation in root infrastructure, and limit `apps/connectshyft-api` to provider resolution, request policy enforcement, and route integration. This preserves the ADR boundary while keeping CS-003 scoped to the existing ConnectShyft outbound entrypoints instead of introducing new app-local abstractions.

## Complexity Tracking

No constitution violations are required for CS-003. This section is intentionally empty.
