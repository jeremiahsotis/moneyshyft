# PR 022 — Inbound SMS Identity Resolution + Raw Body Capture

## Summary

Adds deterministic inbound SMS identity resolution and required rawBody capture for webhook validation.

---

## Changes

- Introduced identity resolver boundary
- Implemented phone-based fallback
- Added neighbor auto-creation
- Enforced ambiguity failure
- Added prefers_texting auto-update logic
- Replaced express.json middleware with rawBody capture

---

## Why

Inbound SMS could not resolve neighbors without metadata or existing threads.

---

## Testing

- Verified webhook signature handling
- Verified all identity resolution paths
- Verified neighbor creation behavior
- Verified ambiguity failure

---

## Risks

- webhook validation regression
- incorrect phone normalization

---

## Rollback

- revert middleware
- disable resolver fallback

---

## Checklist

- [ ] Tests passing
- [ ] No direct DB access in route
- [ ] Resolver boundary used
- [ ] Middleware verified in app bootstrap
