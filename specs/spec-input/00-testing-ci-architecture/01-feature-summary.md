# Testing + CI Architecture — Feature Summary

## What is being built

This work creates the shared testing and CI foundation for the ShyftUnity repo.

It introduces and formalizes:

- a centralized lightweight testing toolkit
- shared fixture strategy
- contract harness
- backend integration harness
- feature-flag / rollout harness
- shared event envelope validation
- standardized Nx test target conventions
- GitHub Actions CI split for PR and production workflows

This is not a standalone product feature. It is a repo-level quality platform that supports current and future modules.

## Why now

The repo is moving from a few active lanes into a broader platform with multiple domains and modules.

Without a shared testing and CI foundation:
- each app/module will invent its own test shape
- frontend testing will remain inconsistent
- contract drift will increase
- extraction into lanes/services later will get riskier
- CI will become noisy, slow, and uneven

This work should land alongside feature development, not after the platform is already fragmented.

## Who uses this

Direct users:
- platform engineers
- frontend engineers
- backend engineers
- release / CI maintainers

Indirect users:
- every feature team working on MoneyShyft, ConnectShyft, PeopleCore, CaseShyft, Documents, Eligibility, ResourceShyft, ProgramShyft, and FinanceCore

## Success definition

The repo should have:

1. a standard lightweight frontend/shared TS test path
2. a standard backend integration test path
3. one shared event/contract validation model
4. one shared fixture strategy
5. CI workflows split by purpose
6. a phased rollout path that grows with modules landing