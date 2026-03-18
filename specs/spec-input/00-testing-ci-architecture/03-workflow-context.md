# Workflow Context

## A. Frontend/shared TS unit test workflow

1. developer adds or changes shared TS or web app logic
2. developer runs a standard `test:unit` target
3. shared Vitest config and setup are used
4. tests run consistently across active web apps and shared packages

## B. Backend integration workflow

1. developer adds or changes backend/domain logic
2. integration harness starts test DB and applies migrations
3. minimal fixtures/seeds are loaded
4. service/API tests run against a real integration environment
5. environment is reset cleanly

## C. Contract validation workflow

1. developer changes an event, DTO, or hook contract
2. contract tests run against shared schemas/validators
3. event envelopes and payload shapes are validated
4. incompatible drift is caught before merge

## D. Feature-flag workflow

1. feature is introduced behind a flag
2. tests can force flag-off and flag-on states
3. rollout behavior is validated
4. CI protects both states where appropriate

## E. PR CI workflow

1. PR opens or updates
2. repo guard runs
3. affected lint/typecheck/unit tests run
4. affected integration tests run when relevant
5. contract tests run when relevant
6. selective frontend smoke runs for high-risk paths

## F. Production merge workflow

1. code merges to production branch
2. full build runs
3. full critical test matrix runs
4. migration validation runs
5. smoke / burn-in runs
6. deploy is gated by results

## G. Module landing workflow

1. new module lands
2. shared testing platform already exists
3. module adds domain-specific helpers and fixtures incrementally
4. module plugs into existing CI targets instead of inventing new patterns