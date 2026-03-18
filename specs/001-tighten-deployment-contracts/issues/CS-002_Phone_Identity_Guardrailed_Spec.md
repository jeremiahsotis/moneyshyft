# CS-002 Phone Identity (Guardrailed Spec)

This issue is governed by the ConnectShyft Recovery Execution Packet:

/specs/connectshyft-recovery/developer_execution_packet.md

PRs must use the ConnectShyft Recovery template:

.github/pull_request_template/connectshyft_recovery.md

PRs that do not reference the Execution Packet will not be accepted.

## A. Outcome
Users can enter phone numbers naturally while the system stores canonical E.164 numbers internally.

## B. Scope
- Normalize phone numbers
- Store canonical phone values
- Provide reusable phone utility for other domains

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
- No telephony integration

## E. Implementation Guardrails
1. Phone utilities must live in a reusable communication/people-safe domain.
2. UI must never require users to know E.164.
3. 7‑digit numbers must be resolvable via configurable default area code.
4. Canonical E.164 must be stored internally.
5. All persistence and service behavior must conform to ADR-00X and the Canonical Data Model Note.
6. No local schema shortcuts or ConnectShyft-specific phone or telephony models may bypass those contracts.

## F. Acceptance Criteria
Input:
2605551212

Stored:
+12605551212

7-digit input resolves using configured area code.

## G. Evidence Required in PR
- unit tests for normalization
- example conversions