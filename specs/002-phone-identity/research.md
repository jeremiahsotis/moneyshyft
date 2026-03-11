# Phase 0 Research: CS-002 Phone Identity

## Decision: Implement phone parsing and formatting as a domain-owned deterministic TypeScript module, not a new third-party dependency, for CS-002

- **Rationale**: The repo already contains a stub shared domain at `domains/communication/phone`, but no existing phone parsing library dependency. CS-002 only requires natural domestic input, canonical E.164 storage, configurable seven-digit fallback, shared formatting/comparison behavior, and ConnectShyft API adoption. A deterministic domain-owned parser keeps the feature scoped, avoids dependency churn across the monorepo, and immediately eliminates the current duplicated regex logic in ConnectShyft services.
- **Alternatives considered**:
  - Add `libphonenumber`-style dependency now: more comprehensive globally, but unnecessary for the currently specified CS-002 acceptance examples and introduces dependency/workspace integration before the shared-domain boundary is even wired.
  - Leave the existing regex helpers in app-local modules: violates the ADR and preserves the current duplication in ConnectShyft neighbor and identity-boundary code.

## Decision: Make `PhoneNormalizationContext` the stable configuration boundary for default country and area-code fallback

- **Rationale**: The ADR requires configuration-driven seven-digit fallback and forbids hardcoded area codes in UI/local components. The existing domain stub already exposes `defaultAreaCode` and `defaultCountry`. Keeping configuration as an explicit context object gives the domain a stable public API, lets the lane API decide how configuration is sourced, and leaves room for future org/tenant overrides without coupling the shared domain directly to environment variables.
- **Alternatives considered**:
  - Read environment variables directly inside `domains/communication/phone`: couples shared domain logic to runtime configuration and makes tenant/org overrides harder later.
  - Hardcode a deployment area code in ConnectShyft services or views: explicitly rejected by the ADR and CS-002 guardrails.

## Decision: Integrate the root shared domain by widening lane API TypeScript and Jest boundaries instead of moving the domain into a different package

- **Rationale**: The required domain location is `/domains/communication/`. Today, no app imports that directory, and the lane API TypeScript configs use `rootDir: "./src"` plus Jest roots limited to `src`, which would block adoption. The least-drifting design is to keep the mandated root domain directory and update the lane API compiler/test configuration so that shared-domain source can be imported and tested without creating a second architectural location.
- **Alternatives considered**:
  - Create a new package under `packages/*`: would be technically workable, but diverges from the explicitly required `/domains/communication/` boundary.
  - Copy the domain into each lane API: preserves build convenience at the cost of immediate architectural drift.

## Decision: Treat `connectshyft.cs_neighbor_phones` as the current persistence adapter that must be shaped toward `communication_contact_point`

- **Rationale**: The canonical data model allows exact table names to vary if structure matches. The repo already stores ConnectShyft phone data in `connectshyft.cs_neighbor_phones` with `value_e164`, label, primary/sort metadata, and shared-phone state. CS-002 should not create a second ConnectShyft-local phone store. Instead, it should use the current table as the adapter surface while adding the canonical fields and mapping needed for `communication_contact_point` equivalence.
- **Alternatives considered**:
  - Leave `cs_neighbor_phones` as-is with only `value_e164`: insufficient for the ADR/data-model canonical shape.
  - Create a second ConnectShyft-only canonical phone table: adds a local fork and doubles migration complexity.

## Decision: CS-002 consumer adoption starts with ConnectShyft API neighbor and identity-boundary flows

- **Rationale**: The current duplication that matters for canonical phone identity lives in `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts` and `apps/connectshyft-api/src/modules/connectshyft/identityBoundary.ts`, with the same local normalization pattern copied elsewhere. The authoritative recovery target is ConnectShyft, and the issue explicitly excludes UI redesign and telephony integration. Adopting the shared domain in the ConnectShyft API first provides the canonical behavior where persistence and identity resolution already happen.
- **Alternatives considered**:
  - Refactor every lane copy and every UI helper as part of CS-002: too broad for the feature boundary.
  - Leave ConnectShyft API unchanged and only build the shared module: fails to satisfy the “store canonical phone values” and “provide reusable phone utility” outcome in real application flows.

## Decision: Validation evidence should combine shared-domain examples with ConnectShyft API regression coverage

- **Rationale**: The issue requires unit tests and example conversions. Because the feature is a shared domain adopted by ConnectShyft API, the right evidence is: domain-level normalization/formatting/comparison tests, ConnectShyft neighbor/identity-boundary tests proving the domain is consumed, and a lane API build verifying the root shared domain integration.
- **Alternatives considered**:
  - Only unit-test the shared module: misses the critical adoption step.
  - Only test API endpoints: misses the reusable domain contract that later modules must consume.
