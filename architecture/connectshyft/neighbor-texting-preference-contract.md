# Neighbor Texting Preference Contract

Status: Governing contract

`prefers_texting` must be one of:

- `YES`
- `NO`
- `UNKNOWN`

Rules:
1. New neighbors default to `YES`.
2. Persistence must never silently coerce `YES` to `UNKNOWN`.
3. API responses must always return a canonical enum.
4. UI must map only from canonical enum values.
5. SMS dispatch gating must read the same canonical value used by persistence and display.
