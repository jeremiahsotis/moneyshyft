# Architecture Context

## Existing system

These components already exist and are operational:

- admin-api
- admin-web
- moneyshyft-api
- moneyshyft-web
- connectshyft-api
- connectshyft-web
- migration-runner

The repo already has:
- Nx workspace structure
- Playwright at repo root
- Jest in existing APIs
- GitHub Actions already in use
- migration-runner as a centralized operational tool

## Locked architecture facts

- the repo is a modular monolith today with extraction-ready seams for future lanes/services
- MoneyShyft and ConnectShyft are already live and need stronger protection
- frontend/shared TS testing should standardize on Vitest
- existing API Jest coverage can remain in place for now
- Playwright should be used for smoke / critical path browser coverage
- contract validation is needed now to protect module boundaries and future extraction
- feature work should continue alongside this work; the testing platform must not become a long infrastructure detour

## Ownership

This work owns:
- shared testing configs and conventions
- shared test harnesses
- shared fixtures/factories strategy
- shared contract validation approach
- shared feature-flag testing helpers
- CI workflow structure and definitions

## What it integrates with

- all existing and planned apps/domains
- migration-runner for integration-test DB lifecycle
- GitHub Actions
- Nx target conventions
- future extracted lanes/services through stable contract tests

## What it must NOT own

- product/domain business logic
- per-module product behavior
- full service virtualization platform
- general-purpose internal framework complexity
- mandatory migration of all existing Jest tests to Vitest immediately

## Extraction readiness

This work must support:
- current monolith-style development
- future lane extraction
- later service separation

That means contracts, event envelopes, fixtures, and CI logic should not assume one permanent runtime shape.