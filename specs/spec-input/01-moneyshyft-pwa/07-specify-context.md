We are implementing: MoneyShyft PWA retention release

Use the attached documents as the source of truth.

## Existing runtime context
These components already exist:
- moneyshyft-api
- moneyshyft-web
- admin-api
- connectshyft-api
- migration-runner

## Platform constraints
- MoneyShyft currently has active users
- The PWA release is the highest priority deliverable
- No breaking API changes are allowed
- This work must remain extraction-ready

## What this work owns
- PWA manifest
- service worker
- install behavior
- mobile reliability improvements

## What it integrates with
- moneyshyft-api
- existing authentication/session model

## What it must not own
- PeopleCore
- ConnectShyft
- ShyftUnity shell

## Users
Individuals managing personal budgets.

## Problem being solved
MoneyShyft currently lacks a stable mobile installable experience, risking user retention.

## Core workflows
- mobile install
- home screen launch
- safe refresh
- offline resilience

Produce:
- full spec
- task plan
- API impacts
- PR slices
- acceptance tests