# Testing Obligations

## Required fixture/helpers additions
- organizationFactory
- serviceLocationFactory
- serviceOfferingFactory
- serviceAvailabilityFactory
- freshnessRecordFactory

## Required test coverage
- unit tests for search helpers, ranking helpers, and availability display helpers
- backend integration tests for service offering persistence and requirement visibility
- integration tests for open-now vs later-today ordering
- contract tests for service_offering_updated and service_availability_updated events
- selective smoke path for internal service discovery

## CI impact
- affected-quality
- affected-integration
- contract-tests
- frontend-smoke
- release-validation

## Notes
Availability and freshness logic should be tested with human-readable output expectations.
