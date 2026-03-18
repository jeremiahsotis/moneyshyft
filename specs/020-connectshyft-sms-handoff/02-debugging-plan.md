# Debugging Plan

## Goal

Trace one outbound SMS send from:
- UI action
- route-level target resolution
- dispatch command construction
- Telnyx adapter input
- Telnyx HTTP request payload
- thrown error, if any

without guessing.

## Work on a development machine only

This plan assumes:
- local source is editable
- container rebuild/restart is cheap
- temporary logs are acceptable

## Step 1: apply temporary instrumentation

Apply `patch-02-runtime-instrumentation.diff` or the combined patch.

This adds logs at four critical points:

1. immediately after SMS target resolution in `performOutboundAction(...)`
2. immediately before `providerSelection.adapter.sendSms(...)`
3. at the top of Telnyx adapter `sendSms(command)`
4. immediately before Telnyx request dispatch and on Telnyx adapter failure

## Step 2: add the defensive route guard

Apply `patch-01-defensive-route-guard.diff` or the combined patch.

This ensures that if `outboundMessageTargetPhone` is ever falsey before dispatch, the route fails closed with a domain refusal instead of surfacing a fake provider failure.

## Step 3: rebuild and restart the dev runtime

Rebuild and restart the ConnectShyft API so the compiled runtime matches source.

## Step 4: reproduce exactly one outbound SMS send

Use a neighbor/thread with known-good data:
- one active valid primary phone
- `prefers_texting = YES`
- same tenant and orgUnit used in prior successful resolver test

Avoid changing multiple variables at once.

## Step 5: capture the logs in order

The key log chain should be:

1. `SMS_TARGET_AFTER_RESOLUTION`
2. `SMS_DISPATCH_COMMAND`
3. `TELNYX_SENDSMS_COMMAND`
4. `TELNYX_SENDSMS_REQUEST_PAYLOAD`
5. `TELNYX_SENDSMS_ERROR` (if any)

## Step 6: compare values across the handoff

Expected values should remain stable across the chain.

At minimum, these should match:
- `threadId`
- `targetPhone`
- `body`
- `providerKey`

If the route log shows a valid target, but the Telnyx adapter log shows a missing target, the bug is in the handoff between route and adapter.

If the Telnyx adapter input is correct but the request payload is wrong, the bug is in Telnyx payload construction.

If the request payload is correct but Telnyx still rejects, inspect the adapter error response body and status.

## Step 7: inspect for duplicate submission if needed

Only after the missing-target bug is isolated, inspect why the UI shows the refusal multiple times.

Possible follow-up checks:
- repeated request submission from the view
- wrapper + banner + view all rendering the same refusal
- one thread-creation success plus multiple send attempts

## Decision tree

### Case A: route log has valid target, adapter log has missing target

Focus on:
- command object construction at the `sendSms(...)` call site
- adapter function signature / field naming mismatch
- possible destructuring error or omitted property

### Case B: route log already has missing target

Focus on:
- any reassignment after `outboundMessageTargetPhone = smsTargetResolution.targetPhone`
- multiple code paths in the same request
- mismatch between tested resolver input and real runtime thread/context

### Case C: adapter input has correct target, request payload has missing target

Focus on:
- Telnyx adapter payload mapping
- wrong field names in request body
- local payload object mutation

### Case D: adapter request payload is correct, Telnyx still rejects

Focus on:
- full adapter error body
- request headers/auth built by adapter
- unexpected extra payload fields

## Expected fastest likely resolution

The most likely fix is one of these:

1. preserve `targetPhone` correctly in the route-to-adapter handoff
2. fix Telnyx adapter command-to-payload mapping
3. add final route guard to prevent provider-misleading failures

