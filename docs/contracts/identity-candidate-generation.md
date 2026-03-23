# Contract: Identity Candidate Generation

## Purpose
Candidate generation defines which subjects are allowed into the scoring phase.

The goal is not to find every possible person.
The goal is to produce a small, explainable, evidence-based candidate set.

## Owner
PeopleCore owns candidate generation.

## Locked rules

### 1. Deterministic
The same inputs must produce the same candidate set in the same order.

### 2. Explainable
Every generated candidate must have a generation reason.

Allowed reasons:
- current_person_link
- current_household_link
- historical_person_link
- historical_household_link
- current_household_member

### 3. Bounded
Maximum candidates returned to scoring: 10

If more than 10 are discovered:
- preserve generation order priority
- dedupe
- truncate after priority ordering

## Inputs
- normalized ContactPoint
- current ContactPointLinks
- historical ContactPointLinks
- current household links
- recent activity context
- resolver review context

## Required generation order

### Step 1 — Current person links
Generate candidate people directly linked by current ContactPointLink records.

### Step 2 — Current household links
Generate candidate households directly linked by current ContactPointLink records.

### Step 3 — Historical person links
Only if no current person links exist.

### Step 4 — Historical household links
Only if no current household links exist.

### Step 5 — Household members from current household links
Only when:
- a current household link exists
- the household member is active

These are indirect candidates and must be marked as such.

## Dedupe rules
- dedupe people by personId
- dedupe households by householdId
- if a subject appears through multiple reasons, retain the strongest direct reason
- direct reason outranks indirect household-member reason
- current reason outranks historical reason

## Exclusions
Never generate:
- archived people
- merged non-surviving people
- suppressed people
- archived households

## Anti-expansion rules
Do not:
- search the global fuzzy people pool from contact point alone
- generate candidates from name or address without contact-link evidence
- generate candidates from orgUnit history alone

## Why this lock exists
Without this lock, the system drifts into overmatching.
That creates false positives, noisy resolver queues, and operator mistrust.

## Output shape
Each candidate must include:
- subject_type
- subject_id
- generation_reason
- directness (direct | indirect)
- recency_hint (current | historical)
- supporting_link_ids
