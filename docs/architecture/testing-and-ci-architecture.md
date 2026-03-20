# Testing and CI Architecture

## Purpose

Testing and CI exist to protect real contracts, real routes, and real behavior.

They should be valid, intentional, and small enough to understand.

## Current target structure

### Repo Guard
Protects:
- workspace boundary enforcement
- basic repo policy checks

### Contracts
Protects:
- `EventEnvelope`
- `SubjectContext`
- PeopleCore contract shapes
- future shared contracts

### Backend Integration
Protects:
- narrow isolated `connectshyft-api` integration path
- Slice-level API behavior
- PeopleCore integration stubs
- WorkIntent stub
- health endpoint

### Frontend Smoke
Protects:
- shell route boot
- minimal shell UI availability
- route-level smoke coverage

### Burn-in
Protects:
- longer-running ConnectShyft stack confidence
- nightly/manual burn-in only
- not duplicate PR blocking

### PR Base Guard
Protects:
- `codex/*` branches must target `codex/dev`

### Branch Protection Drift Check
Protects:
- production branch required checks match the intended workflow set

## Current philosophy

### 1. Modular workflows
No single monolithic test workflow should own everything.

### 2. Narrow integration lanes
A slice should test only the intended isolated surface, not drag in unrelated broken legacy areas.

### 3. Build confidence incrementally
Each slice should leave behind:
- tests
- targets
- CI wiring
- clear stop conditions

### 4. Do not use CI as a process workaround
Workflows should protect architecture and behavior, not compensate for prompt or process failures.

## Current repo state

As of Slice 3:

- contracts tests are green
- backend integration tests are green
- frontend unit tests are green
- frontend smoke is green
- frontend build is green
- CI is green

## Current limitation

The broader ConnectShyft API lane still contains older debt that is intentionally isolated from the current narrow integration path.

That debt should be addressed deliberately in a later stabilization slice, not by broadening the current integration target until it breaks again.

## Near-term next steps

- keep backend integration narrow until the broader ConnectShyft lane is stabilized
- add more real frontend unit tests as features become real
- keep CI modular and intentional
- document any new target/workflow ownership changes immediately
