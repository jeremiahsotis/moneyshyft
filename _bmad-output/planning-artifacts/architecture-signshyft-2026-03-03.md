---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: architecture
project: SignShyft
project_lane: signshyft
author: Jeremiah
date: 2026-03-03
status: complete
inputDocuments:
  - /Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/prd-signshyft-2026-03-03.md
  - /Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/ux-design-specification-signshyft-2026-03-03.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/01_SignShyft_Constitution.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/02_Concrete_Folder_Structure.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/03_RenderEngine_Interface_and_Contract.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/12_Rendering_Determinism_Spec.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/13_OpenAPI.yaml
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/20_DB_DDL_and_RLS.sql
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/30_Deployment_Runbook.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/SignShyft_Webhook_Signing_Spec.md
---

# Architecture Decision Document - SignShyft

**Author:** Jeremiah  
**Date:** 2026-03-03  
**Status:** Complete

## 1. Context and Scope

SignShyft is a bounded e-signature module that must run in parallel with existing Shyft lanes without interference. The architecture is optimized for deterministic document rendering, legal artifact custody, and safe operation on a single 1GB droplet.

In scope:

1. Staff template/version lifecycle.
2. Signer workflows with token and OTP policy.
3. Deterministic preview/final rendering and finalization.
4. Canonical finalized PDF + audit/hash chain storage.
5. Signed outbound webhook integration (WordPress Phase A).

Out of scope:

1. Multi-node distributed processing.
2. Public template authoring.
3. Alternate storage backends in v1.

## 2. Fixed Constraints (Binding)

1. Tenant identity from Host header + JWT claim; never from body/query.
2. Business refusals use HTTP 200 + canonical refusal payload.
3. Published template versions are immutable.
4. PDF engine imports are restricted to `apps/signshyft-api/src/render/engines/*`.
5. Preview and final rendering share the same `layout.ts` logic.
6. Render concurrency fixed at 1.
7. Canonical finalized artifacts stored in SignShyft local storage.
8. V1 storage root is `/var/lib/signshyft` and not web-accessible.

## 3. High-Level Architecture

### 3.1 Runtime Components

1. `signshyft-api` (Fastify/TypeScript): HTTP API for staff and signer routes.
2. `signshyft-webhooks` worker: outbound webhook queue processing and retries.
3. Postgres schema `signshyft`: tenant-scoped persistence with RLS.
4. Local disk storage: templates, temp files, and finalized PDFs.
5. Nginx reverse proxy: TLS termination and `/api` proxy to API container.

### 3.2 Module Structure

Code placement follows the defined folder standard:

1. `apps/signshyft-api/src/plugins` for tenant/auth/refusal/rls/rate-limit/storage/webhook plugins.
2. `apps/signshyft-api/src/routes` for `public`, `staff`, and `signer` surfaces.
3. `apps/signshyft-api/src/services` for business orchestration.
4. `apps/signshyft-api/src/render` with strict engine boundary.
5. `apps/signshyft-api/src/workers/webhooks.ts` for queue execution.
6. `apps/signshyft-web` for SPA staff/signer frontends.

## 4. Canonical Architecture Decisions

### AD-SS-01: Bounded SignShyft Lane Isolation

Decision:

1. All planning artifacts and implementation outputs must declare `project_lane: signshyft`.
2. Artifact filenames must include `signshyft` token.
3. SignShyft has dedicated sprint status file and lane policy checks.

Rationale:

Prevents accidental planning or workflow collisions with RouteShyft and ConnectShyft lanes.

### AD-SS-02: Tenant Isolation via Context + RLS

Decision:

1. API sets `SET LOCAL app.tenant_id`, `app.actor_role`, and `app.actor_id` per request.
2. Database access relies on RLS policies scoped to current tenant and staff roles.

Rationale:

Creates defense-in-depth between API enforcement and data-layer enforcement.

### AD-SS-03: Refusal Envelope Contract

Decision:

1. Business-rule failures return HTTP 200 with `{success:false,reason,...}`.
2. Transport/auth/system failures remain non-200 as appropriate.

Rationale:

Stabilizes client integration semantics across staff UI and WordPress workflows.

### AD-SS-04: Template Version Immutability

Decision:

1. `PUBLISHED` versions are immutable.
2. Any change requires cloning to a new `DRAFT` version.

Rationale:

Preserves legal integrity and repeatability of historical final documents.

### AD-SS-05: RenderEngine Hard Boundary

Decision:

1. Only files under `render/engines/*` may import pdf engine implementation.
2. API/service layers consume only `RenderEngine` interface contract.

Rationale:

Prevents engine leakage and future-proofs adapter substitution.

### AD-SS-06: Preview/Final Parity via Shared Layout

Decision:

1. `renderPreview` and `renderFinal` both call shared `layout.ts` logic.
2. Duplicate line-break/measurement logic outside `layout.ts` is prohibited.

Rationale:

Eliminates drift between what users preview and what becomes legal final output.

### AD-SS-07: Deterministic Signature/Initials Rasterization

Decision:

1. Capture signature/initials as vector stroke data.
2. Rasterize deterministically at 300 DPI equivalent before embedding.
3. Same pipeline for signatures and initials.

Rationale:

Ensures reproducible outputs and stable legal rendering behavior.

### AD-SS-08: Finalization Invariants

Decision:

1. Finalization appends certificate page, flattens fields, computes sha256.
2. Canonical field payload hash is stored for provenance.
3. Hash chain entries include `prev_sha256` linkages.

Rationale:

Maintains provable artifact lineage and tamper-evident progression.

### AD-SS-09: Single-Worker Render Concurrency

Decision:

1. Render semaphore concurrency = 1.
2. Busy state returns `RENDER_BUSY` refusal.
3. Busy and failure outcomes must be audited.

Rationale:

Protects stability on 1GB host and prevents memory collapse.

### AD-SS-10: Signed Webhook Contract

Decision:

1. Outbound webhooks use required SignShyft headers and HMAC-SHA256 `v1` signature.
2. String-to-sign includes version/timestamp/deliveryId/rawBodySha256.
3. Retries preserve same `deliveryId`.

Rationale:

Provides deterministic verification and replay-safe behavior for WordPress receivers.

### AD-SS-11: Secret Rotation Strategy

Decision:

1. Endpoint secret storage uses base64 encoded values.
2. Dual-secret rotation supports overlap grace window.

Rationale:

Enables zero-downtime key rotation for active integrations.

### AD-SS-12: Storage Ownership and Retention

Decision:

1. SignShyft remains canonical store for finalized docs and audits.
2. Integrations store references/status only.
3. Retention defaults: finalized 7 years, drafts/tokens/otp 30 days.

Rationale:

Keeps legal artifact custody centralized and compliant.

## 5. Data Architecture

### 5.1 Core Tables

1. `templates`, `template_versions`
2. `envelopes`, `recipients`
3. `signer_tokens`, `otp_challenges`
4. `field_values`, `signature_strokes`
5. `audit_events`, `document_hashes`
6. `webhook_endpoints`, `webhook_deliveries`

### 5.2 Status Models

1. Envelope: `DRAFT|SENT|IN_PROGRESS|COMPLETED|VOIDED|EXPIRED|DECLINED|ERROR`
2. Recipient: `PENDING|VIEWED|OTP_VERIFIED|COMPLETED|DECLINED`
3. Template version: `DRAFT|PUBLISHED|DEPRECATED|ARCHIVED`

### 5.3 RLS Model

1. Every tenant-scoped table has RLS enabled.
2. Staff policies enforce tenant match + role membership.

## 6. API Architecture

### 6.1 Route Surfaces

1. Public: `/public/health`
2. Staff: `/staff/templates`, `/staff/template-versions/*`, `/staff/envelopes/*`, `/staff/webhooks/*`
3. Signer: `/signer/access/{token}`, `/signer/envelopes/{token}/*`

### 6.2 Contract Rules

1. Refusal payload schema is shared across staff/signer endpoints.
2. Envelope creation returns per-recipient signer links.
3. Resend endpoint rotates token and invalidates prior token.
4. Download endpoint is staff-authenticated canonical retrieval path.

## 7. Deployment Architecture (1GB Droplet)

1. API container memory cap: 256MB, memswap 768MB.
2. Webhook worker container memory cap: 256MB, memswap 768MB.
3. Local storage mounted at `/var/lib/signshyft`.
4. Nginx proxies `/api` to `127.0.0.1:4010` with 180s read timeout.
5. Swap configured at 2GB.
6. Systemd service manages compose lifecycle.

## 8. Operational Architecture

1. Monitoring baseline: `docker stats`, `free -h`, `df -h /var/lib/signshyft`, `sysstat`, memwatch cron.
2. Backup baseline: nightly `pg_dump` + filesystem archive, 14-day rotation.
3. Quarterly restore drills are mandatory in staging.

## 9. Testing and Quality Gates

1. Golden render hash tests detect output drift.
2. Contract tests for refusal payload and webhook headers.
3. RLS tenant isolation tests on all critical tables.
4. Lane policy checks run for planning and implementation artifacts.
5. Parity tests enforce preview/final shared layout path.

## 10. Implementation Sequence Alignment

Architecture follows the phased build sequence:

1. Skeleton and plugins.
2. Templates/versioning.
3. Rendering engine and determinism tests.
4. Envelopes/signer flow.
5. Finalization and custody.
6. Webhooks and retries.
7. WordPress Phase A integration.

## 11. Known Decisions to Confirm Before Build Lock

1. Resolve token TTL policy conflict (OpenAPI 48h vs env sample 7 days) in final implementation constants.
2. Lock webhook retry max attempts/backoff values and surface in ops docs.
3. Confirm whether admin “last backup timestamp” widget is mandatory for MVP or optional.
