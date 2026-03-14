---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
workflowType: prd
project: SignShyft
project_lane: signshyft
author: Jeremiah
date: 2026-03-03
classification:
  projectType: modular monolith module expansion
  domain: e-signature and document custody
  complexity: high
  projectContext: brownfield parallel development
inputDocuments:
  - /Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/product-brief-signshyft-2026-03-03.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/01_SignShyft_Constitution.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/13_OpenAPI.yaml
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/20_DB_DDL_and_RLS.sql
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/SignShyft_Webhook_Signing_Spec.md
---

# Product Requirements Document - SignShyft

**Author:** Jeremiah  
**Date:** 2026-03-03

## Executive Summary

SignShyft delivers a canonical e-signature service for all Shyft ecosystem modules requiring electronic signature and final document retention. V1 focuses on staff-driven template authoring, signer completion flows, deterministic final PDF generation, and operationally safe webhook integration for WordPress.

SignShyft must run as a dedicated `signshyft` lane with strict non-interference constraints to protect RouteShyft and ConnectShyft delivery.

## Objectives

1. Provide one reusable signing platform across the ecosystem.
2. Guarantee deterministic legal artifact generation (preview/final parity).
3. Guarantee tenant isolation and role-based control on all data paths.
4. Guarantee canonical custody of finalized PDFs, hashes, and audit trails.
5. Support WordPress Phase A integration without leaking signer secrets.

## Non-Goals

1. Public template authoring by signers.
2. Generic cloud document management features.
3. Multi-tenant cross-share workflows.
4. Multi-node horizontal scaling in v1.

## Users and Roles

### Primary Roles

1. `staff_admin`: full tenant-scoped operational control.
2. `staff`: day-to-day template/envelope/webhook operations.
3. `signer`: recipient completing assigned envelope steps.

### Integration Actors

1. WordPress plugin server integration identity.
2. Webhook receiver process with signature verification + idempotency.

## Success Criteria

### Product Outcomes

1. `100%` published template versions are immutable.
2. `100%` finalized envelopes persist PDF + sha256 + audit/hash records.
3. `100%` business refusals use HTTP `200` with canonical refusal payload.
4. `100%` webhook deliveries include required signed headers.

### Operational Outcomes

1. Render queue saturation is handled safely via `RENDER_BUSY` without process instability.
2. Backup/restore drill completes successfully at least quarterly.
3. 1GB droplet memory remains inside configured container limits under expected load.

### Integration Outcomes

1. WordPress receives envelope status and document retrieval identifiers.
2. WordPress does not persist signer URLs or canonical PDFs.

## Product Scope

### MVP In Scope

1. Staff template CRUD and versioning (`DRAFT`, `PUBLISHED`, `DEPRECATED`, `ARCHIVED`).
2. Draft PDF upload with sha256 capture.
3. Draft schema editing and layout validation.
4. Preview rendering endpoint for staff.
5. Envelope creation with explicit `expiresAt` and recipients.
6. Signer access flow (token + OTP policy).
7. Signer submit and completion.
8. Finalization pipeline with certificate page append and flatten.
9. Staff finalized PDF download endpoint.
10. Webhook endpoint configuration, test, delivery queue, retry.
11. WordPress integration contract for creation + webhook consumption.

### MVP Out of Scope

1. Alternate storage backends.
2. Multi-region HA architecture.
3. Public unauthenticated staff APIs.
4. Advanced analytics dashboards.

## User Journeys

### Journey A: Template to Published Version

1. Staff creates template metadata.
2. Staff creates/edits draft version schema.
3. Staff uploads source PDF to draft version.
4. Staff validates layout; blocking errors must be resolved.
5. Staff publishes version; version becomes immutable.

### Journey B: Envelope Creation to Completion

1. Staff creates envelope with recipients and expiry.
2. API returns signer URLs per recipient.
3. Signer opens access link; OTP challenge if required.
4. Signer submits field values/strokes.
5. Signer completes; service finalizes deterministic PDF.
6. Staff downloads finalized PDF and views audit trail.

### Journey C: WordPress Integration

1. WP plugin calls `POST /staff/envelopes` server-to-server.
2. WP emails signer link and stores only envelope references.
3. SignShyft emits signed webhook events.
4. WP verifies HMAC and applies idempotent updates.
5. Staff retrieves finalized artifact from SignShyft when needed.

## Functional Requirements

### Security, Scope, and Governance

FR-SS-001: Tenant must be resolved by Host header + JWT tenant claim match.
FR-SS-002: Tenant must never be accepted from request body/query.
FR-SS-003: Business refusals must return HTTP 200 with `{success:false,reason}`.
FR-SS-004: API must support canonical refusal reason enum set from spec.
FR-SS-005: Staff operations require bearer auth and tenant-scoped role resolution.
FR-SS-006: Signer access attempts must be rate-limited and audited.

### Template and Version Lifecycle

FR-SS-007: Staff can list/create templates.
FR-SS-008: Staff can get and patch draft template versions.
FR-SS-009: Patch to non-draft template version is refused.
FR-SS-010: Draft PDF upload stores object key and sha256.
FR-SS-011: Invalid/oversize PDF upload must refuse with canonical reasons.
FR-SS-012: Layout validation endpoint returns warnings and blocking errors.
FR-SS-013: Publish operation refuses if layout has blocking errors.
FR-SS-014: Published versions are immutable and cannot be edited.
FR-SS-015: New draft version can be created from a published version clone.

### Rendering and Determinism

FR-SS-016: Preview and Final rendering must use the same layout implementation.
FR-SS-017: Render engine imports are restricted to `render/engines/*` only.
FR-SS-018: Signatures/initials are stored as vector strokes and rasterized deterministically.
FR-SS-019: Final output must be flattened and include certificate page.
FR-SS-020: Final PDF bytes must be hashed with sha256 and persisted.
FR-SS-021: Canonical field payload hash must be computed and persisted in audit payload.
FR-SS-022: Render concurrency must be fixed to 1 in v1.
FR-SS-023: If render slot is unavailable, system refuses with `RENDER_BUSY`.

### Envelope and Recipient Flow

FR-SS-024: Envelope creation requires `templateVersionId`, `recipients`, and `expiresAt`.
FR-SS-025: Envelope status lifecycle supports `DRAFT|SENT|IN_PROGRESS|COMPLETED|VOIDED|EXPIRED|DECLINED|ERROR`.
FR-SS-026: Recipient model supports `ORDERED` and `PARALLEL` signing modes.
FR-SS-027: Ordered mode enforces turn-taking with refusal `NOT_YOUR_TURN`.
FR-SS-028: Signer tokens are single-recipient scoped and expire exactly 48 hours (`172800` seconds) from issuance.
FR-SS-029: Resend rotates token and invalidates prior token.
FR-SS-030: Signer submit persists field values and signature strokes by binding key.
FR-SS-031: Complete operation triggers deterministic finalization workflow.
FR-SS-032: Staff download endpoint returns finalized PDF for authorized staff only.

### OTP and Access Controls

FR-SS-033: OTP policies `EMAIL|SMS|NONE` are supported per recipient.
FR-SS-034: OTP challenge stores hashed code, attempt count, expiry, verification timestamp.
FR-SS-035: Invalid/expired OTP returns canonical refusal (`OTP_INVALID|OTP_EXPIRED`).

### Webhooks and WordPress Integration

FR-SS-036: Staff can configure webhook endpoints (`targetApp`, `url`, enabled state).
FR-SS-037: Webhook test endpoint queues synthetic delivery.
FR-SS-038: Webhook worker retry policy is locked to 10 total attempts (1 initial + 9 retries), exponential base-2 starting at 10s, full-jitter, and a 15-minute cap.
FR-SS-039: Outbound webhook signatures follow locked HMAC spec (`v1` format).
FR-SS-040: Required signed headers must be emitted for every webhook delivery.
FR-SS-041: Delivery retries must reuse the same `deliveryId` across attempts.
FR-SS-042: Payload includes `envelopeId`, `status`, `externalRef`, and `document` identifier.
FR-SS-043: WordPress integration guidance must enforce no signer URL logging/storage.

### Storage, Retention, and Audit

FR-SS-044: Storage driver v1 uses local disk paths under `/var/lib/signshyft`.
FR-SS-045: Storage paths must not be web-accessible.
FR-SS-046: Finalized artifacts/audit/hash chain retention defaults to 7 years.
FR-SS-047: Draft/token/OTP artifacts are purged after 30 days.
FR-SS-048: Critical actions write immutable audit events.
FR-SS-049: Document hash chain persists `prev_sha256` linkage per envelope step.

### Lane and Delivery Governance

FR-SS-050: SignShyft planning artifacts must include `project_lane: signshyft`.
FR-SS-051: SignShyft planning filenames must include `signshyft` token.
FR-SS-052: Lane policy checks must pass after each planning artifact update.
FR-SS-053: SignShyft sprint status is isolated in `sprint-status-signshyft.yaml`.

## Non-Functional Requirements

NFR-SS-001: Tenant isolation enforced by DB RLS across all tenant-scoped tables.
NFR-SS-002: API sets local DB session context (`app.tenant_id`, `app.actor_role`, `app.actor_id`).
NFR-SS-003: Render determinism is stable across preview/final and CI golden hash tests.
NFR-SS-004: Service tolerates constrained memory with container hard limits.
NFR-SS-005: Render path is single-concurrency and fails fast on saturation.
NFR-SS-006: Webhook verification supports replay resistance via timestamp window + idempotency.
NFR-SS-007: Secrets are stored as base64 and support dual-secret rotation with grace window.
NFR-SS-008: Signed webhook verification occurs before JSON parse/business logic.
NFR-SS-009: Logging excludes tokens, signer URLs, secrets, and full signed payload bodies.
NFR-SS-010: Backups include DB and filesystem with 14-day retention minimum, and admin UX exposes last successful backup timestamp and last backup status.
NFR-SS-011: Restore drill must be executable in staging and validate rendering outputs.
NFR-SS-012: All planning outputs remain lane-safe and non-interfering with other lanes.

## API Contract Baseline

The OpenAPI document (`13_OpenAPI.yaml`) is the contract source for v1 endpoints and schemas, including:

1. Staff template/version APIs.
2. Staff envelope APIs.
3. Staff webhook management APIs.
4. Signer access/submit/complete APIs.
5. Refusal payload schema and field schema union types.

## Data Contract Baseline

The SQL DDL (`20_DB_DDL_and_RLS.sql`) is the schema source for v1 including:

1. Tenant + staff users.
2. Template + template versions.
3. Envelopes + recipients + tokens + OTP + field values + strokes.
4. Audit events + document hashes.
5. Webhook endpoints + webhook deliveries.
6. RLS policies for tenant-scoped staff access.

## Locked V1 Decisions

1. Signer token TTL is locked to 48 hours (`172800` seconds) using explicit signer token config naming (`SIGNER_TOKEN_TTL_SECONDS=172800`).
2. Webhook retries are locked to 10 total attempts with this algorithm for attempts 2..10:
   - `exp = attempt - 2`
   - `baseDelaySeconds = 10 * (2 ** exp)`
   - `cappedDelaySeconds = min(baseDelaySeconds, 900)`
   - `sleepSeconds = random_uniform(0, cappedDelaySeconds)` (full jitter)
3. Admin “last backup timestamp” is required for MVP and must show:
   - last successful backup timestamp
   - last backup status (`SUCCESS` or `FAIL`)
4. Token-related configuration must be explicit by token class; ambiguous `TOKEN_TTL_DAYS` usage for signer links is prohibited.

## Release Readiness Gates

1. Product Brief approved.
2. UX spec confirms operational/admin/signer flows.
3. Architecture locks bounded module and deterministic render decisions.
4. Epics/stories map every FR/NFR with no uncovered requirements.
5. Implementation readiness report shows PASS for scope, traceability, and lane isolation.
