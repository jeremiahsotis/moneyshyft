# CS-005 Reliability / Idempotency / Audit (Guardrailed Spec)

This issue is governed by the ConnectShyft Recovery Execution Packet:

/specs/connectshyft-recovery/developer_execution_packet.md

PRs must use the ConnectShyft Recovery template:

.github/pull_request_template/connectshyft_recovery.md

PRs that do not reference the Execution Packet will not be accepted.

## A. Outcome
Messaging and calling operations become retry‑safe and auditable.

## B. Scope
- Implement idempotency
- Implement retry logic
- Implement audit logging

## C. Governing ADR

This issue is governed by:

ADR-00X — Communication Infrastructure Contract (See /specs/connectshyft-recovery/ADR-00X_Communication_Infrastructure_Contract.md)

and the accompanying

Canonical Data Model Note: Communication Infrastructure (See /specs/connectshyft-recovery/Canonical_Data_Model_Note_Communication_Infrastructure.md)

These documents define the non-negotiable architecture for:

• phone identity normalization
• telephony provider boundaries
• bridge session state
• idempotency and audit contracts

If implementation details conflict with the ADR or the canonical data model note, the ADR and canonical data model take precedence.

Developers may choose internal implementation details (ORM models, migrations, service structure, etc.) provided the resulting behavior and persistence model remain compliant with the ADR and data model invariants.

## D. Non‑Goals
- No UI redesign
- No analytics dashboards

## E. Implementation Guardrails
1. All outbound communication endpoints must accept Idempotency-Key.
2. Duplicate requests must not create duplicate calls/messages.
3. Audit log must record action, timestamp, actor, and result.
4. All persistence and service behavior must conform to ADR-00X and the Canonical Data Model Note.
5. No local schema shortcuts or ConnectShyft-specific phone or telephony models may bypass those contracts.

## F. Acceptance Criteria
Repeated requests with same Idempotency-Key produce single action.

## G. Evidence Required in PR
- test demonstrating idempotent behavior
- example audit log entries