# PR 023 — Tasks

## Database

- [ ] Identify existing duplicates
- [ ] Create partial unique index
- [ ] Validate migration safety

---

## Validation Layer

- [ ] Add duplicate check in createNeighbor
- [ ] Add duplicate check in updateNeighbor
- [ ] Add duplicate check in phone assignment

---

## Identity Resolution

- [ ] Ensure multiple matches → ambiguity result
- [ ] Confirm no fallback logic exists

---

## Error Handling

- [ ] Define refusal code
- [ ] Ensure consistent error response

---

## Testing

- [ ] duplicate create fails
- [ ] duplicate update fails
- [ ] soft-deleted phone reuse works
- [ ] ambiguity still triggers correctly
