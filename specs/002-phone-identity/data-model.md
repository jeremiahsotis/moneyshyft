# Data Model: CS-002 Phone Identity

## 1. Domain Value: `PhoneNormalizationContext`

Purpose: provide caller-supplied configuration needed to normalize natural input without hardcoding deployment assumptions into the shared domain.

### Fields

- `defaultCountry`
  - string
  - initial expected value: `US`
- `defaultAreaCode`
  - optional string
  - used only for seven-digit local input
- `source`
  - optional conceptual value
  - expected values: `user_entered`, `imported`, `system_generated`

### Validation rules

- `defaultAreaCode` must be exactly three digits when supplied.
- Seven-digit inputs are invalid when `defaultAreaCode` is missing.
- The shared domain must not read UI or provider state directly; all normalization context must be injected.

## 2. Domain Value: `CanonicalPhoneIdentity`

Purpose: represent the reusable, canonical phone identity returned by the shared communication domain.

### Fields

- `rawInput`
- `normalizedE164`
- `displayNational`
- `countryCode`
- `nationalNumber`
- `extension`
  - optional
- `validationStatus`
  - `valid`, `invalid`, `needs_review`
- `source`
  - `user_entered`, `imported`, `system_generated`
- `usageType`
  - `mobile`, `landline`, `unknown`
- `sharedPhoneFlag`
- `smsCapable`
  - nullable boolean
- `voiceCapable`
  - nullable boolean

### Validation rules

- `normalizedE164` is required for any successful parse/normalize result.
- `displayNational` is derived display data and must never be used as the canonical lookup value.
- `rawInput` is optional and cannot be required for business logic.
- `validationStatus` must be deterministic from input plus context.

## 3. Canonical Persistence Entity: `communication_contact_point`

Purpose: store reusable phone contact endpoints in canonical shared-domain form.

### Canonical fields

- `id`
- `tenant_id`
- `owner_type`
- `owner_id`
- `channel`
  - initial value: `phone`
- `label`
- `raw_input`
  - optional
- `normalized_e164`
- `display_national`
- `country_code`
- `national_number`
- `extension`
  - optional
- `validation_status`
- `usage_type`
- `is_primary`
- `is_active`
- `source`
- `created_at`
- `updated_at`

### Relationships

- one owner can have many `communication_contact_point`
- only one primary contact point per owner/channel should be active at a time

### Validation rules

- `normalized_e164` is the canonical dedupe and lookup value.
- multiple phone numbers per owner are supported from the start
- end-user forms must never require E.164 even though persistence uses it canonically

## 4. Current Repo Adapter Entity: `connectshyft.cs_neighbor_phones`

Purpose: serve as the current implementation-time persistence adapter for ConnectShyft while CS-002 moves the repo toward the canonical contact-point shape.

### Current fields already present

- `id`
- `neighbor_id`
- `tenant_id`
- `label`
- `value_e164`
- `sort_order`
- `is_primary`
- `is_shared`
- `verification_status`
- `created_at_utc`
- `updated_at_utc`

### Required CS-002 shaping

- map `value_e164` to canonical `normalized_e164`
- add or derive canonical display/parsed fields needed for the shared phone contract
- keep owner scoping explicit through the current neighbor relationship without inventing a second local phone store
- keep the table compatible with future migration toward a general `communication_contact_point`

### Relationships

- one ConnectShyft neighbor can have many phone rows
- a phone row belongs to exactly one tenant-scoped neighbor in the current implementation

## 5. Adjacent Durable Trait Data

Purpose: preserve communication-specific flags that already exist in the current product and must not remain ad hoc UI state.

### Relevant traits

- `shared_phone`
- `prefers_texting`

### Current repo mapping

- `is_shared` currently lives on `connectshyft.cs_neighbor_phones`
- `prefers_texting` currently lives on ConnectShyft neighbor records

### CS-002 expectation

- CS-002 must not regress these into local UI-only labels
- full canonical trait-table migration may be incremental, but the design must remain compatible with `communication_contact_trait`

## 6. Functional State Flow

### Successful normalization

`raw input` -> `trim / sanitize` -> `apply context-driven country/area-code rules` -> `canonical E.164` -> `derived display + parsed fields` -> `persist through contact-point equivalent model`

### Refusal flow

`raw input` -> `trim / sanitize` -> `invalid characters / unsupported shape / seven-digit-without-context` -> `validation refusal`

## 7. Required Invariants for CS-002

- users never need to understand E.164
- canonical internal storage uses `normalized_e164` or an equivalent field mapped directly to it
- multiple phone numbers per owner are supported
- seven-digit input is allowed only with configured context
- ConnectShyft consumes the shared phone domain instead of redefining normalization locally
