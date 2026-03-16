# Acceptance Criteria

## Policy and screening core

- policies can be created and queried
- screening requests can be created and executed
- screening results are stored with stable statuses

## Evidence and document consumption

- screening can consume reusable evidence
- screening can detect missing, stale, and needs-confirmation evidence
- linked document-backed evidence can influence result state

## Explanations

- result includes understandable explanation payload
- user can see why a result passed, failed, or needs more information

## Overrides

- override only works when policy and permissions allow it
- override reason is required
- audit trail is preserved

## Downstream readiness

- result payload can be consumed later by ResourceShyft, ProgramShyft, and Referral workflows
- Eligibility does not take ownership of referral or document logic

## Auditability

- screening request, result, and override actions are recorded