We are implementing: Testing + CI Architecture

Use the attached documents as the source of truth.

## Existing runtime context
These components already exist and are operational:
- admin-api
- admin-web
- moneyshyft-api
- moneyshyft-web
- connectshyft-api
- connectshyft-web
- migration-runner

The repo already includes Nx, Playwright, Jest in APIs, and GitHub Actions.

## Locked platform constraints
- the platform is a modular monolith today but must remain extraction-ready for future lanes/services
- MoneyShyft and ConnectShyft are already live and need stronger protection
- frontend/shared TS testing should standardize on Vitest
- existing API Jest tests should remain usable for now
- Playwright should be used for smoke / critical path browser testing
- contract validation is required now to protect module boundaries and future extraction
- feature work must continue alongside this work; do not create a long infrastructure detour

## What this work should own
- shared Vitest configs and conventions
- shared test helper / fixture strategy
- contract harness
- backend integration harness
- feature-flag / rollout harness
- shared event envelope validation
- Nx target conventions for testing
- GitHub Actions workflow split and CI plan

## What this work integrates with
- all current and planned modules
- migration-runner
- GitHub Actions
- Nx workspace conventions
- future extracted lanes/services

## What this work must not own
- product/domain business logic
- module-specific product behavior
- a giant internal framework abstraction
- forced immediate migration of all existing Jest coverage

## Primary users
- platform engineers
- frontend engineers
- backend engineers
- release / CI maintainers

## Problem being solved
The repo needs a centralized but lightweight testing and CI foundation so new modules do not invent their own patterns, live flows are protected, and future extraction into lanes/services remains safe.

## Core workflows
- run frontend/shared TS unit tests
- run backend integration tests with migration-backed DB setup
- validate event and API contracts
- test feature-flagged rollouts
- run targeted PR CI
- run full production merge validation
- add domain-specific helpers as modules land

## Domain / support objects involved
- DomainEvent envelope
- FixtureFactory families
- IntegrationTestContext
- FeatureFlagTestState
- ContractSchema families

## Required target conventions
- test:unit
- test:integration
- test:contracts
- test:smoke
- test:e2e
- lint
- typecheck

## Security / audit / rollout requirements
- CI must protect live user flows first
- migration validation must be included before production deployment
- contract validation must preserve stable inter-module and future hook boundaries
- rollout helpers must support staged enablement without inconsistent ad hoc patterns

## Repo / migration constraints
- feature delivery continues while this work lands
- migration-runner should be reused for integration test DB lifecycle
- rollout should be phased:
  1. shared testing spine
  2. CI split
  3. domain-specific helpers added incrementally

## Build now
- shared Vitest configs
- root test command conventions
- shared event envelope validator
- backend integration harness skeleton
- minimal feature-flag helpers
- CI workflow split

## Future hooks / later additions
- visual regression
- mutation testing
- performance budgets
- flaky test handling
- broader service virtualization

## Testing and quality requirements
- define the fixture/helper families this package must add to the shared testing platform
- define the required contract tests for this package
- define the required backend integration coverage for this package
- define any selective smoke coverage needed for live or high-risk workflows
- identify which CI workflows should cover this package
- preserve compatibility with the centralized testing + CI architecture package

Produce:
1. a clear implementation spec
2. concrete backend/frontend/dev-infra tasks
3. migration and runtime notes
4. CI workflow definitions
5. dependency-aware PR slices
6. acceptance criteria
7. phased rollout notes