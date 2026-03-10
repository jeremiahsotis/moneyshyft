# Contract: CS-001 UI Ownership

## Objective

Guarantee that ConnectShyft UI is authored and rendered only from `apps/connectshyft-web`.

## Ownership Rules

1. All ConnectShyft view files belong under:
   - `apps/connectshyft-web/src/views/ConnectShyft/`
2. All ConnectShyft UI components belong under:
   - `apps/connectshyft-web/src/components/connectshyft/`
3. ConnectShyft feature UI helpers belong under:
   - `apps/connectshyft-web/src/features/connectshyft/`
4. `apps/moneyshyft-web` must not contain ConnectShyft UI views/components after convergence.

## Required Migration Set (minimum)

- `ConnectShyftComposer.vue`
- `ConnectShyftMessageBubble.vue`
- `ConnectShyftPill.vue`
- `ConnectShyftQueueCard.vue`
- `ConnectShyftThreadActionBar.vue`
- `ConnectShyftThreadHeader.vue`
- `ConnectShyftVoicemailCard.vue`
- `connectShyftTokens.ts`
- `ConnectShyftDirectoryView.vue` (if directory route is retained)
- `settingsAccess.ts` (if admin-settings gating from More/settings routes is retained)

## Deletion Rules

After migration and import rewiring, delete from `apps/moneyshyft-web`:

- `src/views/ConnectShyft/*`
- `src/components/connectshyft/*`
- `src/features/connectshyft/*` (unless explicitly moved to a shared, non-lane path first)

