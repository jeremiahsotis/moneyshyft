# Story 1.2: Create signshyft-api skeleton with required plugins

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a SignShyft platform engineer,
I want a Fastify TypeScript API skeleton with the required plugin chain,
so that all downstream SignShyft stories inherit canonical tenancy, refusal, and request-context behavior.

## Acceptance Criteria

1. Fastify TypeScript API boots successfully and exposes `GET /public/health` with `{"ok": true}`.
2. Plugin chain is registered in canonical order with explicit modules for tenant, auth, refusal, RLS context, rate limit, storage, and webhooks.
3. Refusal plugin exposes canonical business refusal helper that returns HTTP 200 with `{ "success": false, "reason": "<REASON>" }`.
4. Request lifecycle initializes DB session context contract (`SET LOCAL app.tenant_id`, `app.actor_role`, `app.actor_id`) before tenant-scoped DB operations.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: API refusal semantics and tenant context setup must be deterministic so staff/signer UIs can render reliable recovery behavior.
- Real-User Validation Evidence: N/A (pre-implementation story context)
- Real-User Validation Result: n/a
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story establishes platform middleware and refusal contracts, not role administration UX.

## Tasks / Subtasks

- [ ] Scaffold `apps/signshyft-api` with strict TypeScript Fastify bootstrap (AC: 1)
  - [ ] Add `src/server.ts` startup with graceful shutdown and typed Fastify instance.
  - [ ] Add `src/env.ts` for explicit env parsing (`NODE_ENV`, `PORT`, storage root, DB DSN, webhook worker settings).
- [ ] Implement minimal public route surface (AC: 1)
  - [ ] Add `src/routes/public/health.ts` with `GET /public/health`.
  - [ ] Add route registration bootstrap for public/staff/signer route groups.
- [ ] Implement required plugin chain in canonical order (AC: 2, 4)
  - [ ] `plugins/tenant.ts` resolves tenant from Host header plus JWT tenant-claim consistency.
  - [ ] `plugins/auth.ts` establishes staff/signer auth context decorators.
  - [ ] `plugins/refusal.ts` provides shared refusal serializer helpers.
  - [ ] `plugins/rls.ts` initializes DB transaction/session-local context values for tenant-scoped execution.
  - [ ] `plugins/rateLimit.ts` sets baseline protection for signer access routes.
  - [ ] `plugins/storage.ts` configures local-disk object operations under `/var/lib/signshyft`.
  - [ ] `plugins/webhooks.ts` sets endpoint and queue wiring decorators (no full delivery logic yet).
- [ ] Enforce refusal contract behavior (AC: 3)
  - [ ] Add helper(s) for canonical refusal payload shape.
  - [ ] Guard against accidental 4xx/5xx usage for business refusals.
- [ ] Add contract and bootstrap tests (AC: 1, 2, 3, 4)
  - [ ] Health route test.
  - [ ] Plugin registration/order assertions.
  - [ ] Refusal helper contract test (`HTTP 200 + success=false + reason`).
  - [ ] DB session-context initialization test for tenant-scoped requests.
- [ ] Lane and policy verification (cross-cutting)
  - [ ] Ensure story branch/workflow guard passes for story key `1-2-create-signshyft-api-skeleton-with-required-plugins`.
  - [ ] Ensure no RouteShyft/ConnectShyft artifacts are modified.

## Dev Notes

### Story Intent

Build the canonical SignShyft API foundation so all subsequent stories reuse one deterministic middleware and refusal contract path.

### Technical Requirements

- Tenant identity is derived from Host + JWT tenant claim; never from query/body.
- Business refusals must always be HTTP 200 with canonical refusal payload.
- Render/storage/webhook plugin stubs must exist now to prevent ad-hoc wiring in later stories.
- DB session context keys (`app.tenant_id`, `app.actor_role`, `app.actor_id`) are required for RLS policies in the SignShyft schema.

### Architecture Compliance

- Respect hard RenderEngine boundary rule from constitution; no engine imports outside `apps/signshyft-api/src/render/engines/*`.
- Keep API code in `apps/signshyft-api/src/*`; do not mix with legacy `src/src/*` RouteShyft backend paths.
- Keep SignShyft lane implementation isolated from existing route/connect modules.

### Library / Framework Requirements

- Fastify 5.x baseline for SignShyft API.
- Plugin compatibility targets for Fastify 5.x:
  - `@fastify/cookie` 10.x line
  - `@fastify/jwt` 9.x line
  - `@fastify/rate-limit` 10.x line
  - `@fastify/multipart` 9.x line
- Node runtime must remain `>=20`.
- Use existing monorepo TypeScript/Jest conventions; no parallel test framework introduction.

### File Structure Requirements

- API app root: `apps/signshyft-api/`
- Required plugin files:
  - `apps/signshyft-api/src/plugins/tenant.ts`
  - `apps/signshyft-api/src/plugins/auth.ts`
  - `apps/signshyft-api/src/plugins/refusal.ts`
  - `apps/signshyft-api/src/plugins/rls.ts`
  - `apps/signshyft-api/src/plugins/rateLimit.ts`
  - `apps/signshyft-api/src/plugins/storage.ts`
  - `apps/signshyft-api/src/plugins/webhooks.ts`
- Required route bootstrap:
  - `apps/signshyft-api/src/routes/public/health.ts`

### Testing Requirements

- Unit tests for refusal helper serialization and plugin decorators.
- Integration tests for health endpoint and plugin chain boot.
- DB context tests verifying session variables are set before tenant-scoped queries.
- Negative tests ensuring business refusals do not leak as HTTP 4xx.

### Previous Story Intelligence

- Story 1.1 completed lane scaffolding and lane-policy wiring; preserve strict SignShyft artifact isolation.
- Do not rename lane keys or statuses introduced in `sprint-status-signshyft.yaml`.

### Git Intelligence Summary

- Recent commits are documentation/status transitions for Story 1.1 only; there is no existing SignShyft API implementation to preserve.
- Treat this as first executable SignShyft backend code introduction.

### Latest Tech Information (As of 2026-03-03)

- Fastify stable line is in v5 and should be treated as baseline for new SignShyft API scaffolding.
- Fastify ecosystem plugins publish explicit Fastify v5 compatibility matrices; choose matching major lines before implementation.
- Rate-limit and multipart plugin release trains have active 2026 updates; avoid pinning stale major versions from Fastify v4-era examples.

### Project Context Reference

- Existing repo runs legacy Express backend and Vue frontend; SignShyft is a new lane and must remain additive.
- Global policy gate (`npm run policy:check`) and workflow branch guard are mandatory before merge.

### Project Structure Notes

- The `apps/` folder does not currently exist in this repository; this story is expected to create it.
- Keep SignShyft APIs under `/api` reverse-proxy assumptions defined in deployment docs; avoid routing collisions with existing backend.

### References

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/epics-signshyft-2026-03-03.md` (Epic 1, Story 1.2)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/architecture-signshyft-2026-03-03.md` (AD-SS-02, AD-SS-03)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/prd-signshyft-2026-03-03.md` (FR-SS-001..005, NFR-SS-001..002)]
- [Source: `/Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/01_SignShyft_Constitution.md`]
- [Source: `/Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/02_Concrete_Folder_Structure.md`]
- [Source: `/Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/13_OpenAPI.yaml`]
- [Source: `/Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/20_DB_DDL_and_RLS.sql`]
- [External: `https://github.com/fastify/fastify/releases`]
- [External: `https://github.com/fastify/fastify-jwt`]
- [External: `https://github.com/fastify/fastify-cookie`]
- [External: `https://github.com/fastify/fastify-rate-limit`]
- [External: `https://github.com/fastify/fastify-multipart/releases`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context generated from SignShyft lane artifacts, implementation spec, OpenAPI contract, DDL/RLS contract, and recent repository history.

### Completion Notes List

- Story context prepared and marked `ready-for-dev`.
- No product code implementation was performed in this create-story step.

### File List

- _bmad-output/implementation-artifacts/1-2-create-signshyft-api-skeleton-with-required-plugins.md
- _bmad-output/implementation-artifacts/sprint-status-signshyft.yaml
