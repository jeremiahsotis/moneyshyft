# Identity Resolution Model

## Status

Authoritative for the Slice 12 identity-resolution architecture and seam behavior.

---

## 1. Approach

Identity resolution is:

- deterministic
- explainable
- tunable
- non-ML (v1)

Current Slice 12 behavior also requires:

- preserving existing ConnectShyft route and module outcomes
- introducing a seam before replacing ConnectShyft-local ownership
- allowing work to continue when identity is unresolved

---

## 2. Signals

### Strong signals

- exact phone match
- exact email match
- SSN (if present)
- resolver-confirmed link

### Moderate signals

- name (first + last)
- DOB
- address
- household membership

### Supporting signals

- recent activity
- manual confirmation

---

## 3. Penalties

- shared contact (possible or confirmed)
- stale contact
- reassignment suspected
- conflicting name or DOB

---

## 4. Confidence Bands

- very_low
- low
- medium
- high
- very_high

---

## 5. Current ConnectShyft Seam Outcomes

The Slice 12 seam preserves these ConnectShyft outcomes for exact contact-point resolution:

- verified non-shared exact match -> auto-merge allowed
- no exact match -> no match
- multiple exact matches -> ambiguous with manual-resolution context
- shared or unverified conditions -> no-auto-merge
- deleted-only lookup exclusion where characterized

The seam does not redesign these outputs. It routes identity consultation through PeopleCore-backed lookup and hook foundations while keeping the current ConnectShyft outward behavior stable.

---

## 6. Confidence Reasons

System MUST expose:

- why a match is suggested
- which signals contributed
- which penalties applied

No opaque scoring allowed.

---

## 7. Friction Model

### very_low

- create new freely

### low

- light warning

### medium

- show candidates prominently
- explicit choice required

### high

- strong warning
- existing match is primary
- create-new is intentionally difficult

### very_high

- resolver override required
- normal users cannot create new

---

## 8. Resolver Workflow

Resolvers handle:

- merge decisions
- duplicate resolution
- reassignment
- shared contact confirmation
- conflict resolution

---

## 9. Resolver Review Object

Must include:

- review_type
- status
- confidence_band
- confidence_reasons
- risk_flags
- candidate_people
- context (conversation/work)
- resolution_type
- resolution_reason
- impact_summary

Slice 12 now persists `ResolverReview` records in PeopleCore and can create them through non-breaking seam hooks on ambiguous ConnectShyft paths.

---

## 10. Provisional Identity

- created under uncertainty
- fully usable
- subject to later resolution

Slice 12 now includes best-effort provisional-person creation hooks behind the seam for safe inbound `no_match` flows. These hooks do not replace ConnectShyft neighbor creation at the API boundary.

---

## 11. Create-New Requirements

Required:

- first name
- last name
- contact point
- DOB capture status

Plus at least one:

- DOB
- email
- address
- household

---

## 12. Operational Conditions

ContactPoint states influence confidence:

- shared_possible
- shared_confirmed
- stale
- reassignment_suspected

---

## 13. Deferred Work

Still deferred beyond Slice 12:

- broad PeopleCore-driven candidate scoring inside ConnectShyft flows
- resolver UI
- full rebinding mechanics
- replacement of ConnectShyft neighbor APIs with PeopleCore person APIs
- Application Shell work

---

## 14. Non-Goals

- full automation
- silent identity decisions
- blocking work until resolved

---

## 15. Slice 13 Target

Slice 13 should focus on ConnectShyft identity refinement and a controlled migration of more identity authority behind the seam while preserving current route contracts.
