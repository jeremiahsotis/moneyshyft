# Testing Obligations

## Required fixture/helpers additions
- policyFactory
- requirementFactory
- screeningSubjectFactory
- screeningRequestFactory
- screeningResultFactory

## Required test coverage
- unit tests for policy evaluation helpers and explanation builders
- backend integration tests for screening request/result flow
- integration tests for missing/stale/needs-confirmation states
- override permission tests
- contract tests for screening_requested, screening_completed, and screening_overridden events

## CI impact
- affected-quality
- affected-integration
- contract-tests
- release-validation

## Notes
Eligibility is rule-heavy. This is an early candidate for later mutation testing.
