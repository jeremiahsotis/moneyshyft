# PR 022 — Tasks

## Infrastructure

- [ ] Replace express.json() with rawBody-enabled version
- [ ] Add type for req.rawBody

---

## Identity Resolver

- [ ] Create resolver interface
- [ ] Implement phone-based adapter
- [ ] Normalize E.164 input
- [ ] Return structured result (single / none / multiple)

---

## Route Logic

- [ ] Insert resolver after thread correlation
- [ ] Handle all three match outcomes
- [ ] Wire refusal for ambiguity

---

## Neighbor Creation

- [ ] Implement createNeighborFromInbound()
- [ ] Ensure phone is primary + active
- [ ] Default prefers_texting = UNKNOWN

---

## Prefers Texting Logic

- [ ] If UNKNOWN → set YES
- [ ] Else → no change

---

## Soft Delete Handling

- [ ] Ensure deleted neighbors excluded from resolver
- [ ] Ensure inbound creates new neighbor

---

## Testing

- [ ] rawBody presence test
- [ ] metadata resolution test
- [ ] thread correlation test
- [ ] phone match (single)
- [ ] phone match (none)
- [ ] phone match (multiple)
- [ ] prefers_texting behavior
