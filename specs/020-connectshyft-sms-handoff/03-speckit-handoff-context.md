# Codex / SpecKit Handoff Context

Use this as the starting handoff context.

---

We have already completed substantial debugging and narrowed the issue.

## Scope

This is **not** a lane-convergence task.
This is **not** a Telnyx account configuration task.
This is **not** a general auth or webhook task.

This is a narrow debugging-and-fix task for outbound SMS dispatch in the dedicated ConnectShyft runtime.

## Live/dev runtime boundary

Relevant files:
- `apps/connectshyft-api/src/routes/api/v1/connectshyft.ts`
- `infrastructure/communications/telnyx/index.ts`
- `infrastructure/communications/index.ts`
- `apps/connectshyft-api/src/modules/connectshyft/providerRegistry.ts`

## Current confirmed findings

1. Direct Telnyx sends succeed from both orgUnit numbers in the messaging profile.
2. The running `connectshyft-api` container includes the patched SMS target-resolution logic.
3. The exported runtime resolver `resolveConnectShyftSmsTargetForTests(...)` returns success for the failing thread with:
   - `targetPhone: +12603332104`
   - `source: primary_active_valid_phone`
4. The Telnyx adapter contains an explicit error for missing `targetPhone`:
   - `Telnyx dispatch requires targetPhone for provider-backed delivery.`
5. The route wraps adapter failures as:
   - `CONNECTSHYFT_PROVIDER_DISPATCH_FAILED`
   - `Provider dispatch failed before persistence.`
6. Therefore, the current highest-probability bug is that `targetPhone` is being lost after successful target resolution and before or inside the `sendSms(...)` handoff.

## Known-good thread data

Use this failing thread for reproduction unless there is a better local equivalent:
- `threadId`: `87a56ab9-ad41-4813-9cf6-8581191accb4`
- `tenantId`: `942de4d9-3e9d-4ff9-98eb-b498fd4f496a`
- `orgUnitId`: `019d2e6d-3ea5-4b04-8722-4029e504b86e`
- `neighborId`: `4ece2124-76e2-4ac4-a06a-8ac93fc4b600`

Associated neighbor phone data is valid:
- one phone
- active
- valid
- primary
- `+12603332104`

## What has already been ruled out

Do not re-litigate these unless new evidence demands it:
- stale container / stale dist as the primary issue
- broken Telnyx API key
- broken messaging profile in general
- unusable source number in general
- missing target in the resolver’s direct test path

## Required debugging approach

Do not guess.

Instrument the runtime at these points:
1. after SMS target resolution in `performOutboundAction(...)`
2. immediately before `sendSms(...)`
3. at top of Telnyx adapter `sendSms(command)`
4. immediately before Telnyx HTTP request
5. in the Telnyx adapter catch/failure path

## Required fix goals

1. Identify exactly where `targetPhone` is lost.
2. Fix the route/adapter handoff so the resolved target reaches the adapter intact.
3. Add a defensive guard before provider dispatch so missing-target cases fail as domain refusals, not provider failures.
4. Keep the patch narrow. Do not widen into unrelated UI refactor, provider redesign, or envelope redesign.

## Nice-to-have follow-up

After the missing-target bug is fixed, inspect why the refusal appears multiple times in the UI. Treat that as a separate issue unless the logs prove it is part of the same root cause.

---
