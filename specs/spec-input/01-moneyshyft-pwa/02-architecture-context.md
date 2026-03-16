# Architecture Context

## Existing system

The following components already exist:

- moneyshyft-web
- moneyshyft-api
- admin-api
- connectshyft-api
- migration-runner

MoneyShyft operates as its own lane within the broader Shyft ecosystem.

The PWA work must **not introduce architectural coupling to other modules**.

## Ownership

This feature owns:

- PWA manifest
- service worker
- offline-safe caching strategy
- installability behavior
- mobile launch behavior
- mobile UX hardening

## What it integrates with

- moneyshyft-api
- existing authentication/session model

## What it must NOT own

- PeopleCore
- ConnectShyft communication flows
- ShyftUnity shell
- shared identity resolution

## Extraction readiness

The PWA must not assume it will remain inside the current runtime. It should remain deployable as a standalone web application.