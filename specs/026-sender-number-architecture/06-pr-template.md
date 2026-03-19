# PR 026 — Sender Number Architecture

## Summary

Introduces a centralized sender number resolution model and removes synthetic routing identifiers.

---

## Changes

- Added sender number resolver
- Removed synthetic ID usage
- Integrated number mapping service

---

## Why

Needed consistent and deterministic routing for SMS and voice.

---

## Testing

- verified correct number usage
- verified failure behavior

---

## Risks

- missing mappings
- routing failures

---

## Rollback

- temporarily restore fallback logic
