# Identity Resolution Model

## Status

Authoritative for the Slice 13 identity-resolution architecture and seam behavior.

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

Slice 13 adds the governing precedence rule:

- PeopleCore can block certainty
- PeopleCore cannot assert person-to-neighbor identity equivalence in this slice
- disagreement becomes explicit ambiguity

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

The Slice 13 seam preserves these ConnectShyft outcomes for exact contact-point resolution:

- verified non-shared exact match -> auto-merge allowed only when the legacy winner stays aligned with the PeopleCore-backed read path
- no exact match -> no match when PeopleCore is unavailable, has no current person link, or has one current person link and legacy resolution still has no winner
- multiple exact matches -> ambiguous with manual-resolution context
- PeopleCore multi-person current-link result -> ambiguous with manual-resolution context
- cross-system disagreement between a single current PeopleCore person and a different legacy concrete winner -> ambiguous with manual-resolution context
- shared or unverified conditions -> no-auto-merge
- deleted-only lookup exclusion where characterized

The seam does not redesign these outputs. It routes identity consultation through PeopleCore-backed lookup and hook foundations while keeping the current ConnectShyft outward behavior stable.

### 5.1 Ambiguity categories

Slice 13 documents three distinct ambiguity categories:

- legacy multi-neighbor ambiguity
- PeopleCore multi-person ambiguity
- cross-system disagreement ambiguity

### 5.2 Decision flow

```text
PeopleCore available?
  NO -> preserve legacy behavior
  YES -> current person links?
    0 -> preserve legacy behavior
    >1 -> ambiguous
    1 -> legacy outcome?
      multiple -> ambiguous
      single aligned -> preserve current exact-match behavior
      single disagreement -> ambiguous
      none -> no-match (unchanged in Slice 13)
```

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

Slice 12 now includes best-effort provisional-person creation hooks behind the seam for safe inbound `no_match` flows. These hooks do not replace ConnectShyft neighbor creation at the API boundary and do not auto-link a PeopleCore person to a ConnectShyft neighbor.

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

Still deferred beyond Slice 13:

- broad PeopleCore-driven candidate scoring inside ConnectShyft flows
- resolver UI
- full rebinding mechanics
- replacement of ConnectShyft neighbor APIs with PeopleCore person APIs
- Application Shell work
- reconciliation or crosswalk infrastructure between PeopleCore persons and ConnectShyft neighbors
- automated merge or scoring engines for cross-system identity decisions

---

## 14. Non-Goals

- full automation
- silent identity decisions
- blocking work until resolved
- reconciliation
- crosswalk
- automatic PeopleCore-to-neighbor linking
- merge engine
- scoring engine

---

## 15. Slice 14 Handoff

The next logical slice after Slice 13 is operationalization of ambiguity and resolver handling while preserving current route contracts.

It is not reconciliation, cross-system equivalence solving, or automatic PeopleCore-to-neighbor linking.
