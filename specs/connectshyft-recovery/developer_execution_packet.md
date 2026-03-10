
# ConnectShyft Recovery – Developer Execution Packet

Status: Active
Date: 2026-03-10
Applies To: ConnectShyft remediation (CS‑001 through CS‑005)

This document is the single entry point for developers implementing the ConnectShyft recovery work. It ties together the architectural contract (ADR), canonical data model, and issue-level specifications.

---

# 1. Governing Documents

All implementation must comply with the following documents.

1. ADR‑00X — Communication Infrastructure Contract
2. Canonical Data Model Note — Communication Infrastructure
3. Guardrailed Issue Specs (CS‑001 through CS‑005)

Precedence order:

ADR → Data Model Note → Issue Spec → Implementation

If any issue spec conflicts with the ADR or the canonical data model note, the ADR and data model note take precedence.

---

# 2. Implementation Order

Developers must implement issues in this order.

1. CS‑001 Lane Convergence
2. CS‑002 Phone Identity
3. CS‑003 Telnyx Outbound Adapter
4. CS‑004 Call Bridge Flow
5. CS‑005 Reliability / Idempotency / Audit

Reason:

UI lane must be correct → phone identity must be canonical → telephony adapter must exist → bridge flow can use adapter → idempotency protects the system.

---

# 3. Repository Targets

Frontend (authoritative):
apps/connectshyft-web

Legacy / migration source:
apps/moneyshyft-web

Shared domain location:
/domains/communication/

Telephony infrastructure:
/infrastructure/communications/

No new ConnectShyft UI work may be added to moneyshyft-web.

---

# 4. Required Domain Boundaries

The following responsibilities are fixed.

Shared Communication Domain owns:
• phone normalization
• contact communication traits
• idempotency records
• communication audit logs

Communication Infrastructure owns:
• telephony provider adapter
• webhook ingestion
• provider event translation

Application Layer (ConnectShyft) owns:
• conversation thread behavior
• volunteer actions (call, text, close)
• rendering communication timeline

UI Components must never:
• normalize phone numbers
• call telephony providers directly
• manage bridge orchestration

---

# 5. Canonical Entities

These entities must exist in the persistence model.

communication_contact_point
communication_contact_trait
communication_message
bridge_session
bridge_leg
communication_idempotency_record
communication_audit_log
telephony_provider_reference
communication_webhook_receipt

Exact table names may vary but structure must match the canonical data model note.

---

# 6. Telephony Adapter Contract

All provider interaction must pass through a provider‑neutral interface.

Required functions:

sendSms(command)
startOutboundCall(command)
startBridgeSession(command)
endCall(command)
verifyWebhook(signature, payload, headers)
translateProviderEvent(payload)

Initial provider implementation: Telnyx

Environment variable:
TELNYX_API_KEY

---

# 7. Idempotency Rules

All outbound communication endpoints must support:

Idempotency-Key header

Duplicate requests with identical payloads must not create duplicate calls or messages.

Requests using the same key with different payloads must fail.

---

# 8. Audit Requirements

All communication mutations must generate audit entries including:

actor
operation
target entity
result state
timestamp
idempotency key
provider references

Audit history must be append‑only.

---

# 9. Bridge Session Model

Bridge orchestration must use persisted session state.

Minimum states:

created
operator_dialing
operator_answered
neighbor_dialing
neighbor_answered
bridged
completed
failed
canceled
expired

UI must read state; it must not control state transitions.

---

# 10. PR Requirements

Every PR implementing these issues must include:

• reference to the issue number
• confirmation of ADR compliance
• confirmation of data model compliance
• screenshots for UI changes
• automated tests for new behavior
• migration notes for persistence changes

---

# 11. ADR Compliance Statement

Every PR must include the following line in its description:

"This change complies with ADR‑00X Communication Infrastructure Contract and the Canonical Data Model Note."

If the implementation requires deviation from the ADR, a new ADR must be proposed before merge.

---

# 12. Acceptance Evidence

Developers must demonstrate:

Phone normalization works without exposing E.164 to users.

Outbound SMS can be sent through Telnyx.

Outbound calls can be initiated.

Bridge sessions successfully connect operator and neighbor.

Duplicate requests do not create duplicate communications.

Audit logs record communication operations.

---

# 13. Definition of Done

The ConnectShyft recovery is complete when:

• only one ConnectShyft frontend exists
• phone identity is canonical and reusable
• telephony adapter isolates provider logic
• bridge sessions persist outside the UI
• outbound operations are idempotent
• communication audit history exists
