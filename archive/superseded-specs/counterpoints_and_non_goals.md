# Counterpoints and Non-Goals

## Counterpoint 1
Current Nginx already provides a useful lane pattern, but it is not sufficient by itself for Money and Connect because those lanes depend on shared auth and platform-admin routes.

## Counterpoint 2
It is tempting to treat each lane as a completely separate deployable app. That would harden the wrong architecture for this stage because auth and platform-admin concerns are still centralized.

## Counterpoint 3
It is also tempting to fold this round into full platform evolution. That would blur immediate deployment fixes with future-state architecture and slow actual progress.

## Non-goals for this round
- building the permanent shell app
- rolling out People Core
- rolling out FinanceCore
- implementing event bus infrastructure
- extracting the full shared UI library
- solving every future lane contract
