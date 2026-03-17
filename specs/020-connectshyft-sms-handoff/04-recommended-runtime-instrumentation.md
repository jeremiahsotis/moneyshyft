# Recommended Runtime Instrumentation

These logs are intentionally blunt. This is a debugging pass, not a permanent observability design.

## Route-level logs in `performOutboundAction(...)`

### 1. After target resolution

Add immediately after:

```ts
outboundMessageTargetPhone = smsTargetResolution.targetPhone;
```

Recommended log:

```ts
console.log('SMS_TARGET_AFTER_RESOLUTION', {
  threadId,
  resolvedThreadNeighborId,
  threadNeighborId: thread.neighborId,
  smsTargetResolution,
  outboundMessageTargetPhone,
  body: outboundMessagePolicy?.body || '',
});
```

### 2. Before `sendSms(...)`

Add immediately before the adapter call.

Recommended log:

```ts
console.log('SMS_DISPATCH_COMMAND', {
  tenantId: context.tenantId,
  orgUnitId: context.orgUnitId,
  threadId,
  providerKey: providerSelection.providerResolution.resolvedProvider,
  idempotencyKey: outboundDispatchIdempotencyKey || undefined,
  body: outboundMessagePolicy?.body || '',
  targetPhone: outboundMessageTargetPhone || undefined,
});
```

## Telnyx adapter logs in `infrastructure/communications/telnyx/index.ts`

### 3. At top of `sendSms(command)`

Recommended log:

```ts
console.log('TELNYX_SENDSMS_COMMAND', command);
```

### 4. Before Telnyx request dispatch

Recommended log:

```ts
console.log('TELNYX_SENDSMS_REQUEST_PAYLOAD', payload);
```

### 5. In Telnyx failure path

Recommended log:

```ts
console.error('TELNYX_SENDSMS_ERROR', {
  message: error instanceof Error ? error.message : error,
  responseStatus: (error as any)?.response?.status,
  responseData: (error as any)?.response?.data,
  error,
});
```

## What to compare

Across all logs, compare:
- `threadId`
- `targetPhone`
- `body`
- `providerKey`

## Expected interpretation

### If route logs show correct target but adapter input does not
Bug is in the route-to-adapter handoff.

### If adapter input shows correct target but request payload does not
Bug is in adapter payload mapping.

### If request payload is correct and Telnyx still rejects
Bug is in adapter HTTP layer or response handling.
