# Testing Obligations

## Required fixture/helpers additions
- documentFactory
- documentVersionFactory
- documentRequestFactory
- evidenceFactory
- evidenceTypeFactory
- evidenceUsageFactory
- secure upload link helpers

## Required test coverage
- unit tests for verification state helpers and evidence reuse logic
- backend integration tests for request → upload → verify → evidence link flows
- integration tests for secure upload link behavior
- integration tests for evidence reuse states: reusable, needs confirmation, stale, missing
- contract tests for document_requested, document_uploaded, document_verified, evidence_created, and evidence_updated events

## CI impact
- affected-quality
- affected-integration
- contract-tests
- release-validation
- nightly-burn-in

## Notes
Documents and Evidence must remain separate but linked. Tests should enforce that boundary.
