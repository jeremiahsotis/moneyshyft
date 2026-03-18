# Data Contract Context

## Repo support objects / contract concepts involved

### DomainEvent envelope
Shared event envelope shape used across modules and future extracted services.

Important fields:
- eventId
- eventType
- eventVersion
- occurredAt
- source
- tenantId optional
- actorId optional
- correlationId optional
- payload

### FixtureFactory
Factory pattern for generating reusable domain test data.

Examples:
- personFactory
- conversationFactory
- caseFactory
- documentFactory
- voucherFactory

### IntegrationTestContext
Shared integration harness context.

Important responsibilities:
- test DB boot/reset
- migration application
- seed loading
- teardown

### FeatureFlagTestState
Shared helper shape for forcing feature flag conditions in tests.

### ContractSchema
Shared schema/validator for:
- event envelopes
- API DTO shapes
- future hook payloads

## Important contract families

### Current / near-term event contracts
- communication_received
- triage_item_created
- triage_item_assigned
- case_created
- communication_linked_to_case
- document_requested
- document_uploaded
- document_verified
- evidence_created
- evidence_updated
- screening_requested
- screening_completed
- service_offering_updated
- participant_enrolled
- voucher_issued
- voucher_redeemed

### Future hook contracts
- voucher_redemption_requested
- route_request_created
- work_item_created
- donor_pickup_requested

## Target conventions to standardize

- test:unit
- test:integration
- test:contracts
- test:smoke
- test:e2e
- lint
- typecheck