# Reconciliation Locks Summary (v5)

## Newly locked gap
### Deterministic candidate generation
Recommendation adopted:
- PeopleCore owns candidate generation
- candidate generation happens before scoring
- generation is deterministic, explainable, and bounded
- generation uses ordered evidence, not global fuzzy search
- maximum candidate set is 10

## Previously locked gaps retained
- ContactPoint.status is lifecycle truth
- all cross-boundary domain events use EventEnvelope
- SubjectContext may not carry both personId and provisionalPersonId
- confidence scoring uses a locked deterministic composition formula

## Documents updated
- Shyft Platform Architecture.md
- connectshyft_roadmap_slices_21_27.md
- ShyftUnity Decision Contract.yml
- identity-scoring.md
- identity-candidate-generation.md
- reconciliation-locks-summary.md
