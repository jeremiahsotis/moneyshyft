# Contract: Patch 1 Texting Preference Persistence and Display

## Objective

Restore canonical `prefersTexting` capture, persistence, serialization, and operator-visible display without touching refusal rendering or SMS target selection.

## Allowed runtime surface

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - `parseNeighborCreateBody`
  - `parseNeighborUpdateBody`
  - POST and PUT neighbor handlers
  - `updateNeighborWithSideEffects`
  - route-local neighbor create and update command forwarding that currently drops `prefersTexting`
- `apps/connectshyft-api/src/modules/connectshyft/neighbors.ts`
  - create and update input shapes
  - persistence defaults
  - serializer mapping
  - sync and async service and store create and update paths
- `apps/connectshyft-api/src/modules/connectshyft/smsPreferenceOverrides.ts`
  - `AsyncConnectShyftSmsPreferenceOverrideService.resolvePreference` as the required bridge that keeps SMS gating aligned with the canonical persisted value

## Consumer verification surfaces

- `apps/connectshyft-web/src/features/connectshyft/neighbors.ts`
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftNeighborCreateView.vue`
- `apps/connectshyft-web/src/views/ConnectShyft/ConnectShyftNeighborProfileView.vue`
- `apps/connectshyft-web/src/components/connectshyft/ConnectShyftNeighborSnapshot.vue`
- `apps/connectshyft-web/src/features/connectshyft/presentation.ts`

## Required behavior

- New neighbors default to `YES`.
- Saved `YES`, `NO`, and `UNKNOWN` values round-trip without coercion.
- Returned payloads remain canonical.
- Displayed values match persisted values.
- SMS gating uses the same authoritative durable neighbor preference when that neighbor can be resolved.

## Out of scope

- Shared thread action and refusal rendering changes
- Envelope changes
- SMS target resolution changes
- Provider changes
