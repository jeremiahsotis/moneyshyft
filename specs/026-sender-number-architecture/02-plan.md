# PR 026 — Plan

## Files to Modify

- outbound SMS flow
- inbound SMS correlation
- voice flow (partial)

## Files to Create

- senderNumberResolver.ts

---

## Implementation Strategy

### Step 1 — Resolver Module

Create:

resolveSenderNumber(...)

---

### Step 2 — Replace Synthetic IDs

Remove:

sms-inbound:${...}
sms-outbound:${...}

---

### Step 3 — Integrate with Mapping Service

Use:

resolveRoutingMappingByNumber

---

### Step 4 — Enforce Consistency

- store resolved number per thread if needed

---

## Risks

- missing mappings
- breaking outbound SMS

---

## Rollback Strategy

- re-enable synthetic fallback temporarily
