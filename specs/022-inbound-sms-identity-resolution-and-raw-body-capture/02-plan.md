# PR 022 — Plan

## Files to Modify

- apps/connectshyft-api/src/app.ts
- apps/connectshyft-api/src/routes/api/v1/connectshyft.ts
- apps/connectshyft-api/src/modules/connectshyft/neighbors.ts

## Files to Create

- src/modules/connectshyft/identityResolver.ts

---

## Implementation Strategy

### Step 1 — Raw Body Middleware

Modify app.ts:

- replace express.json()
- ensure rawBody is attached

---

### Step 2 — Identity Resolver Boundary

Create resolver interface:

resolveSubjectByContactPoint({
tenantId,
orgUnitId,
contactPoint
})

Adapter implementation:

- uses identityBoundary
- filters by normalized phone

---

### Step 3 — Route Integration

In inbound SMS handler:

Insert resolution after:

- metadata extraction
- thread correlation

---

### Step 4 — Neighbor Creation

Add service call:

- createNeighborFromInbound()

---

### Step 5 — Prefers Texting Update

After neighbor resolution:

- apply conditional update logic

---

## Risks

- breaking webhook validation if rawBody not correct
- incorrect normalization of phone numbers
- accidental override of explicit preferences

---

## Rollback Strategy

- revert middleware change
- disable resolver fallback
- restore prior correlation-only behavior
