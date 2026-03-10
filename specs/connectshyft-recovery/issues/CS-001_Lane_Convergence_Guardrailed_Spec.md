# CS-001 Lane Convergence (Guardrailed Spec)

This issue is governed by the ConnectShyft Recovery Execution Packet:

/specs/connectshyft-recovery/developer_execution_packet.md

PRs must use the ConnectShyft Recovery template:

.github/pull_request_template/connectshyft_recovery.md

PRs that do not reference the Execution Packet will not be accepted.

## A. Outcome
ConnectShyft runs from a single authoritative frontend application. All ConnectShyft UI rendering originates from `apps/connectshyft-web`.

## B. Scope
- Consolidate ConnectShyft UI into `apps/connectshyft-web`
- Remove duplicate ConnectShyft UI from `apps/moneyshyft-web`
- Ensure CI/tests reference the correct app
- Restore UI parity with THE_GOAL prototype

## C. Non‑Goals
- No redesign of ConnectShyft UI
- No framework migration
- No changes to ProgramShyft or CaseShyft

## D. Implementation Guardrails
1. `apps/connectshyft-web` becomes the only ConnectShyft frontend.
2. Shared primitives may be extracted into reusable UI components if needed.
3. CI must fail if ConnectShyft UI appears in `moneyshyft-web`.
4. Playwright tests must run against `connectshyft-web`.

## E. Acceptance Criteria
- Inbox matches prototype layout
- Thread detail matches prototype layout
- Desktop layout renders queue + thread + right rail
- Only one ConnectShyft frontend exists

## F. Evidence Required in PR
- screenshots of inbox + thread views
- CI run showing correct frontend target