# Master Codex Bootstrap Prompt — Prep Step 2B

You are implementing **Prep Step 2B** for ConnectShyft/PeopleCore using the existing specs already present in the repo.

## Spec locations

Use the files already present in the repo under `specs/`:

- `specs/prep_step_2B_implementation_brief.md`
- `specs/prep_step_2B_checkpoint_1_resolver_queue_and_claim_lifecycle.md`
- `specs/prep_step_2B_checkpoint_2_rebind_policy_and_review_queue_creation.md`
- `specs/prep_step_2B_checkpoint_3_peopleview_primary_resolver_workspace.md`
- `specs/prep_step_2B_checkpoint_4_connectshyft_contextual_banners_and_refresh.md`

Treat those files as authoritative. Do not invent scope outside them.

---

## Mission

Complete the **Rebinding Completion and Resolver Operational Surfaces** slice so that tenant-admin resolvers can work a real resolver queue, review-class rebind work becomes operational queue work, PeopleView becomes the primary resolver workspace, and ConnectShyft shows only contextual unresolved identity/rebind state where relevant.

This is a **completion-and-hardening sequence**, not a greenfield implementation and not an architectural cleanup pass.

Your job is to execute the four checkpoints **in order**, preserving the current repo architecture while closing the specific gaps defined in the implementation brief and checkpoint specs.

---

## Non-negotiable operating rules

1. **Do not redesign architecture.**
   - Do not create a second queue system.
   - Do not move queue/rebind truth into the frontend.
   - Do not make ConnectShyft the primary resolver workspace.
   - Do not replace the existing PeopleCore / ConnectShyft split.

2. **Do not expand scope.**
   - No resolver claim timeout/expiry
   - No broad shell redesign
   - No visible resolution-history UI
   - No advanced SLA/reminder/escalation workflows
   - No non-tenant-admin resolver roles
   - No CaseShyft work
   - No notification work beyond what the slice explicitly requires
   - No AI-assisted resolution or queue prioritization

3. **PeopleCore and backend services remain authoritative.**
   - Resolver truth: PeopleCore
   - Resolver-decision backbone: Slice 2A outputs
   - Rebind history truth: existing backend model
   - Queue truth: backend-owned and contract-backed
   - Frontend consumes state only

4. **Resolver authority is tenant-admin-only in MVP.**
   - Tenant admins are automatically eligible resolvers
   - Claim before action is required
   - Claims do not expire automatically

5. **PeopleView is the primary resolver workspace.**
   - Queue browsing and work processing center there
   - ConnectShyft is contextual only

6. **Threads must follow contact-point reassignment.**
   - Existing threads always follow new subject truth through backend rebind logic
   - Review-class rebind work must become queue work

7. **No engineering leakage into user-facing behavior.**
   - No IDs/debug values in banners
   - No frontend inference from raw notes or loose strings
   - No resolver internals shown to normal operators after resolution

8. **Work surgically.**
   - Preserve existing architecture wherever it already matches the spec
   - Prefer extension/completion over replacement
   - Do not refactor for style

---

## Execution order (mandatory)

Execute these checkpoints in this exact order:

1. `specs/prep_step_2B_checkpoint_1_resolver_queue_and_claim_lifecycle.md`
2. `specs/prep_step_2B_checkpoint_2_rebind_policy_and_review_queue_creation.md`
3. `specs/prep_step_2B_checkpoint_3_peopleview_primary_resolver_workspace.md`
4. `specs/prep_step_2B_checkpoint_4_connectshyft_contextual_banners_and_refresh.md`

Do not skip ahead. Do not merge checkpoints. Do not reorder them.

---

## Required workflow for each checkpoint

For **each checkpoint**, follow this exact process:

### Step A — Read before changing
- Read the implementation brief
- Read the current checkpoint spec
- Inspect the exact files listed in scope
- Identify existing repo behavior that already satisfies the checkpoint
- Limit changes to the minimum needed to satisfy the checkpoint

### Step B — Implement only the checkpoint
- Apply only the changes required by that checkpoint
- Do not start future checkpoint work early unless a tiny prerequisite is unavoidable
- If an unavoidable prerequisite is needed, keep it minimal and directly supportive

### Step C — Verify before stopping
Run the verification commands from the checkpoint spec.

Also run any checkpoint-specific tests you added or updated.

Do not declare the checkpoint complete until its stop condition is met.

### Step D — Commit at the checkpoint boundary
Use the **exact commit message** defined in the checkpoint spec.

Then move to the next checkpoint.

---

## Checkpoint commit messages (must be exact)

1. `feat(connectshyft): lock resolver queue model and claim lifecycle`
2. `feat(connectshyft): operationalize rebind policy and enqueue review-class rebind work`
3. `feat(connectshyft-web): make PeopleView the primary resolver workspace`
4. `feat(connectshyft-web): add contextual identity banners and refresh subject truth after resolution`

Do not combine commits. Do not rename commits.

---

## Global success criteria

At the end of all four checkpoints, the following must be true:

- One backend-authoritative Resolver Queue model exists
- Queue item types `identity_review` and `rebind_review` are both supported
- Only tenant admins can act as resolvers for queue work
- Claim-before-action is enforced
- Claim exclusivity is enforced
- Claims do not auto-expire
- `auto_rebind` vs `review_rebind` behavior is explicit and backend-authoritative
- Existing threads always follow contact-point reassignment
- Review-class rebind consequences become active queue work
- PeopleView is the primary resolver workspace
- ConnectShyft shows contextual unresolved-state banners only when the current thread is materially impacted
- Final resolved truth appears in the subject snapshot
- Normal operators see final truth except for materially relevant unresolved warnings
- No frontend consumer invents queue/rebind semantics from raw strings or notes

---

## Behavioral locks you must preserve

### Resolver operating model
- Resolver in MVP = tenant admin only
- Tenant admins are automatically eligible resolvers
- A queue item must be claimed before action
- One claimant at a time
- No automatic claim expiry
- Claim persists until resolved, dismissed, or explicitly released

### Queue model
- One Resolver Queue workspace
- Two typed item classes:
  - `identity_review`
  - `rebind_review`
- PeopleView = primary resolver workspace
- ConnectShyft = contextual only

### Rebind model
- Existing threads always follow contact-point reassignment
- Objects that should follow current truth may auto-rebind
- Historically sensitive or semantically risky objects remain `review`
- `review_rebind` work becomes queue work
- Rebind history remains authoritative

### Visibility model
- Tenant-admin resolvers see queue work and claim state
- Normal operators see final truth except unresolved warnings relevant to current thread/work
- Backend-only audit in MVP
- No visible resolution-history UI

### Thread-detail UX
- Banner = temporary unresolved condition
- Subject snapshot = stable resolved truth
- Banner disappears after resolution
- Any resolver affordance in thread detail remains secondary and points back to PeopleView

---

## How to behave if repo reality conflicts with the checkpoint

If you find a mismatch between current repo code and the checkpoint spec:

1. Prefer the checkpoint spec and implementation brief
2. Preserve existing architecture where possible
3. Make the smallest change necessary to bring repo behavior into compliance
4. Do not widen scope
5. Do not substitute a “cleaner” architecture

If a checkpoint cannot be completed without violating a prior checkpoint, stop and report the exact conflict with:
- file
- function
- conflicting behavior
- why it blocks the checkpoint

Do not silently improvise around the conflict.

---

## Required discipline around queue/rebind semantics

### Queue
- One backend-owned queue model
- No separate frontend queue truth
- No ad hoc item-type semantics
- Active vs terminal behavior must be contract-backed
- Claim/release rules must be backend-enforced

### Rebind
- Preserve `rebind_class = auto | review`
- No second rebind classification system
- Existing threads must follow contact-point reassignment
- Review-class consequences must become queue work
- Queue creation for review-class rebind must be deduplicated and replay-safe

### PeopleView
- Primary workspace for resolver work
- Contract-backed filters/grouping
- Claimed-by-other state explicit and non-actionable
- Backend-driven claim/release only

### ConnectShyft thread detail
- Secondary/contextual only
- Banner only when current thread is materially impacted
- Plain-language warning content
- Final truth in subject snapshot
- Stale unresolved indicators must disappear after backend truth changes

---

## Verification discipline

After each checkpoint:

- Run the checkpoint's verification commands
- Run targeted tests for the files and behaviors changed
- Confirm the checkpoint stop condition is met
- Commit with the exact required message

At the end of all four checkpoints:

- Run the full relevant test suite for resolver queue behavior, rebind queue creation, PeopleView resolver workspace behavior, and thread-detail contextual banner/subject-refresh behavior
- Summarize:
  - files changed
  - tests added/updated
  - any narrow technical debt intentionally left for later slices

---

## Final instruction

Execute the repo's existing spec-defined plan exactly.

This is not an opportunity to re-architect.  
This is an opportunity to finish the resolver operational layer and rebind surfaces without drift.
