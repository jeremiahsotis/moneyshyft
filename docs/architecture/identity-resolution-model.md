# Identity Resolution Model

## Status

Authoritative

---

## 1. Approach

Identity resolution is:

- deterministic
- explainable
- tunable
- non-ML (v1)

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

## 5. Confidence Reasons

System MUST expose:

- why a match is suggested
- which signals contributed
- which penalties applied

No opaque scoring allowed.

---

## 6. Friction Model

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

## 7. Resolver Workflow

Resolvers handle:

- merge decisions
- duplicate resolution
- reassignment
- shared contact confirmation
- conflict resolution

---

## 8. Resolver Review Object

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

---

## 9. Provisional Identity

- created under uncertainty
- fully usable
- subject to later resolution

---

## 10. Create-New Requirements

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

## 11. Operational Conditions

ContactPoint states influence confidence:

- shared_possible
- shared_confirmed
- stale
- reassignment_suspected

---

## 12. Non-Goals

- full automation
- silent identity decisions
- blocking work until resolved
