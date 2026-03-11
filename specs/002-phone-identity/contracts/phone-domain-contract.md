# Contract: Shared Phone Domain API

## Location

`/domains/communication/phone/`

## Purpose

Provide the canonical, reusable phone identity API for ConnectShyft and later communication-domain consumers.

## Public Types

### `PhoneNormalizationContext`

- `defaultCountry: string`
- `defaultAreaCode?: string`
- `source?: 'user_entered' | 'imported' | 'system_generated'`

### `CanonicalPhoneIdentity`

- `rawInput: string`
- `normalizedE164: string`
- `displayNational: string`
- `countryCode: string`
- `nationalNumber: string`
- `extension?: string`
- `validationStatus: 'valid' | 'invalid' | 'needs_review'`
- `source: 'user_entered' | 'imported' | 'system_generated'`
- `usageType: 'mobile' | 'landline' | 'unknown'`
- `sharedPhoneFlag: boolean`
- `smsCapable: boolean | null`
- `voiceCapable: boolean | null`

### `PhoneNormalizationError`

- `code`
  - expected values:
    - `PHONE_EMPTY`
    - `PHONE_INVALID_FORMAT`
    - `PHONE_DEFAULT_AREA_CODE_REQUIRED`
    - `PHONE_DEFAULT_AREA_CODE_INVALID`
- `message`

## Public Functions

### `parsePhone(input, context)`

Input:

- raw user-entered phone string
- `PhoneNormalizationContext`

Output:

- success: parsed canonical identity with derived fields
- failure: structured normalization error
- runtime shape: `{ ok: true, phone } | { ok: false, error }`

Rules:

- accepts natural ten-digit domestic input
- accepts explicit E.164 input
- accepts seven-digit local input only when `defaultAreaCode` is supplied
- rejects alpha characters and malformed numeric input

### `normalizePhone(input, context)`

Input:

- raw user-entered phone string
- `PhoneNormalizationContext`

Output:

- success: canonical phone identity
- failure: structured normalization error
- runtime shape: `{ ok: true, phone } | { ok: false, error }`

Rules:

- `normalizedE164` is always present on success
- no caller may infer canonical storage from UI formatting alone

### `formatDisplayPhone(phone, locale)`

Input:

- canonical phone identity or canonical E.164 value
- locale token

Output:

- human-friendly display string

Rules:

- returns national-style formatting for supported domestic numbers
- must never be used as the canonical lookup value

### `validatePhoneForChannel(phone, channel)`

Input:

- canonical phone identity
- channel token
  - initial channels: `sms`, `voice`

Output:

- pass/fail decision with reason
- runtime shape: `{ ok: true } | { ok: false, reason }`

Rules:

- channel validation is based on canonical phone identity data
- telephony/provider lookups are out of scope for CS-002

### `comparePhoneIdentity(a, b)`

Input:

- two canonical phone identities or canonical E.164 values

Output:

- boolean equality decision or deterministic comparison result

Rules:

- comparison is based on canonical identity, not raw display formatting

## Example Conversions

- `2605551212` + `{ defaultCountry: 'US' }` -> `+12605551212`
- `5551212` + `{ defaultCountry: 'US', defaultAreaCode: '260' }` -> `+12605551212`
- `260-ABC-1212` -> `PHONE_INVALID_FORMAT`
- `5551212` + `{ defaultCountry: 'US' }` -> `PHONE_DEFAULT_AREA_CODE_REQUIRED`
- `formatDisplayPhone('+12605551212', 'en-US')` -> `(260) 555-1212`
- `comparePhoneIdentity('+12605551212', '+12605551212')` -> `true`
