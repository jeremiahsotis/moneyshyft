# Codex Implementation Brief Spec (Reusable — STRICT)

Every implementation brief MUST include:

---

## 1. OBJECTIVE
- Clear, single-purpose outcome

---

## 2. ARCHITECTURAL DECISIONS (LOCKED)
- Explicit decisions
- No optionality

---

## 3. EXECUTION FLOW
- Step-by-step system behavior
- No ambiguity

---

## 4. STATE MACHINE
- Explicit states
- Explicit transitions

---

## 5. DATABASE CONTRACTS
- Exact tables
- Exact fields
- Types + constraints

---

## 6. SERVICE LAYER (STRICT)

For each function:
- File path
- Function signature (exact types)
- Responsibility

Example:
```ts
function handleNeighborTimeout(sessionId: string): Promise<void>
```

---

## 7. PROVIDER / INTEGRATION CONTRACTS
- Exact API expectations
- Required fields (e.g. call_control_id)

---

## 8. EVENT HANDLING
- Explicit event → handler mapping

Example:
- call.recording.saved → handleRecordingSaved()

---

## 9. IDEMPOTENCY RULES
- Exact guard conditions
- Exact fields used

---

## 10. FAILURE MODES
- Explicit handling paths

---

## 11. TEST CONTRACT
- Required test files
- Required scenarios

---

## 12. CHECKPOINTS (MANDATORY — USE CHECKPOINT SPEC)

Each checkpoint MUST include:
- FILES
- FUNCTION SIGNATURES
- LINE-LEVEL DIFF EXPECTATIONS
- REQUIRED CHANGES
- DATA MUTATIONS
- GUARDS
- STOP CONDITION
- COMMIT POINT

---

## 13. DEFINITION OF DONE
- Measurable, testable conditions

---

## 14. NON-GOALS
- Explicit exclusions

---

## 15. FUTURE EXTENSION POINTS
- Must not constrain future evolution

---

## GLOBAL RULES

- No placeholders
- No implied behavior
- No interpretation required
- Codex must be able to execute without guessing
