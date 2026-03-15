# Non-Regression Rules

1. Fixing texting preference must not change provider dispatch behavior except where texting preference gating depends on the corrected value.
2. Fixing refusal rendering must not redesign the API envelope.
3. Fixing SMS target resolution must not reintroduce generic provider failure for known pre-provider validation failures.
4. No issue may silently absorb lane-convergence cleanup.
5. The three issues must preserve one coherent user experience:
   - correct texting state
   - visible refusal state
   - deterministic SMS behavior
