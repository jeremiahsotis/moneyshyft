# CS-003 Telnyx Outbound Adapter (Guardrailed Spec)

This issue is governed by the ConnectShyft Recovery Execution Packet:

/specs/connectshyft-recovery/developer_execution_packet.md

PRs must use the ConnectShyft Recovery template:

.github/pull_request_template/connectshyft_recovery.md

PRs that do not reference the Execution Packet will not be accepted.

## A. Outcome
ConnectShyft can send outbound SMS and initiate voice calls through Telnyx.

## B. Scope
- Implement Telnyx adapter
- Support SMS and call initiation
- Integrate with ConnectShyft messaging flow

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
- No call bridging logic

## E. Implementation Guardrails
1. Telnyx must be isolated behind an adapter service.
2. UI must not call Telnyx APIs directly.
3. Adapter must support future provider replacement.
4. Environment variable: TELNYX_API_KEY.
5. All persistence and service behavior must conform to ADR-00X and the Canonical Data Model Note.
6. No local schema shortcuts or ConnectShyft-specific phone or telephony models may bypass those contracts.

## F. Acceptance Criteria
- Operator sends SMS from thread.
- SMS delivered via Telnyx.
- Message stored in conversation thread.

## G. Evidence Required in PR
- integration test using Telnyx sandbox
- adapter interface documentation