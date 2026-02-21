---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
lastStep: 14
inputDocuments:
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/product-brief-ConnectShyft-2026-02-19.md
  - /Users/jeremiahotis/moneyshyft/docs/policies/git_policy.md
  - /Users/jeremiahotis/Downloads/ConnectShyft_Updated_Architecture.pdf
  - /Users/jeremiahotis/Downloads/ConnectShyft_API_Endpoint_Contracts.pdf
---

# UX Design Specification ConnectShyft

**Author:** Jeremiah  
**Date:** 2026-02-19

---

## Executive Summary

ConnectShyft UX focuses on communication execution under strict tenancy and orgUnit boundaries. The UI must make ownership, escalation, and policy constraints explicit while minimizing cognitive load for frontline operators. This specification translates the frozen PRD constraints into enforceable interaction patterns for desktop operations and mobile-friendly execution.

The UX must preserve a single, stable mental model:
- One active thread per neighbor per orgUnit.
- Thread states are canonical and finite: `UNCLAIMED`, `CLAIMED`, `CLOSED`.
- Escalation only resets on claim; outbound attempts without claim do not stop escalation.

## Product UX Goals

1. Make scope context unambiguous (tenant and orgUnit always visible).
2. Make thread ownership and next action obvious at a glance.
3. Prevent silent policy violations through guided, constrained interactions.
4. Keep high-volume inbox work fast for keyboard users and clear for touch users.
5. Preserve auditability without overloading frontline users with compliance friction.

## Canonical Roles and UX Responsibilities

- `SYSTEM_ADMIN`: platform governance and provisioning views only; does not access operational inbox by default.
- `TENANT_ADMIN`: tenant-level controls and supervision.
- `TENANT_STAFF`: cross-orgUnit escalation handling within tenant scope.
- `ORGUNIT_ADMIN`: orgUnit config and operational management.
- `ORGUNIT_MEMBER`: day-to-day thread/message handling.
- `ORGUNIT_IDENTITY_LEAD`: identity-sensitive actions (merge/update governance).

## Information Architecture

### Global Navigation (Authenticated)

1. Context Bar
- Active Tenant
- Active OrgUnit
- Role badge
- Context switcher (orgUnit)

2. Primary Nav
- Inbox
- Neighbors
- Numbers & Config
- Reports
- Admin (role-gated)

3. Utility
- Search
- Notifications
- Audit link-outs (role-gated)

### Context Rules

1. No orgUnit-scoped action is enabled without explicit orgUnit context.
2. Tenant identity data is shared across orgUnits; updates are immediately visible tenant-wide.
3. Cross-orgUnit combined inbox is not shown by default.
4. `SYSTEM_ADMIN` defaults to provisioning/admin surfaces; operational inbox navigation is hidden unless tenant-scoped operational role is explicitly granted.

## Core UX Flows

### Flow 1: Inbound Event to Active Thread

1. Webhook event creates/appends to thread using `(tenant_id, org_unit_id, neighbor_id)` identity.
2. Inbox row appears with state `UNCLAIMED` and escalation timer status.
3. Operator opens thread and can claim.
4. Claim transitions state to `CLAIMED`, cancels pending escalation notifications, resets escalation state.

### Flow 2: Thread Claim/Takeover

1. `UNCLAIMED` thread shows `Claim` as primary action.
2. `CLAIMED` thread owned by another user shows `Takeover` (role/policy gated).
3. Takeover requires reason and takeover modal includes explicit notice: "Previous owner will be notified."
4. `CLOSED` thread is read-only unless reopen is added in future scope.

### Flow 3: Outbound SMS with Preference Enforcement

1. User composes outbound SMS in thread.
2. If neighbor `prefers_texting=NO`, send action is blocked pending override reason.
3. Override modal captures required reason code and optional note.
4. Send proceeds only after override completion; audit and override records written.
5. If thread is not claimed, escalation continues to run.

### Flow 4: Escalation Lifecycle Visibility

1. Escalation stage chip visible in inbox and thread header.
2. Escalation chip displays current stage and countdown to next stage, derived from persisted timestamps and integer-hour baseline configuration.
3. Escalation baseline uses integer hours only, default `X = 24` and allowed range `1-24`.
4. Countdown is informational only and must never be used for client-side escalation enforcement.
5. UI copy explicitly states: "Outbound messages do not stop escalation. Claim to reset."
6. Claim action confirmation includes "pending escalation notifications canceled".

### Flow 5: Neighbor Edit and Merge Governance

1. Edit buttons enabled only when policy allows (active-thread relationship in current orgUnit or tenant-privileged role).
2. Edit operations require explicit orgUnit context and log originating orgUnit metadata.
3. Merge actions are role-restricted and include irreversible-action confirmation pattern.
4. Shared phone indicators are always visible and labeled.

## Screen Specifications

### Screen A: Inbox (OrgUnit-Scoped)

**Purpose:** Rapid triage and ownership control for active communication work.

**Primary Elements:**
- Filter tabs: `UNCLAIMED`, `CLAIMED (Mine)`, `CLOSED`
- Escalation stage badge
- Neighbor name and key contact details
- Last activity timestamp
- Ownership column
- Primary action button (`Claim`, `Open`, `Takeover`)

**Interaction Requirements:**
- Keyboard-first row navigation and quick actions.
- Persisted filters by user.
- Sorting priority is deterministic:
  - Stage 3 first
  - Stage 2 second
  - Stage 1 third
  - Unescalated last
  - Within same stage: oldest `UNCLAIMED` first
  - For `CLAIMED` items: most recent activity first
- When user attempts to create a new thread for a neighbor with an existing active thread in current orgUnit, route to existing thread and show non-disruptive notice: "Existing active thread opened."

### Screen B: Thread Detail

**Purpose:** Single source of truth for communication lifecycle and actions.

**Header Contract:**
- Thread state enum value (`UNCLAIMED`, `CLAIMED`, `CLOSED`)
- Owner
- OrgUnit name (always visible in header, even when global context switcher is present)
- Escalation stage and countdown
- Last inbound number metadata
- Preferred outbound number selector (or derived display)

**Body:**
- Timeline (messages, calls, voicemails, system events)
- Composer panel (SMS/call)
- Policy guardrails inline (preference and scope messages)

**Action Bar:**
- `Claim` / `Takeover`
- `Send SMS`
- `Start Call`
- `Close Thread`

### Screen C: Neighbor Profile (Tenant-Scoped)

**Purpose:** Canonical identity and contact profile shared within tenant.

**Key UI Requirements:**
- Bold warning copy: "Changes here affect all orgUnits in this tenant immediately."
- Phone list with `isShared` and verification status.
- Edit and merge actions shown/hidden by permission.
- Audit preview snippet for latest identity updates.

### Screen D: Numbers & OrgUnit Config

**Purpose:** Manage number mappings and escalation settings.

**Key Controls:**
- OrgUnit number mapping table (supports multiple numbers).
- Escalation base `X` configuration in integer hours (default 24, allowed 1-24).
- Primary/secondary/tenant-staff recipient controls.

**Validation UX:**
- Duplicate number prevention feedback.
- Invalid recipient assignment blocking.

## Component and Interaction Patterns

### State Components

1. Thread State Chip:
- `UNCLAIMED` = neutral urgency style
- `CLAIMED` = ownership style
- `CLOSED` = subdued/read-only style

2. Escalation Chip:
- Stage-specific visual hierarchy with readable text labels and countdown text sourced from persisted server timestamps.

3. Scope Banner:
- Sticky banner in operational views showing Tenant + OrgUnit.

### Confirmation and Safety Patterns

1. Claim confirmation includes escalation cancellation note.
2. Takeover requires reason with non-empty validation and explicit prior-owner notification statement.
3. Close thread requires confirmation and summary.
4. Merge neighbor requires irreversible-action confirmation.

### Error and Recovery Patterns

1. Duplicate inbound webhook events must not produce visible duplicate timeline entries; deduped events are suppressed at UI layer.
2. Action failures include retry affordance and explicit persistence state.
3. Permission denials render refusal-style messages with actionable next step.

## Accessibility and Responsive Design

### Accessibility Requirements

1. WCAG 2.2 AA baseline for all ConnectShyft views.
2. Full keyboard support for inbox and thread actions.
3. Screen-reader labels for state, escalation, and ownership indicators.
4. Color is never the only state signal.

### Responsive Strategy

1. Desktop-first for operations (`>=1024px`) with dense table/list layouts.
2. Tablet fallback with reduced columns and sticky actions.
3. Mobile thread view optimized for read/respond/claim and voicemail review, with escalation stage and countdown always visible above composer.

## Copy and Content Guidelines

1. Use explicit operational language, avoid ambiguous verbs.
2. Always name state and ownership in plain language.
3. Preference override copy must explain why reason capture is required.
4. Escalation copy must reinforce claim-only reset semantics.
5. Escalation timing copy must use hour increments only and display baseline as default 24 hours unless orgUnit config overrides it.

## Instrumentation and UX Metrics

1. Time to first claim from inbox arrival.
2. Claim vs takeover ratio by orgUnit.
3. Override modal completion rate and abandonment causes.
4. Escalation stage distribution over time.
5. UI error rates for send/claim/close actions.

## Feature Flag UX Behavior

1. `connectshyft_enabled=false` routes users to controlled unavailable state.
2. Sub-flags (inbox/escalation/webhook processing) show explicit maintenance/availability messaging.
3. Disabled features must fail closed with clear operator guidance.

## Design Constraints for Engineering

1. No direct UI dependency on RouteShyft internals.
2. No UI flows that imply cross-tenant or blended cross-orgUnit inbox behavior.
3. All state transitions must map to canonical enum and audited backend actions.
4. No UI path may bypass preference or governance checks.
5. Canonical thread enum values (`UNCLAIMED`, `CLAIMED`, `CLOSED`) are the only valid operational states in UX and backend; no additional states may be introduced without PRD revision.
6. Compose without claim is allowed when role policy permits, and must not alter escalation progression.

## Open Design Inputs Required

1. Final high-fidelity wireframes for Inbox, Thread Detail, and Neighbor Profile.
2. Message/call template copy and escalation notification content.
3. Final recipient terminology confirmation for stage-3 escalation in UI labels.
4. Brand token decision for status and escalation palettes.

## Acceptance Criteria for UX Spec Completion

1. Canonical thread state enum represented consistently across all screen specs.
2. Claim-only escalation reset and outbound-without-claim behavior represented in interactions and copy.
3. Neighbor edit/merge governance represented with permission and provenance patterns.
4. Scope visibility and orgUnit context rules represented in global and local navigation.
5. Accessibility and responsive behavior requirements are implementation-testable.

\
Locked behavior: CLOSED -> UNCLAIMED on outbound tap\
• If volunteer taps Call on a CLOSED thread:\
  • Thread transitions immediately: CLOSED → UNCLAIMED\
  • System/audit event: thread_reopened_by_user\
  • escalation_stage resets immediately to 0; escalation_count resets to 0; next_evaluation_at_utc recalculated from now\
  • Inactivity timer resets immediately\
  • Bridge call initiates\
  • On CONNECTED → auto-claim (implicit claim)\
• If volunteer taps Send SMS on a CLOSED thread:\
  • Same immediate reopen behavior: CLOSED → UNCLAIMED + thread_reopened_by_user + escalation/inactivity reset\
  • Outbound SMS sends after reopen; successful send is treated as outbound engagement for inactivity tracking\
\
UI rule: preserve historical escalation timeline, but visually segment lifecycles with a system marker: --- Thread Reopened ---\
\
\
Bridge Call UX (no WebRTC / SIP / softphone)\
• Call action always uses a bridge call: the system calls the volunteer first, then the neighbor.\
• While initiating: show banner: “We are calling you now.”\
• If volunteer does not answer first leg: show “Missed your call back. Tap Retry Call to try again.”\
• Manual retry only. No automatic redial or retry loops.\
• When call reaches CONNECTED, the thread is auto-claimed.\
\
Voicemail-only indicator (UNCLAIMED):\
• When thread is UNCLAIMED, inbound voice routes to voicemail only. Thread UI must display a “Voicemail only until claimed” indicator.\
\