# Testing Obligations

## Required fixture/helpers additions
- personFactory
- householdFactory
- addressFactory
- relationshipFactory
- identityClusterFactory
- matchCandidateFactory

## Required test coverage
- unit tests for identity guards, match logic helpers, and validators
- backend integration tests for person/household/address/relationship persistence
- integration tests for duplicate candidate review, confirm/reject, and merge/unmerge safety
- contract tests for person_created, household_created, identity_match_candidate_created, identity_match_confirmed, and related events

## Safety coverage
- tenant isolation tests
- identity linkage does not imply cross-tenant visibility tests

## CI impact
- affected-quality
- affected-integration
- contract-tests
- release-validation

## Notes
PeopleCore is foundational. Subject integrity and tenant isolation are non-negotiable.
