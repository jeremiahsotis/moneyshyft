# Recommended Fixes

## Fix 1: Add a defensive route guard before `sendSms(...)`

### Why

Right now, a missing target can bubble into the Telnyx adapter and get wrapped as a provider failure. That is misleading.

### Goal

Fail closed with a domain refusal before provider dispatch if `outboundMessageTargetPhone` is missing.

### Patch

See:
- `patch-01-defensive-route-guard.diff`

## Fix 2: Add temporary route and adapter instrumentation

### Why

This will isolate the exact broken handoff without more guesswork.

### Goal

Prove the exact point at which `targetPhone` disappears.

### Patch

See:
- `patch-02-runtime-instrumentation.diff`

## Fix 3: Keep the final code fix narrow

After logs identify the exact break point, fix only that point.

Examples of narrow valid fixes:
- preserve `targetPhone` when building the `sendSms(...)` command
- correct the adapter field mapping from command to payload
- stop a duplicate/secondary code path from issuing a second bad send

## Fix 4: Treat duplicate yellow refusal rendering as secondary

The UI rendering duplication is real, but it is not the first debugging target.

Only address it once the real missing-target failure is corrected.
