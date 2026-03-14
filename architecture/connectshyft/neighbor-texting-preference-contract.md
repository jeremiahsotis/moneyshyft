# Neighbor Texting Preference Contract

Status: Governing contract

## Canonical values

`prefers_texting` must be one of:

- `YES`
- `NO`
- `UNKNOWN`

## Rules

1. New neighbors default to `YES` unless explicit policy changes later.
2. Persistence must never silently coerce `YES` to `UNKNOWN`.
3. API responses must always return a canonical enum, never a null-like shape.
4. UI must map only from canonical enum values.
5. Any fallback to `UNKNOWN` must happen only when the stored value is truly absent/invalid.
6. SMS dispatch gating must read the same canonical value used by persistence and display.

## UI labels

- `YES` -> `Prefers Texting`
- `NO` -> `Prefers Calls Only`
- `UNKNOWN` -> `Texting Preference Unknown`
