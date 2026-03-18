# PR 023 — Duplicate Handling + Phone Uniqueness Enforcement

## Objective

Stop creation of duplicate phone assignments across neighbors and enforce deterministic identity behavior when duplicates exist.

This PR prevents further data corruption while tolerating existing legacy duplicates until cleanup.

---

## Core Requirements

### Files to Include

Create branch 023-duplicate-handling-and-phone-uniqueness-enforcement and use folder specs/023-duplicate-handling-and-phone-uniqueness-enforcement

- specs/023-duplicate-handling-and-phone-uniqueness-enforcement/05-testing.md
- specs/023-duplicate-handling-and-phone-uniqueness-enforcement/06-pr-template.md

### Phone Uniqueness Rule

Normalized E.164 phone numbers must be unique across:

- active neighbors
- non-deleted neighbors

This applies to:

- neighbor creation
- neighbor updates
- phone add/replace operations

---

### Enforcement

Any write operation that attempts to assign a phone number already in use must:

- fail deterministically
- return a structured refusal
- NOT silently override or merge

---

### Legacy Duplicate Handling

Existing duplicates (already in database):

- are allowed to remain temporarily
- must NOT be auto-resolved
- must trigger ambiguity behavior during identity resolution

---

### Identity Resolution Behavior (Reinforced)

If phone lookup returns multiple neighbors:

- MUST hard fail
- MUST NOT select arbitrarily
- MUST return explicit ambiguity refusal

---

### Soft Delete Interaction

- soft-deleted neighbors do NOT count toward uniqueness
- their phone numbers may be reused

---

### Normalization

All comparisons must use:

- canonical normalized E.164 format
- no raw string comparisons allowed

---

## Constraints

- No background deduplication in this PR
- No merge tooling in this PR
- No heuristic resolution
- Must be deterministic

---

## Out of Scope

- Identity merging workflows
- Household/shared-phone modeling
- PeopleCore integration
- Data cleanup tooling (handled in PR 024)
