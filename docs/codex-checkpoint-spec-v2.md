# Codex Checkpoint Spec (Reusable — STRICT)

Every checkpoint MUST include ALL of the following:

---

## 1. FILES (Exact Paths)
- Absolute repo-relative paths
- No globbing unless explicitly required

---

## 2. FUNCTION SIGNATURES (Exact)
- Exact function names
- Exact parameters (name + type)
- Return types

Example:
```ts
function triggerVoicemailFallback(sessionId: string): Promise<void>
```

---

## 3. LINE-LEVEL DIFF EXPECTATIONS (MANDATORY)

Each checkpoint MUST include explicit diff-style expectations.

Example:
```diff
+ function triggerVoicemailFallback(sessionId: string): Promise<void> {
+   // implementation
+ }
```

OR for DB:
```diff
+ ALTER TABLE call_sessions ADD COLUMN telnyx_voicemail_call_control_id TEXT;
```

Rules:
- Must show what is added or modified
- Must be specific enough to compare against git diff
- No “implement logic” language allowed

---

## 4. REQUIRED CHANGES
- Concrete implementation steps
- No ambiguity
- No interpretation required

---

## 5. DATA MUTATIONS
- Exact DB writes/reads
- Explicit fields and values

Example:
- update call_sessions set state = 'voicemail_fallback_started'

---

## 6. GUARDS (MANDATORY)
- Idempotency rules
- State validation rules

Example:
```ts
if (session.telnyx_voicemail_call_control_id != null) return
```

---

## 7. STOP CONDITION (VERIFIABLE)

Must be provable via ONE of:
- SQL query result
- test result
- specific log output
- file existence

Example:
- SELECT telnyx_voicemail_call_control_id IS NOT NULL

---

## 8. COMMIT POINT (MANDATORY)
- Explicit commit required before proceeding

Example:
```bash
git add .
git commit -m "feat(connectshyft): implement voicemail fallback trigger"
```

---

## 9. PROHIBITED
- vague language ("handle", "support", "implement logic")
- missing diff expectations
- missing function signatures
- missing stop conditions

