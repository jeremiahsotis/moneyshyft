# PR 022 — Inbound SMS Identity Resolution + Raw Body Capture

## Objective

Implement deterministic inbound SMS neighbor resolution using a replaceable identity resolver boundary, and ensure webhook signature validation by capturing raw request bodies.

This PR fixes the current production gap where inbound SMS cannot resolve a neighbor unless metadata or thread correlation exists.

---

## Core Requirements

### Identity Resolution Precedence

Inbound SMS must resolve neighbor identity in the following order:

1. Explicit webhook metadata (neighborId)
2. Thread correlation
3. Phone-based identity resolution (resolver boundary)
4. New neighbor creation

No other fallbacks are allowed.

---

### Resolver Boundary (Critical)

Introduce a subject-resolution interface:

resolveSubjectByContactPoint(input)

This must:

- be tenant-scoped
- accept normalized contact point (E.164)
- return:
  - single match
  - no match
  - multiple matches

Implementation in this PR:

- ConnectShyft-local
- uses phone matching via identityBoundary

Future:

- replaceable by PeopleCore / Identity Resolution

---

### Phone Match Behavior

- 1 match → use neighbor
- 0 matches → create new neighbor
- > 1 matches → hard fail (ambiguous)

---

### Neighbor Auto-Creation

When no match:

Create neighbor with:

- primary phone = sender phone
- phone is active + valid
- prefers_texting = UNKNOWN initially
- minimal profile (no name required)
- audit record

---

### Prefers Texting Rule

On inbound SMS:

- if prefers_texting = UNKNOWN → set to YES
- if YES or NO → do not override

---

### Soft-Deleted Neighbor Behavior

If inbound SMS matches a soft-deleted neighbor:

- DO NOT resurrect
- DO NOT fail
- CREATE NEW neighbor

---

### Raw Body Capture (Required)

Replace:

app.use(express.json());

With:

app.use(express.json({
verify: (req, \_res, buf) => {
(req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
},
}));

This is required for webhook signature validation.

---

## Constraints

- Must remain compatible with future PeopleCore identity resolution
- No direct DB logic in route (use resolver boundary)
- No silent fallbacks or heuristic guessing
- Must be deterministic

---

## Out of Scope

- Identity merging
- Duplicate resolution tooling
- Sender number architecture
- Timeline projection
