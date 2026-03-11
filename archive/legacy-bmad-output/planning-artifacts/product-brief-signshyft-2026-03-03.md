---
stepsCompleted: [1, 2, 3, 4, 5, 6]
workflowType: product-brief
project: SignShyft
project_lane: signshyft
author: Jeremiah
date: 2026-03-03
inputDocuments:
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/01_SignShyft_Constitution.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/02_Concrete_Folder_Structure.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/03_RenderEngine_Interface_and_Contract.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/04_Lint_and_Parity_Enforcement.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/05_Refusal_Reasons.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/12_Rendering_Determinism_Spec.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/13_OpenAPI.yaml
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/20_DB_DDL_and_RLS.sql
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/30_Deployment_Runbook.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/31_Backup_and_Restore.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/32_Admin_UI_Requirements.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/33_Build_Sequence.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/34_WordPress_Integration_Phase_A.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/35_Render_Behavior_Under_Load.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/36_Monitoring.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/SignShyft_Webhook_Signing_Spec.md
---

# Product Brief: SignShyft

## Executive Summary

SignShyft is the e-signature and finalized document custody module for the Shyft ecosystem. It provides template authoring, signer flows, deterministic PDF rendering/finalization, audit/hash chain, and webhook integration for downstream systems such as WordPress.

The module must launch as an isolated lane (`signshyft`) without disrupting RouteShyft or ConnectShyft delivery. Lane isolation is enforced by naming conventions, branch tokens, and policy checks. Runtime isolation is enforced through bounded module folders, strict RenderEngine boundaries, and tenant RLS.

## Problem Statement

The ecosystem currently lacks one canonical e-signature service for legally relevant signed documents. Existing module-specific implementations would create drift in security, retention, and audit behavior.

SignShyft solves this by centralizing:

1. Template/version lifecycle with immutability once published.
2. Secure signer flows with token + OTP policy support.
3. Deterministic preview/final render behavior.
4. Canonical finalized PDF storage with hash chain and audit trail.
5. Integration-safe webhook and WordPress handoff patterns.

## Product Vision

Create one reusable e-signature platform service that any Shyft module can call while preserving:

1. Tenant data isolation and access governance.
2. Deterministic legal artifact generation.
3. Operational safety on constrained infrastructure (1GB droplet).
4. Clear refusal contracts for all business-rule failures.

## Target Users

### Primary Users

1. Staff admins who create templates, publish versions, and manage envelopes.
2. Signers (guardians/participants) completing forms through secure signer links.
3. Operations admins who monitor webhook delivery and retrieval/download paths.

### Secondary Users

1. WordPress plugin maintainers integrating enrollment or consent flows.
2. Compliance/audit stakeholders reviewing signed artifact integrity.
3. Platform maintainers managing deployment/backup/restore.

## Success Metrics

1. `100%` of business refusals return HTTP `200` + `{ "success": false, "reason": "..." }`.
2. `100%` of published template versions are immutable.
3. `100%` of finalized envelopes store canonical PDF + sha256 + audit/hash chain.
4. Render queue saturation returns `RENDER_BUSY` with no crash/restart loops.
5. RLS isolation holds for all tenant-scoped tables.
6. WordPress integration stores only envelope references/status, never canonical PDFs.

## MVP Scope

### In Scope (V1)

1. Staff template CRUD + template version lifecycle (`DRAFT -> PUBLISHED`).
2. Draft PDF upload, schema editing, layout validation, and preview rendering.
3. Envelope creation with recipients, ordered/parallel signing rules, resend and token rotation.
4. Signer access, submit, and complete flows with OTP policy (`EMAIL|SMS|NONE`).
5. Finalization pipeline: render final PDF, flatten, append certificate, hash and store.
6. Staff download path for finalized documents.
7. Webhook endpoint management + delivery worker + retry/backoff + idempotency.
8. WordPress Phase A integration contract and webhook signing verification.
9. Local-disk storage driver under `/var/lib/signshyft` (non-web-accessible).

### Out of Scope (V1)

1. Public/signer template authoring.
2. Multi-engine rendering abstraction beyond pdf-lib engine implementation.
3. Cloud object storage migration (S3/GCS).
4. Multi-node scaling and distributed render queue.

## Non-Negotiable Constraints

1. Tenant resolution from Host header plus JWT tenant claim match only.
2. No tenant acceptance from request body/query.
3. Strict RenderEngine import boundary (`apps/signshyft-api/src/render/engines/*` only).
4. Preview and Final must share identical layout logic (`layout.ts`).
5. Render concurrency fixed to `1` on the 1GB droplet.
6. Retention defaults: finalized artifacts 7 years, draft/token/OTP artifacts 30 days.
7. Canonical storage ownership remains in SignShyft; integrations store references only.

## Lane Safety and Non-Interference Strategy

1. Keep all planning and implementation artifacts lane-tagged with `signshyft`.
2. Keep SignShyft code under dedicated module paths (`apps/signshyft-*`, `infra/signshyft*`) to avoid cross-lane coupling.
3. Enforce lane guard + git policy checks after every planning artifact.
4. Avoid direct imports from RouteShyft/ConnectShyft internals; integration through contracts/events only.
5. Maintain independent sprint status file `_bmad-output/implementation-artifacts/sprint-status-signshyft.yaml`.

## Key Risks and Mitigations

1. Risk: memory pressure on 1GB droplet during finalization.
Mitigation: hard container memory limits, concurrency=1, swap, memwatch, refusal-on-busy.

2. Risk: rendering drift between preview and final.
Mitigation: single shared layout implementation and golden hash tests in CI.

3. Risk: webhook replay or spoofing.
Mitigation: timestamp window checks, delivery ID idempotency, HMAC signatures, dual-secret rotation.

4. Risk: legal/compliance exposure from weak retention or artifact provenance.
Mitigation: hash chain, immutable versioning, strict retention policy, staff-only download flow.

## Delivery Recommendation

Execute SignShyft in phased increments from skeleton -> templates -> rendering -> envelopes -> finalization -> webhooks -> WordPress integration, with explicit lane checks and policy gates after each artifact and implementation slice.
