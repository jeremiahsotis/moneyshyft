# Master Codex Bootstrap Prompt — Prep Step 4.5

Use these authoritative specs in `specs/`:

- `specs/prep_step_4_5_implementation_brief.md`
- `specs/prep_step_4_5_checkpoint_1_claim_persistence_actor_id.md`
- `specs/prep_step_4_5_checkpoint_2_strict_peoplecore_outbound_sms_target.md`
- `specs/prep_step_4_5_checkpoint_3_inbound_first_sms_identity_and_review.md`
- `specs/prep_step_4_5_checkpoint_4_operator_callback_and_readiness_copy.md`

## Mission
Fix the communications blockers that currently prevent a trustworthy MVP:
- claim persistence
- strict PeopleCore outbound SMS targeting
- inbound-first SMS provisional/review creation
- operator callback/readiness resolution
- misleading readiness/engineering copy

## Non-negotiable rules
1. **Path A — strict PeopleCore is locked**
   - no legacy neighbor-phone fallback for outbound SMS targets
2. **Inbound-first SMS must work without prior outbound correlation**
   - destination-number mapping is enough to continue
3. **Do not redesign architecture**
   - no telephony redesign
   - no shell redesign
   - no CaseShyft
   - no new modules
4. **No engineering leakage**
   - user-facing copy must not overstate readiness
5. **Work surgically**
   - fix the exact seams identified

## Execution order (mandatory)
1. checkpoint 1
2. checkpoint 2
3. checkpoint 3
4. checkpoint 4

Use the exact commit message in each checkpoint. Do not drift.
