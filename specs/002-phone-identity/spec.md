# Feature Spec: CS-002 Phone Identity

**Feature Branch**: `002-phone-identity`  
**Canonical Source**: [CS-002_Phone_Identity_Guardrailed_Spec.md](/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/CS-002_Phone_Identity_Guardrailed_Spec.md)

## Scope

Implement canonical phone identity for ConnectShyft through the shared communication domain.

This feature is limited to:

- natural phone-number input
- canonical internal E.164 storage
- reusable shared-domain phone parsing, normalization, formatting, and comparison
- ConnectShyft API adoption of that shared-domain behavior

This feature explicitly excludes:

- UI redesign
- telephony integration
- bridge session work
- reliability/idempotency/audit work beyond what is required to avoid blocking CS-002 design

## Routing Ownership and Lane Boundaries

- `connectshyft-api` remains the owner of ConnectShyft lane routes affected by this feature.
- `admin-api` remains the owner of `/api/v1/auth/*` and `/api/v1/platform/admin/*`; CS-002 must not change that delegation.
- This feature may introduce shared domain code under `domains/communication`, but it must not introduce direct lane-to-lane API calls.
- Canonical phone identity logic must stay below the Telnyx adapter boundary and must not embed provider-specific behavior.
- Persistence remains in the shared PostgreSQL deployment model; this feature must remain compatible with production migration ownership by `admin-api`.

## Requirements

1. Phone utilities must live in `/domains/communication/phone/`.
2. End users must never be required to understand or enter E.164 explicitly.
3. Ten-digit domestic input must normalize to canonical E.164.
4. Seven-digit local input is valid only when a default area code is supplied by configuration.
5. Canonical internal storage must use an equivalent of `normalized_e164`.
6. The implementation must not create a ConnectShyft-local fork of canonical phone identity.
7. The implementation must remain compatible with the monolithic monorepo, shared communication domain, Telnyx adapter boundary, and canonical phone identity architecture constraints.

## Acceptance Examples

- Input: `2605551212`
  Stored canonical value: `+12605551212`
- Input: `5551212` with configured default area code `260`
  Stored canonical value: `+12605551212`
- Input with alpha characters or malformed digits
  Result: validation refusal

## User Stories

### US1 - Natural Input to Canonical Storage

As a ConnectShyft operator, I want to enter phone numbers in natural domestic formats so that the system stores canonical phone identity without requiring E.164 knowledge.

Acceptance criteria:

- `2605551212` stores as `+12605551212`
- `5551212` is accepted only when a default area code is configured
- malformed or alpha-containing input is refused
- stored records include canonical phone identity fields equivalent to `normalized_e164`

### US2 - Canonical Identity Matching

As a ConnectShyft workflow, I want identity matching to compare canonical phone identity so that differently formatted equivalents resolve consistently.

Acceptance criteria:

- exact equivalent formats match the same canonical identity
- non-equivalent inputs do not match
- ambiguous matches remain ambiguous
- shared-phone cases do not silently auto-merge

## Platform Compatibility Scenarios

- No route ownership changes: ConnectShyft routes stay in `connectshyft-api`; auth/admin routes stay delegated to `admin-api`.
- Shared database compatibility: schema changes remain compatible with shared Postgres and production migration ownership by `admin-api`.
- No ingress or port changes: no Nginx, public-port, or container-topology changes are introduced by CS-002.
- Telnyx boundary compatibility: canonical phone identity stays provider-agnostic and does not move parsing or normalization into Telnyx adapters.

## Evidence Required

- unit tests for normalization behavior
- example conversions
- ADR/data-model compliance notes in feature documentation and the PR description
