# ShyftUnity Documentation Pack

## Recommended repo locations

Copy these files into the repo at:

- `docs/INDEX.md`
- `docs/architecture/peoplecore-overview.md`
- `docs/architecture/connectshyft-communications-overview.md`
- `docs/architecture/testing-and-ci-architecture.md`
- `docs/contracts/subject-context.md`
- `docs/contracts/event-envelope.md`
- `docs/contracts/peoplecore-contact-point.md`
- `docs/contracts/resolver-review.md`
- `docs/contracts/work-intent.md`
- `docs/decisions/adr-001-identity-signals-not-identity-truth.md`
- `docs/decisions/adr-002-conversation-anchored-to-contact-point.md`
- `docs/decisions/adr-003-connectshyft-standalone-now-embedded-later.md`
- `docs/decisions/adr-004-workintent-transitional-object.md`

## Purpose of each area

### `docs/architecture/`
Short subsystem overviews. These explain how major parts of the platform fit together.

### `docs/contracts/`
Authoritative documentation for shared contracts and domain shapes. These should stay close to the code and be updated when the contract changes.

### `docs/decisions/`
Short ADR-style records for decisions that would be dangerous to rediscover later.

## Authoritative rules

- Contracts in code are source of truth for exact field names and types.
- These docs explain intent, boundaries, and operational meaning.
- Keep docs short and current.
- Prefer updating an existing decision doc over scattering the same decision across many files.
