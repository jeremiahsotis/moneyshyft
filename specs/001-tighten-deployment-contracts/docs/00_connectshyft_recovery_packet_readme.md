# ConnectShyft Recovery Packet

This packet is the corrective implementation contract for ConnectShyft comms recovery.

Use these documents together. They are written to stop drift, prevent scope creep, and keep the work aligned with the current repo, the approved ConnectShyft interaction prototype, upcoming People Core Domain work, and the reusable UI direction.

## Files in this packet

1. `01_connectshyft_remediation_contract.md`
   - master decision document
   - scope boundaries
   - execution order
   - done criteria

2. `02_connectshyft_phone_identity_and_normalization_spec.md`
   - operator phone storage model
   - friendly input to canonical E.164 conversion rules
   - API and persistence contract

3. `03_connectshyft_telnyx_outbound_bridge_spec.md`
   - outbound SMS and voice adapter behavior
   - Telnyx integration contract
   - bridge flow, webhook handling, idempotency, audit

4. `04_connectshyft_ux_ui_rebuild_spec.md`
   - full UX/UI remediation contract
   - mobile-first behavior
   - desktop expansion rules
   - component boundaries and acceptance criteria

5. `05_connectshyft_repo_findings_and_patch_targets.md`
   - concrete repo findings
   - why current ConnectShyft UI still looks wrong
   - exact patch targets and migration constraints

## Recommended implementation order

1. lock the remediation contract
2. implement phone identity and normalization
3. implement real Telnyx outbound SMS and voice bridge path
4. wire webhook-driven bridge state, idempotency, and audit completion
5. rebuild ConnectShyft UI against the approved shell and component rules
6. remove stale provider naming and route/view drift that keeps surfacing old shells

## Non-negotiable boundaries

- Do not put operator phone state on `users.phone` as a quick hack.
- Do not expose E.164 as a user-facing requirement.
- Do not branch domain logic on provider-specific payload shape outside the adapter boundary.
- Do not rebuild ConnectShyft UI as a one-off design system that fights reusable shell/component work.
- Do not let ConnectShyft own People Core. It may depend on a People-ready identity pattern, but it must not preclude later extraction.
- Do not ship more Twilio-named concepts in new code.

## Intended outcome

After this packet is executed, ConnectShyft should have:

- real operator phone storage
- real outbound SMS support
- real bridged outbound voice support
- replay-safe webhook processing
- durable audit trail and idempotent dispatch behavior
- a conversation-first UI that matches the approved direction instead of the current admin-card drift
