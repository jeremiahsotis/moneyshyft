# Contract: Patch 2 Refusal Rendering

## Objective

Preserve refusal semantics through the shared frontend action contract and inbox rendering path without changing backend refusal builders or transport semantics.

## Allowed runtime surface

- `apps/connectshyft-web/src/features/connectshyft/threads.ts`
  - shared action result types
  - refusal parsing
  - action execution wrappers
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftInboxView.vue`
  - refusal banner state and rendering
  - message and call submit handling
- Optional alignment only if needed
  - `apps/connectshyft-web/src/features/connectshyft/uiContracts.ts`
  - `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue`

## Required behavior

- HTTP 200 plus `ok: false` is rendered as a refusal.
- Business refusals remain distinct from transport failures.
- Refusal code, message, and structured details remain available to the UI.
- The thread action and result shape becomes the only allowed Patch 2 to Patch 3 bridge.
- A focused wrapper-level assertion or fixture comparison proves refusal `code`, `message`, and structured `data` survive wrapper normalization.

## Must hold constant

- `apps/connectshyft-api/src/platform/envelopes/response.ts`
- `libs/platform/src/envelopes/response.ts`
- backend refusal builders and top-level envelope shape
- texting preference persistence rules
- SMS target resolution rules
