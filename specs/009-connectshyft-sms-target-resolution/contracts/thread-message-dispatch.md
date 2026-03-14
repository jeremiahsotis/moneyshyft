# ConnectShyft Thread Message Dispatch Contract

## Scope

Current ConnectShyft runtime host only:
- `apps/moneyshyft-api/src/routes/api/v1/connectshyft.ts`
- `apps/moneyshyft-api/src/modules/connectshyft/readContracts.ts`
- `apps/moneyshyft-api/src/modules/connectshyft/neighbors.ts`
- `apps/moneyshyft-api/src/modules/connectshyft/providerRegistry.ts`

No lane-convergence refactor, no move into `apps/connectshyft-api`, and no provider-adapter redesign are in scope.

## Route

`POST /api/v1/connectshyft/threads/:threadId/messages`

## Accepted Request Body

```json
{
  "orgUnitId": "org-connectshyft-f1-east",
  "providerKey": "telnyx",
  "channel": "sms",
  "body": "Checking in on your request.",
  "targetPhone": "+12605550199"
}
```

Compatibility target aliases already accepted by the current route:
- `targetPhone`
- `targetPhoneE164`
- `recipientPhone`
- `target.phone`

## Resolution Rules

For `channel = sms`, resolve the target phone in this order:

1. Explicit outbound SMS target supplied by the current runtime host request surface, if present
2. Linked neighbor primary phone, if exactly one primary candidate exists
3. Linked neighbor only phone, if exactly one candidate exists
4. Otherwise refuse

Automatic resolution is allowed only when exactly one deterministic target can be selected.

Current-host phone candidate definition:

- `active` means a persisted in-scope `connectshyft.cs_neighbor_phones` row for the linked neighbor
- `valid` means a non-empty canonical E.164 value stored in `value_e164`
- `is_primary = true` affects selection priority only
- `verification_status` is not required for dispatch in this feature

## Texting Permission Gate

Outbound SMS is allowed only when the linked neighbor preference resolves to:

`prefers_texting = YES`

If the preference is `NO` or `UNKNOWN`, the route must refuse before provider dispatch.

## Success Contract

```json
{
  "ok": true,
  "code": "CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED",
  "data": {
    "threadId": "thread-f1-unclaimed-1001",
    "thread": {
      "threadId": "thread-f1-unclaimed-1001",
      "source": "SMS"
    },
    "dispatch": {
      "providerKey": "telnyx",
      "channel": "message",
      "dispatchContext": {
        "targetPhone": "+12605550199",
        "messageBodyProvided": true
      }
    },
    "smsTargetResolution": {
      "resolutionSource": "explicit-request",
      "deterministic": true,
      "targetPhone": "+12605550199"
    },
    "preferencePolicy": {
      "prefersTexting": "YES"
    }
  }
}
```

### Success Rules

- `dispatch.dispatchContext.targetPhone` must contain the resolved deterministic phone
- `thread.source` must reflect the outbound communication method and must not be hard-coded to `VOICE`
- Provider adapters remain downstream of this decision and receive the resolved target

## Refusal Contracts

### No deterministic target available

```json
{
  "ok": false,
  "code": "CONNECTSHYFT_SMS_TARGET_PHONE_NOT_AVAILABLE",
  "refusalType": "business",
  "data": {
    "threadId": "thread-f1-unclaimed-1001",
    "dispatchAttempted": false
  }
}
```

**Message**
- `Outbound SMS cannot be sent because no deterministic target phone is available for this thread.`

### Multiple deterministic candidates

```json
{
  "ok": false,
  "code": "CONNECTSHYFT_SMS_MULTIPLE_TARGET_PHONES",
  "refusalType": "business",
  "data": {
    "threadId": "thread-f1-unclaimed-1001",
    "candidatePhones": [
      "+12605550199",
      "+12605550200"
    ],
    "dispatchAttempted": false
  }
}
```

**Message**
- `Outbound SMS cannot be sent because multiple valid neighbor phones are available and no explicit SMS target is set.`

### Texting not permitted

```json
{
  "ok": false,
  "code": "CONNECTSHYFT_SMS_TEXTING_NOT_PERMITTED",
  "refusalType": "business",
  "data": {
    "threadId": "thread-f1-unclaimed-1001",
    "prefersTexting": "NO",
    "dispatchAttempted": false
  }
}
```

**Message**
- `Outbound SMS requires prefers_texting=YES for the linked neighbor.`

## Non-Goals

- No new provider adapter interface
- No current-lane move into `apps/connectshyft-api`
- No fallback to generic `CONNECTSHYFT_PROVIDER_DISPATCH_FAILED` for the three refusal cases above
