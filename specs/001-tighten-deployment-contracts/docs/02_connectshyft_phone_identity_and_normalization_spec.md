# ConnectShyft Phone Identity and Number Normalization Spec

## Best-practice recommendation

Create a dedicated operator phone identity model now, using a shared normalization service that accepts friendly input and stores canonical E.164 internally.

This is the safest path because it solves the immediate ConnectShyft need without poisoning future People Core extraction.

## Why this is needed

Neighbor phones already have dedicated persistence. Operator phones do not.

That makes outbound calling structurally incomplete because ConnectShyft cannot reliably answer:

- which operator callback number should ring
- whether that number is verified and active
- whether that number can be used for voice callbacks
- how to normalize friendly user input consistently

## Recommended model

## Table: `people.user_phone_identities`

Use a People-ready schema namespace if available. If not, use `connectshyft.user_phone_identities` with a clear migration note that it is People-bound.

Recommended columns:

- `id UUID PRIMARY KEY`
- `tenant_id TEXT NOT NULL`
- `user_id UUID NOT NULL`
- `label TEXT NOT NULL` 
- `phone_e164 TEXT NOT NULL`
- `phone_country_code TEXT NOT NULL`
- `phone_national_number TEXT NOT NULL`
- `phone_area_code TEXT NULL`
- `display_national TEXT NOT NULL`
- `display_international TEXT NOT NULL`
- `capability_voice BOOLEAN NOT NULL DEFAULT TRUE`
- `capability_sms BOOLEAN NOT NULL DEFAULT FALSE`
- `verification_status TEXT NOT NULL`
- `is_primary_voice BOOLEAN NOT NULL DEFAULT FALSE`
- `is_primary_sms BOOLEAN NOT NULL DEFAULT FALSE`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `verified_at_utc TIMESTAMPTZ NULL`
- `created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Recommended indexes:

- `(tenant_id, user_id)`
- `(tenant_id, phone_e164)`
- partial unique index for one primary voice number per user where `is_primary_voice = true and is_active = true`
- partial unique index for one primary sms number per user where `is_primary_sms = true and is_active = true`

## Verification states

Recommended enum values:

- `unverified`
- `pending_verification`
- `verified`
- `verification_failed`
- `disabled`

For V1, a manual admin-verified path is acceptable if automated number ownership verification is not ready yet.

## Friendly input rules

Allowed user input examples:

- `2605551212`
- `(260) 555-1212`
- `260-555-1212`
- `260.555.1212`
- `+1 260 555 1212`

Optional only if orgUnit default area code is configured:

- `5551212`

If 7-digit local dialing is supported, the system must prepend the active orgUnit default area code before normalization.

If no default area code exists, refuse the input as ambiguous.

## Normalization service

### Recommendation

Use a single shared phone normalization service based on `libphonenumber-js`.

Inputs:

- raw user input string
- default country code
- optional default area code

Outputs:

- `phoneE164`
- `displayNational`
- `displayInternational`
- `countryCode`
- `nationalNumber`
- `areaCode`
- `last4`
- validation outcome and refusal reason if invalid

## Refusal rules

Refuse when:

- input is empty
- country cannot be resolved
- number is structurally invalid
- 7-digit input is used without default area code
- extension text is mixed into unsupported fields

Use plain operator copy, not telecom jargon.

Examples:

- `Enter a valid phone number.`
- `Enter a 10-digit phone number, or include the area code.`
- `This number is incomplete for your current calling region.`

## API contract

## Read operator phones

`GET /api/v1/connectshyft/user-phones`

Returns only friendly display fields for normal UI, plus verification and primary flags.

## Create operator phone

`POST /api/v1/connectshyft/user-phones`

Request:

```json
{
  "label": "mobile",
  "phone": "2605551212"
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "phoneId": "uuid",
    "label": "mobile",
    "phone": {
      "display": "(260) 555-1212"
    },
    "verificationStatus": "verified",
    "isPrimaryVoice": true,
    "isPrimarySms": false,
    "isActive": true
  }
}
```

Do not expose raw E.164 in normal operator responses unless this is an admin/debug path.

## Update operator phone

`PATCH /api/v1/connectshyft/user-phones/:phoneId`

Allowed updates:

- `label`
- `phone`
- `isActive`

Changing `phone` re-runs normalization and clears verification unless manual policy says otherwise.

## Set primary phone

`POST /api/v1/connectshyft/user-phones/:phoneId/set-primary`

Request:

```json
{
  "usage": "voice"
}
```

Supported `usage` values:

- `voice`
- `sms`

## Outbound resolution rules

## Voice

Resolution order:

1. explicitly selected verified voice-capable user phone
2. current user's primary verified voice phone
3. refuse if neither exists

## SMS

The neighbor should see the ConnectShyft outbound number, not the operator's personal phone number.

Operator phone identities still matter for eligibility, workflow rules, and possible future reply/callback logic, but the sender number for standard outbound SMS should remain the mapped ConnectShyft number.

## Integration with existing neighbor phone model

Do not merge neighbor phone rows and operator phone rows into one table right now.

Keep them separate because:

- they have different ownership semantics
- they have different verification semantics
- People Core is not finalized yet

Shared service, separate tables.

## Migration rules

### Immediate cleanup required

Neighbor and number-mapping code currently mixes provider-era naming like `twilioNumberE164` with provider-neutral direction.

During this remediation:

- add provider-neutral aliases in service and route layers
- migrate UI and new code to provider-neutral fields
- keep compatibility shims only where required for current tests or active clients

## Acceptance criteria

- operator can add a phone number using friendly input only
- operator sees formatted phone output, not E.164
- invalid/ambiguous numbers are refused clearly
- one verified primary voice phone can be resolved deterministically per user
- outbound voice refuses cleanly when no verified operator callback number exists
- design keeps future People Core extraction straightforward

## Counterpoint

A single `users.phone_e164` column would be faster.

That is a false savings.

It will break as soon as you need multiple phones, verification state, primary flags, capability flags, or migration into People Core.
