# Codex Checkpoint Spec (Reusable)

Every checkpoint MUST include:

1. FILES
   - Exact repo paths

2. REQUIRED CHANGES
   - Functions, queries, logic

3. DATA MUTATIONS
   - DB writes/reads

4. GUARDS
   - Idempotency + state checks

5. STOP CONDITION
   - Verifiable outcome in repo or DB

6. COMMIT POINT
   - Explicit commit required before proceeding

NO checkpoint may be:
- conceptual
- descriptive only
- missing stop conditions
