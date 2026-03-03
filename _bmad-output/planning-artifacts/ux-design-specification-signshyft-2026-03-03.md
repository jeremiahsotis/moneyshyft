---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
workflowType: ux-design
project: SignShyft
project_lane: signshyft
author: Jeremiah
date: 2026-03-03
inputDocuments:
  - /Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/prd-signshyft-2026-03-03.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/13_OpenAPI.yaml
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/32_Admin_UI_Requirements.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/12_Rendering_Determinism_Spec.md
  - /Users/jeremiahotis/Downloads/SignShyft_Implementation_Spec/05_Refusal_Reasons.md
---

# UX Design Specification - SignShyft

**Author:** Jeremiah  
**Date:** 2026-03-03

## Executive Summary

SignShyft UX must support two very different use cases in one coherent system:

1. Staff operations (template management, envelope operations, webhook administration).
2. Low-friction signer completion (token link, OTP verification, field completion, signature/initials).

The UI must make refusal states obvious and recoverable, preserve deterministic rendering expectations, and keep sensitive data handling safe by default.

## UX Principles

1. Clarity over cleverness: signing status and next required action are always explicit.
2. Deterministic expectations: preview and final look the same in layout behavior.
3. Security-by-default: avoid exposing signer URLs/tokens in logs or unnecessary UI surfaces.
4. Operational simplicity: workflows optimized for a small ops team on constrained infra.
5. Refusal transparency: canonical refusal reasons are user-visible with actionable recovery hints.

## Primary Experience Areas

1. Staff Console
2. Signer Journey
3. Admin and Monitoring
4. WordPress Integration Support Surfaces

## Information Architecture

### Staff Console Navigation

1. Templates
2. Template Versions
3. Envelopes
4. Webhooks
5. System Health

### Signer Navigation

1. Access gate (`/signer/access/{token}`)
2. Envelope view (`/signer/envelopes/{token}`)
3. Submit (`/signer/envelopes/{token}/submit`)
4. Complete (`/signer/envelopes/{token}/complete`)

## Staff UX Flows

### Flow 1: Template Authoring and Publish

1. Staff opens Templates list with search and archive filters.
2. Staff creates template metadata.
3. Staff opens versions for template and selects a draft.
4. Staff uploads PDF.
5. Staff edits field schema in placement builder.
6. Staff runs `Validate Layout` and resolves blocking errors.
7. Staff runs Preview with sample values.
8. Staff clicks Publish; UI displays immutable badge and disables draft-only actions.

### Flow 2: Envelope Creation and Lifecycle

1. Staff opens Create Envelope form.
2. Selects published template version.
3. Adds recipients, signing mode, and OTP policy.
4. Sets explicit expiry (`expiresAt`).
5. Submits and receives recipient signer links (copy/send controls).
6. Envelope list shows status timeline (`SENT -> IN_PROGRESS -> COMPLETED/VOIDED/EXPIRED`).
7. Staff can view details, resend recipient link (token rotation), or void if needed.

### Flow 3: Final PDF Retrieval and Audit

1. Completed envelope shows Download button.
2. Staff downloads finalized PDF via authenticated endpoint.
3. Audit panel shows major events (created, viewed, otp_verified, submitted, completed, webhook_delivery).

### Flow 4: Webhook Endpoint Operations

1. Staff lists endpoints with status badges (`enabled`, `disabled`, `failing`).
2. Staff can create/update endpoint URL and enable toggle.
3. Staff triggers Test Delivery.
4. Delivery history table shows last status/error/next retry.
5. Retry Now action available for failed deliveries.

### Flow 5: System Health Surface

1. Queue state card: `available` vs `busy`.
2. Disk usage card for `/var/lib/signshyft`.
3. Optional last backup timestamp card.
4. If render slot is busy, show non-alarm notice with expected retry guidance.

## Signer UX Flows

### Flow 6: Link Access and OTP

1. Signer opens link.
2. Access screen determines OTP requirement based on recipient policy.
3. If OTP required, collect code and show remaining attempts.
4. Refusal states (`OTP_INVALID`, `OTP_EXPIRED`, `EXPIRED_LINK`) show clear recovery path.

### Flow 7: Form Completion

1. Signer sees generated form fields with required markers.
2. Signature/initials captured as strokes in consistent canvas controls.
3. Submit saves progress (where allowed by policy).
4. Complete confirms attestation and triggers finalization.

### Flow 8: Ordered Signing

1. If not signer turn, show refusal `NOT_YOUR_TURN` with explanatory message.
2. Disable editing controls until turn is active.

## Screen Specifications

### Staff Screen A: Template List

Purpose: discover/manage templates quickly.

Required UI elements:

1. Search field.
2. Archive filter.
3. Template cards/table rows with last updated and active version count.
4. Create template CTA.

### Staff Screen B: Template Version Editor

Purpose: prepare publication-ready template version.

Required UI elements:

1. Version status badge (`DRAFT`, `PUBLISHED`, etc.).
2. PDF upload zone.
3. Field schema editor with placement controls.
4. Validate Layout button with warnings/blocking panels.
5. Preview panel.
6. Publish button (disabled until valid).

### Staff Screen C: Envelope List + Detail

Purpose: track and operate signing requests.

Required UI elements:

1. Status filters.
2. Rows with envelope ID, externalRef summary, expiry, status.
3. Detail panel with recipients and signer link actions.
4. Resend/void actions.
5. Download finalized PDF action when completed.

### Staff Screen D: Webhook Management

Purpose: manage external integration health.

Required UI elements:

1. Endpoint table with target app, url, enabled state.
2. Create/edit endpoint modal.
3. Test delivery action.
4. Delivery history list with status and retry controls.

### Signer Screen E: Access + OTP

Purpose: secure entry into signing flow.

Required UI elements:

1. Access status summary.
2. OTP input with countdown if required.
3. Refusal messaging panel with retry or support guidance.

### Signer Screen F: Envelope Completion

Purpose: complete fields and signature.

Required UI elements:

1. Field renderer by schema type.
2. Signature and initials capture components.
3. Required-field validator summary.
4. Submit and Complete actions.

## Refusal and Error UX Rules

1. Business refusals display inline, non-technical copy while preserving canonical reason code.
2. HTTP-200 refusal responses are visually distinguished from transport/server failures.
3. `RENDER_BUSY` shows queue-busy guidance and retry messaging.
4. Immutable violations (`TEMPLATE_VERSION_IMMUTABLE`) disable controls and link to clone-new-version action.
5. Sensitive details (secret values, raw signatures, signer tokens) are never rendered in debug UI.

## Accessibility and Responsiveness

1. Keyboard-accessible actions for all staff workflows.
2. Minimum WCAG 2.2 AA contrast and focus indicators.
3. Signer flow optimized for mobile portrait screens.
4. Form errors announced with ARIA live regions.
5. No critical action gated behind hover-only UI.

## Performance UX Expectations

1. Staff list pages show skeleton loading states and empty-state guidance.
2. Long operations (preview/finalization/test webhook) show progress indicators.
3. UI prevents duplicate action clicks for idempotent operations.
4. Completion success screen includes envelope identifier and completion timestamp.

## WordPress Integration UX Notes

1. Staff-facing docs/help include strict guidance not to persist signer URLs.
2. Webhook test screen includes signing-header checklist for WP receiver verification.
3. Integration troubleshooting panel maps common failures to quick actions.

## UX Acceptance Checklist

1. Staff can fully author, validate, preview, and publish template versions without DB access.
2. Staff can create and manage envelopes and retrieve final artifacts.
3. Signers can complete signing with required OTP and ordered sequencing controls.
4. Refusal states are understandable and actionable.
5. Sensitive token/secret handling is safe-by-default in UI behavior.
