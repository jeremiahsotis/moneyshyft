---
stepsCompleted: [1, 2, 3, 4]
workflowType: epics-and-stories
project: SignShyft
project_lane: signshyft
author: Jeremiah
date: 2026-03-03
inputDocuments:
  - /Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/prd-signshyft-2026-03-03.md
  - /Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/architecture-signshyft-2026-03-03.md
  - /Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/ux-design-specification-signshyft-2026-03-03.md
---

# SignShyft - Epics and Stories

## Overview

This document decomposes SignShyft requirements into implementation-ready epics and stories for the `signshyft` lane. Scope is locked to v1 constraints from constitution, OpenAPI, schema, and ops specs.

## Requirement Traceability Summary

### Functional Requirement Inventory (PRD Reference)

FR-SS-001 through FR-SS-053 from `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/prd-signshyft-2026-03-03.md`.

### Non-Functional Requirement Inventory

NFR-SS-001 through NFR-SS-012 from the same PRD.

## Epic List

1. Epic 1: Lane Governance and Platform Skeleton
2. Epic 2: Template and Version Authoring
3. Epic 3: Deterministic Rendering Engine
4. Epic 4: Envelope and Signer Flow
5. Epic 5: Finalization, Audit, and Document Custody
6. Epic 6: Webhooks and WordPress Integration
7. Epic 7: Deployment, Monitoring, and Operational Resilience

---

## Epic 1: Lane Governance and Platform Skeleton

Goal: establish SignShyft lane-safe foundation, API/web shells, plugin chain, and refusal contract consistency.

### Story 1.1: Establish signshyft lane scaffolding and policy wiring

Acceptance Criteria:

1. Planning artifacts and lane config include `signshyft` mappings and metadata.
2. Sprint status file exists for SignShyft lane.
3. Lane enforcement passes for SignShyft artifacts.
4. No RouteShyft/ConnectShyft lane artifacts are modified by this story.

FR Coverage: FR-SS-050, FR-SS-051, FR-SS-052, FR-SS-053

### Story 1.2: Create signshyft-api skeleton with required plugins

Acceptance Criteria:

1. Fastify TypeScript API boots with health route.
2. Plugin chain includes tenant/auth/refusal/rls/rate-limit/storage/webhooks.
3. Refusal plugin exposes canonical HTTP 200 refusal helper.
4. Request lifecycle includes DB session context initialization contract.

FR Coverage: FR-SS-001, FR-SS-002, FR-SS-003, FR-SS-005
NFR Coverage: NFR-SS-001, NFR-SS-002

### Story 1.3: Create signshyft-web shell for staff and signer route groups

Acceptance Criteria:

1. `signshyft-web` app builds and serves route shells for staff and signer pages.
2. Route guards separate staff-auth and signer-token contexts.
3. Placeholder refusal renderer supports canonical reason display.

FR Coverage: FR-SS-003

### Story 1.4: Implement canonical refusal reasons and API contract fixtures

Acceptance Criteria:

1. Refusal reason enumeration matches locked list in spec.
2. API tests verify business refusals are HTTP 200 payloads.
3. Client helpers normalize refusal rendering.

FR Coverage: FR-SS-003, FR-SS-004

---

## Epic 2: Template and Version Authoring

Goal: deliver staff-facing template and version lifecycle with immutable publish rules.

### Story 2.1: Implement template CRUD endpoints and list UI

Acceptance Criteria:

1. `GET/POST /staff/templates` contract implemented.
2. Staff templates list supports search and archive filtering.
3. Tenant RLS enforced on template data.

FR Coverage: FR-SS-007
NFR Coverage: NFR-SS-001

### Story 2.2: Implement template version read and draft patch workflow

Acceptance Criteria:

1. `GET/PATCH /staff/template-versions/{id}` implemented.
2. Non-draft patch attempts return refusal.
3. Version editor screen allows schema/render config updates in draft only.

FR Coverage: FR-SS-008, FR-SS-009

### Story 2.3: Add draft PDF upload and hash capture

Acceptance Criteria:

1. Multipart upload endpoint stores PDF in configured storage path.
2. SHA-256 hash captured and persisted.
3. Invalid/oversized files return canonical refusal reasons.

FR Coverage: FR-SS-010, FR-SS-011

### Story 2.4: Add layout validation endpoint and blocking publish guard

Acceptance Criteria:

1. `POST /staff/template-versions/{id}/validate` returns diagnostics.
2. Publish flow blocked on `blockingErrors`.
3. Validation results visible in staff editor UI.

FR Coverage: FR-SS-012, FR-SS-013

### Story 2.5: Implement publish immutability and clone-new-draft workflow

Acceptance Criteria:

1. Publish sets version immutable and records publish metadata.
2. Post-publish edits refuse with immutable reason.
3. Clone-from-published creates new draft with copied schema/render config.

FR Coverage: FR-SS-014, FR-SS-015

---

## Epic 3: Deterministic Rendering Engine

Goal: enforce deterministic render behavior and strong engine boundaries.

### Story 3.1: Define RenderEngine interface and enforce import boundary

Acceptance Criteria:

1. Canonical `RenderEngine` interface implemented.
2. ESLint no-restricted-imports rule blocks out-of-bound pdf-lib imports.
3. Build fails when boundary is violated.

FR Coverage: FR-SS-016, FR-SS-017
NFR Coverage: NFR-SS-003

### Story 3.2: Implement shared layout.ts used by preview and final

Acceptance Criteria:

1. Single layout module handles wrapping and measurement.
2. Preview and final paths both call shared layout functions.
3. No duplicate layout logic exists outside engine layout module.

FR Coverage: FR-SS-016

### Story 3.3: Implement deterministic signature and initials rasterization pipeline

Acceptance Criteria:

1. Stroke data persisted as vectors.
2. Rasterization uses deterministic policy at 300 DPI equivalent.
3. Same raster path used for signature and initials.

FR Coverage: FR-SS-018

### Story 3.4: Implement render semaphore and busy refusal behavior

Acceptance Criteria:

1. Render concurrency fixed to 1.
2. Busy requests return `RENDER_BUSY` refusal payload.
3. Busy and failure outcomes create audit events.

FR Coverage: FR-SS-022, FR-SS-023
NFR Coverage: NFR-SS-004, NFR-SS-005

### Story 3.5: Add golden render drift tests

Acceptance Criteria:

1. Given fixed template/values, final hash matches golden baseline.
2. CI fails when hash drifts unexpectedly.
3. Test fixtures include multiline text, checkbox/radio, signature, initials cases.

FR Coverage: FR-SS-016, FR-SS-018, FR-SS-020
NFR Coverage: NFR-SS-003

---

## Epic 4: Envelope and Signer Flow

Goal: deliver secure recipient workflow from envelope creation through signer completion.

### Story 4.1: Implement envelope create/list/get with recipient signer links

Acceptance Criteria:

1. `GET/POST /staff/envelopes` and `GET /staff/envelopes/{id}` implemented per OpenAPI.
2. Create requires `expiresAt` and recipients.
3. Response includes signer URLs and token expiry metadata per recipient.

FR Coverage: FR-SS-024, FR-SS-025

### Story 4.2: Implement recipient signing mode and turn enforcement

Acceptance Criteria:

1. `ORDERED` and `PARALLEL` modes persisted.
2. Ordered flow enforces turn checks.
3. Wrong-turn attempts return `NOT_YOUR_TURN` refusal.

FR Coverage: FR-SS-026, FR-SS-027

### Story 4.3: Implement signer token lifecycle and resend rotation

Acceptance Criteria:

1. Tokens are single-recipient scoped and expiring.
2. Resend endpoint rotates token and invalidates prior token.
3. Access endpoint is rate-limited and audited.

FR Coverage: FR-SS-028, FR-SS-029, FR-SS-006

### Story 4.4: Implement OTP challenge and verify flow

Acceptance Criteria:

1. OTP policies (`EMAIL|SMS|NONE`) enforced per recipient.
2. OTP records hash code, attempts, expiry, verified timestamp.
3. Invalid and expired attempts return canonical refusal reasons.

FR Coverage: FR-SS-033, FR-SS-034, FR-SS-035

### Story 4.5: Implement signer submit endpoint and persistence model

Acceptance Criteria:

1. `POST /signer/envelopes/{token}/submit` stores field values and strokes by binding key.
2. Required-field validation errors return refusal responses.
3. Signer UI supports save/submit feedback for large forms.

FR Coverage: FR-SS-030

---

## Epic 5: Finalization, Audit, and Document Custody

Goal: enforce legal-grade completion path, custody, and retrieval with retention controls.

### Story 5.1: Implement signer complete endpoint and finalization orchestration

Acceptance Criteria:

1. `POST /signer/envelopes/{token}/complete` enforces envelope/signer state checks.
2. Completion triggers renderFinal pipeline and status transitions.
3. Failure modes map to canonical refusal reasons.

FR Coverage: FR-SS-031

### Story 5.2: Implement final PDF flattening, certificate page, and hash persistence

Acceptance Criteria:

1. Finalized PDF flattened and certificate page appended.
2. Final bytes hashed with sha256 and stored on envelope.
3. Canonical payload hash stored in audit metadata chain.

FR Coverage: FR-SS-019, FR-SS-020, FR-SS-021

### Story 5.3: Implement staff download and audit timeline surfaces

Acceptance Criteria:

1. Staff-only download endpoint returns finalized artifact.
2. Envelope details show key audit events.
3. Unauthorized download attempts are rejected and audited.

FR Coverage: FR-SS-032, FR-SS-048

### Story 5.4: Implement retention workers for draft/token/otp and finalized artifacts

Acceptance Criteria:

1. 30-day purge for draft/incomplete/tokens/otp artifacts.
2. 7-year retention policy metadata for finalized artifacts.
3. Purge actions are audit-logged.

FR Coverage: FR-SS-046, FR-SS-047

### Story 5.5: Implement document hash chain persistence integrity checks

Acceptance Criteria:

1. Hash chain writes include `prev_sha256` references.
2. Per-envelope chain integrity verifier exists for ops audits.
3. Integrity failures are surfaced in ops logs.

FR Coverage: FR-SS-049

---

## Epic 6: Webhooks and WordPress Integration

Goal: deliver secure, signed, retry-safe outbound event delivery and WP wiring.

### Story 6.1: Implement webhook endpoint management APIs and staff UI

Acceptance Criteria:

1. Staff can list/create/update webhook endpoints.
2. Endpoint model includes `targetApp`, URL, enabled state.
3. Test endpoint queues test delivery.

FR Coverage: FR-SS-036, FR-SS-037

### Story 6.2: Implement webhook worker queue with retry/backoff and idempotent delivery IDs

Acceptance Criteria:

1. Delivery queue tracks attempts, next attempt, last status/error.
2. Retry policy applies to retryable failure classes only (`network/timeouts`, `5xx`, `429`; optional `408`).
3. Retry schedule is locked to 10 total attempts with full jitter:
   - attempts 2..10 use `exp = attempt - 2`
   - `baseDelaySeconds = 10 * (2 ** exp)`
   - `cappedDelaySeconds = min(baseDelaySeconds, 900)`
   - `sleepSeconds = random_uniform(0, cappedDelaySeconds)`
4. Retries reuse same delivery ID for attempt chain.

FR Coverage: FR-SS-038, FR-SS-041

### Story 6.3: Implement webhook HMAC signing spec v1

Acceptance Criteria:

1. Required headers are emitted on all deliveries.
2. String-to-sign and signature output match signing spec.
3. Signature test vectors verify cross-language deterministic results.

FR Coverage: FR-SS-039, FR-SS-040
NFR Coverage: NFR-SS-006, NFR-SS-008

### Story 6.4: Implement webhook payload contract for WP consumption

Acceptance Criteria:

1. Payload includes required WP fields and document identifier.
2. Event types include completed/voided/expired/status-changed variants.
3. Contract tests validate schema and field presence.

FR Coverage: FR-SS-042

### Story 6.5: Publish WP integration hardening guide and receiver checklist

Acceptance Criteria:

1. Guide includes no-token/no-signer-url logging/storage constraints.
2. Receiver checklist includes raw body verification and timestamp window enforcement.
3. Integration examples cover idempotency and secret rotation.

FR Coverage: FR-SS-043
NFR Coverage: NFR-SS-007, NFR-SS-009

---

## Epic 7: Deployment, Monitoring, and Operational Resilience

Goal: make v1 deployable and supportable on constrained infrastructure.

### Story 7.1: Implement infra artifacts for Docker, Nginx, and systemd

Acceptance Criteria:

1. Compose file deploys API and webhook worker with memory limits.
2. Nginx config supports TLS and `/api` proxy with required timeouts.
3. systemd compose unit supports boot persistence.

FR Coverage: FR-SS-044, FR-SS-045
NFR Coverage: NFR-SS-004

### Story 7.2: Implement minimum monitoring stack and memwatch automation

Acceptance Criteria:

1. Ops commands and docs provided for memory/disk/container observability.
2. `sysstat` and memwatch cron setup documented and script-verified.
3. Render busy/failure events are visible in logs and audit streams.

FR Coverage: FR-SS-023, FR-SS-048
NFR Coverage: NFR-SS-004

### Story 7.3: Implement backup and restore automation scripts

Acceptance Criteria:

1. Nightly DB dump and filesystem archive commands implemented.
2. 14-day retention rotation applied.
3. Restore procedure script verifies health + preview/finalize smoke checks.

FR Coverage: FR-SS-044, FR-SS-046, FR-SS-047
NFR Coverage: NFR-SS-010, NFR-SS-011

### Story 7.4: Resolve policy constants and lock final operational defaults

Acceptance Criteria:

1. Signer token TTL is locked to `172800` seconds (`48h`) and configured via explicit signer token variable (`SIGNER_TOKEN_TTL_SECONDS`).
2. Ambiguous signer token config names (e.g., `TOKEN_TTL_DAYS`) are removed or repurposed with token-class-specific names.
3. Webhook retry limits/backoff are implemented exactly per locked algorithm and documented.
4. Admin backup indicator is required for MVP and backed by persisted backup run telemetry (`started_at`, `completed_at`, `status`, artifact reference).

FR Coverage: FR-SS-052

---

## Story Dependency Map

- 1.2 depends on 1.1
- 1.3 depends on 1.1
- 1.4 depends on 1.2
- 2.1 depends on 1.2
- 2.2 depends on 2.1
- 2.3 depends on 2.2
- 2.4 depends on 2.2, 3.2
- 2.5 depends on 2.4
- 3.1 depends on 1.2
- 3.2 depends on 3.1
- 3.3 depends on 3.1
- 3.4 depends on 3.1
- 3.5 depends on 3.2, 3.3
- 4.1 depends on 2.5
- 4.2 depends on 4.1
- 4.3 depends on 4.1
- 4.4 depends on 4.3
- 4.5 depends on 4.3
- 5.1 depends on 4.5, 4.2, 3.2, 3.3
- 5.2 depends on 5.1
- 5.3 depends on 5.2
- 5.4 depends on 5.2
- 5.5 depends on 5.2
- 6.1 depends on 1.2
- 6.2 depends on 6.1
- 6.3 depends on 6.2
- 6.4 depends on 6.2
- 6.5 depends on 6.3, 6.4
- 7.1 depends on 1.2
- 7.2 depends on 7.1
- 7.3 depends on 7.1
- 7.4 depends on 6.2, 7.1

## Definition of Ready for Implementation Phase

1. Every story has explicit acceptance criteria and FR/NFR mapping.
2. Story sequencing supports incremental, testable delivery.
3. Lane checks are green for all SignShyft planning artifacts.
4. Sprint status file generated from this epic/story set.
