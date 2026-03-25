# Master Codex Bootstrap Prompt — Prep Step 4

You are implementing **Prep Step 4 — THE_GOAL UI, Interaction Polish, and Conversation Launcher (Mobile-First)** for ConnectShyft/PeopleCore.

All specs already exist in the repo under `specs/`. Treat them as authoritative.

---

## Spec locations

Use:

- specs/prep_step_4_implementation_brief.md
- specs/prep_step_4_checkpoint_4A_design_system_and_interaction_primitives.md
- specs/prep_step_4_checkpoint_4B_inbox_mine_directory_settings.md
- specs/prep_step_4_checkpoint_4C_thread_detail_voicemail_snapshot.md
- specs/prep_step_4_checkpoint_4D_content_cleanup_and_responsive_QA.md
- specs/prep_step_4_checkpoint_4E_conversation_launcher.md

Do not invent scope outside these specs.

---

## Mission

Deliver the mobile-first THE_GOAL UI layer so that the system stops feeling like an internal tool and starts feeling like a trustworthy, human-facing MVP.

This step must:
- enforce mobile-first as a hard constraint
- apply a shared calm design language
- improve Inbox, Mine, Directory, Settings, and Thread Detail
- make voicemail feel like normal conversation content
- remove all engineering artifacts from user-facing UI
- add a single **Conversation Launcher** for Call + SMS
- keep all actions thread-first and identity-safe

This is a **completion and polish slice**, not a redesign of backend architecture.

---

## Non-negotiable operating rules

1. **Mobile-first is mandatory**
   - mobile is the source layout
   - desktop is an expansion, not a redesign
   - if a solution is not mobile-first, it is out of bounds

2. **Do not redesign backend architecture**
   - no telephony redesign
   - no identity model redesign
   - no shell redesign
   - no resolver workflow redesign

3. **Do not expand scope**
   - no CaseShyft
   - no analytics/dashboard work
   - no new modules
   - no visible resolution-history UI
   - no shared/team recent contacts
   - no separate new-message surface

4. **Conversation-first**
   - timeline is primary
   - metadata is secondary
   - voicemail is content, not an exception object

5. **One launcher for Call + SMS**
   - target selection first
   - explicit channel choice second
   - all actions attach to or create a thread
   - unknown numbers may be contacted immediately
   - provisional identity is created only after action starts

6. **No engineering leakage**
   - no IDs
   - no debug labels
   - no placeholder/dev copy
   - no internal/provider jargon

7. **Work surgically**
   - use the existing shell and backend
   - extend presentation and interaction surfaces
   - do not refactor for style

---

## Execution order (MANDATORY)

Execute checkpoints in this exact order:

1. specs/prep_step_4_checkpoint_4A_design_system_and_interaction_primitives.md
2. specs/prep_step_4_checkpoint_4B_inbox_mine_directory_settings.md
3. specs/prep_step_4_checkpoint_4C_thread_detail_voicemail_snapshot.md
4. specs/prep_step_4_checkpoint_4D_content_cleanup_and_responsive_QA.md
5. specs/prep_step_4_checkpoint_4E_conversation_launcher.md

Do not reorder. Do not combine.

---

## Required workflow for each checkpoint

### Step A — Read first
- read implementation brief
- read checkpoint spec
- inspect scoped files
- identify what already exists
- plan minimal changes

### Step B — Implement only that checkpoint
- do not start future checkpoint work early
- do not widen scope

### Step C — Verify
- run checkpoint verification commands
- run tests
- confirm stop condition

### Step D — Commit (exact message)

Use these exact commit messages:

1.
feat(connectshyft-web): add mobile-first design system and shared interaction primitives

2.
feat(connectshyft-web): restyle inbox, mine, directory, and settings for THE_GOAL UX

3.
feat(connectshyft-web): restyle thread detail, voicemail, and snapshot surfaces for THE_GOAL UX

4.
feat(connectshyft-web): remove engineering artifacts and finalize mobile-first content polish

5.
feat(connectshyft-web): add mobile-first conversation launcher for call and sms

Do not combine commits.

---

## Global success criteria

At the end of Prep Step 4:

- app visually follows THE_GOAL direction
- mobile-first is true across all surfaces
- Inbox/Mine/Directory/Settings feel calm and searchable
- thread detail centers the conversation
- voicemail is usable and readable in the timeline
- no engineering artifacts are visible anywhere user-facing
- one Conversation Launcher supports both Call and SMS
- all outbound interactions are thread-first
- recent contacts are only for the logged-in user
- the system feels cohesive, safe, and trustworthy

---

## Behavioral locks

### Design
- calm
- rounded
- readable
- volunteer-first
- same language across breakpoints

### Thread detail
- conversation is primary
- metadata is secondary
- desktop may use right rail
- banners/snapshot remain compatible with prior steps

### Conversation Launcher
- one surface for Call + SMS
- no separate dialer vs SMS split
- target selection before channel choice
- no auto-call / auto-text
- thread-first outcome always

### Recent contacts
- logged-in-user scoped only
- never tenant-wide
- never orgUnit-wide
- never shared recents

---

## If repo conflicts with spec

If you find a mismatch:

1. Prefer the spec
2. Preserve architecture
3. Make the smallest change possible
4. Do not widen scope
5. If blocked, report:
   - file
   - function
   - conflict
   - why it blocks

Do not improvise.

---

## Verification discipline

After each checkpoint:
- run grep verification commands
- run tests
- confirm stop condition

At end:
- verify no engineering artifacts remain
- verify mobile-first layouts
- verify launcher/thread-first behavior
- verify recents are user-scoped
- verify Slice 2B + Prep Step 3 still work

---

## Final instruction

Execute exactly as defined.

Do not redesign.  
Do not drift.  
Finish the human-facing MVP UI.
