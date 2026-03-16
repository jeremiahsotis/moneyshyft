# Repo Constraints

## Existing structure

Active runtime components already exist:
- admin-api
- admin-web
- moneyshyft-api
- moneyshyft-web
- connectshyft-api
- connectshyft-web
- migration-runner

Planned central internal platform surface:
- shyftunity-web

## Important constraints

- CaseShyft MVP should already exist enough to request and view documents in context
- Eligibility and ResourceShyft have not yet landed and must be able to consume this layer later
- this work must preserve extraction-ready boundaries between documents and evidence
- migration-runner is the migration path and should be used consistently
- secure upload links and hosted access patterns must be compatible with future referral and participant-facing flows

## Live-product constraints

- no breaking changes should impact existing live ConnectShyft or MoneyShyft functionality
- rollout should support internal staff use before broader participant-facing use if needed

## Migration constraints

Expected schema work includes:
- document
- document_version
- document_request
- document_verification
- document_link
- document_bundle_reference
- evidence
- evidence_type
- evidence_verification_event
- evidence_document_link
- evidence_usage_event