# Acceptance Criteria

## Shared testing platform

- frontend/shared TS tests can run through standardized Vitest configs
- existing API Jest coverage remains usable
- shared test helper location and conventions are established

## Contract harness

- shared event envelope validator exists
- contract tests can validate event and DTO shapes
- future hook contract validation is supported

## Backend integration harness

- test DB lifecycle is standardized
- migrations can be applied for integration tests
- setup/teardown is deterministic

## Feature-flag / rollout harness

- tests can force flag-on and flag-off states
- rollout-oriented testing helpers exist for staged features

## CI split

PR CI includes:
- repo guard
- affected lint/typecheck
- affected unit tests
- affected backend integration
- contract tests
- selective frontend smoke

Production merge CI includes:
- full build
- full critical test matrix
- migration validation
- smoke / burn-in
- gated deploy

## Incremental module adoption

- domain-specific fixtures/helpers can be added as modules land
- current modules do not need to invent their own new testing patterns
- future extracted lanes/services can still consume the shared contract validation approach