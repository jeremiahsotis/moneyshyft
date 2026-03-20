# ConnectShyft Thread Read Notes

## Current ownership

The ConnectShyft thread read surface is currently split across these files:

- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
  - owns only route registration for:
    - `GET /threads/:threadId`
    - `GET /threads/:threadId/timeline`
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectThreadDetail.ts`
  - owns thread detail request handoff, response assembly, canonical timeline inclusion, voicemail artifact projection, and bridge-session payload shaping
- `apps/connectshyft-api/src/modules/connectshyft/handlers/getConnectThreadTimeline.ts`
  - owns thread timeline request handoff and timeline response assembly
- `apps/connectshyft-api/src/modules/connectshyft/http/threadReadContext.ts`
  - owns thread-read access/context resolution, shared `threadId` parsing, include-deleted gating, not-found refusal mapping, and current detail-contract prerequisite loading

## Why the current response shape was preserved

Slice 5 intentionally preserves the current thread detail and timeline response shapes.

That means the handlers still return the existing payloads, including:

- the current detail envelope with `thread`, `bridgeSession`, `voicemailArtifacts`, `actions`, and policy metadata
- the current timeline DTO shape
- the current canonical timeline embedding behavior inside thread detail

This was deliberate. The goal of this slice was thin-router extraction and explicit boundaries, not payload redesign.

## Long-term direction

The long-term UI direction remains a single canonical thread detail payload.

That direction is still valid, but it is deferred until after:

- thread read extraction is stable
- lifecycle actions are extracted cleanly
- later slices clarify how outbound, webhook, and neighboring identity flows should contribute to the canonical read surface

## Deferred scope

The following work remains deferred beyond the thread read family:

- lifecycle action extraction
  - claim
  - takeover
  - close
- outbound call and message extraction
- inbound SMS and inbound voice extraction
- webhook and provider-correlation extraction
- broader response redesign for canonical thread detail convergence

## Guardrails for future work

When editing thread read handlers in later slices:

1. Keep route registration thin in `connectshyft.ts`.
2. Keep shared thread-read access and refusal behavior in `threadReadContext.ts`.
3. Do not fold lifecycle mutations into the thread read handlers.
4. Do not pull outbound dispatch or webhook orchestration into the read surface.
5. Preserve current response shapes unless characterization coverage is updated intentionally.

## Explicit separation note

Lifecycle, outbound, and webhook extraction remain separate work.

They should not be folded into the thread read family as part of follow-up cleanup. The next extraction target after Slice 5 is lifecycle actions, while outbound and webhook surfaces remain intentionally deferred.
